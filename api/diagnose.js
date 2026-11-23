const { json, currentUser, getProviderKey } = require('./_lib/data');

const clean = (value, max = 500) => String(value || '').trim().slice(0, max);

const diagnosisSchema = {
  type: 'object',
  additionalProperties: false,
  required: ['stage', 'question', 'choices', 'diagnosis'],
  properties: {
    stage: { type: 'string', enum: ['question', 'result'] },
    question: { type: 'string' },
    choices: {
      type: 'array',
      items: {
        type: 'object', additionalProperties: false, required: ['id', 'label'],
        properties: { id: { type: 'string' }, label: { type: 'string' } }
      }
    },
    diagnosis: {
      type: 'object', additionalProperties: false,
      required: ['title', 'explanation', 'parts', 'checks', 'action', 'urgency', 'garageQuestion', 'safety'],
      properties: {
        title: { type: 'string' }, explanation: { type: 'string' },
        parts: { type: 'array', items: { type: 'string' } },
        checks: { type: 'array', items: { type: 'string' } },
        action: { type: 'string' }, urgency: { type: 'string' },
        garageQuestion: { type: 'string' }, safety: { type: 'string' }
      }
    }
  }
};

function extractText(response) {
  if (response.output_text) return response.output_text;
  for (const item of response.output || []) {
    for (const content of item.content || []) {
      if (content.type === 'output_text' && content.text) return content.text;
      if (content.type === 'refusal' && content.refusal) throw new Error(content.refusal);
    }
  }
  throw new Error(response.error?.message || 'The AI returned no usable response.');
}

function validResult(data) {
  if (!data || !['question', 'result'].includes(data.stage)) return false;
  if (data.stage === 'question') return Boolean(data.question) && Array.isArray(data.choices) && data.choices.length >= 2 && data.choices.length <= 5 && data.choices.every(choice => choice.id && choice.label);
  const result = data.diagnosis;
  return Boolean(result?.title && result.explanation && result.action && result.urgency && result.garageQuestion && result.safety && Array.isArray(result.parts) && result.parts.length && Array.isArray(result.checks) && result.checks.length);
}

const instructions = `You are Auto Lookup's cautious vehicle diagnostic assistant. Help a vehicle owner prepare for a professional inspection; never claim certainty and never invent a recall.

Use the supplied vehicle year, make, model, original symptom, and all previous question/answer turns. Ask exactly one short, high-information follow-up question at a time when it would materially narrow the likely system or failed part. Offer 2-5 clear choices that an ordinary driver can observe. Do not repeat a question already answered. After enough information (normally 1-3 questions, maximum 4), return a result.

For a result: name the most likely fault area, briefly explain why it fits and mention important alternatives. List 2-5 plausibly affected parts and 2-5 concrete checks a garage should perform before replacement. Give the typical action, plain-language urgency, one precise question to ask the garage, and safety guidance. If there is danger such as reduced braking, steering loss, overheating, fuel smell, smoke, or severe warning lights, clearly say to stop driving. Keep every field concise and understandable. Do not provide repair instructions that encourage an untrained person to work on safety-critical systems.

For stage "question", fill diagnosis with empty strings and empty arrays. For stage "result", set question to an empty string and choices to an empty array.`;

async function askOpenAI(key, context) {
  const response = await fetch('https://api.openai.com/v1/responses', {
    method: 'POST',
    headers: { Authorization: `Bearer ${key}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      model: process.env.OPENAI_MODEL || 'gpt-4o-mini',
      store: false,
      instructions,
      input: JSON.stringify(context),
      max_output_tokens: 1200,
      text: { format: { type: 'json_schema', name: 'vehicle_diagnosis', strict: true, schema: diagnosisSchema } }
    }),
    signal: AbortSignal.timeout(30000)
  });
  const body = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(body.error?.message || `OpenAI request failed (${response.status})`);
  const parsed = JSON.parse(extractText(body));
  if (!validResult(parsed)) throw new Error('The AI response did not pass the diagnosis format check.');
  return parsed;
}

module.exports = async function handler(req, res) {
  if (req.method !== 'POST') return json(res, 405, { error: 'Method not allowed' });
  const vehicle = { year: clean(req.body?.year, 4), make: clean(req.body?.make, 80), model: clean(req.body?.model, 100) };
  const problem = clean(req.body?.problem, 800);
  const history = Array.isArray(req.body?.history) ? req.body.history.slice(0, 4).map(turn => ({
    question: clean(turn?.question, 300), answer: clean(turn?.answer, 300)
  })).filter(turn => turn.question && turn.answer) : [];
  if (!vehicle.year || !vehicle.make || !vehicle.model || !problem) return json(res, 400, { error: 'Vehicle and symptom details are required.' });

  const user = await currentUser(req);
  let key = null;
  try { key = await getProviderKey(user?.id, 'openai'); } catch (_) {}
  key ||= process.env.OPENAI_API_KEY;
  if (!key) return json(res, 402, {
    error: user ? 'Connect an OpenAI API key in your profile to use AI diagnosis.' : 'Sign in and connect an OpenAI API key in your profile to use AI diagnosis.',
    code: 'AI_PROVIDER_REQUIRED'
  });

  try {
    return json(res, 200, await askOpenAI(key, { vehicle, problem, previousAnswers: history, mustReturnResult: history.length >= 4 }));
  } catch (error) {
    return json(res, 502, { error: error.message || 'AI diagnosis is temporarily unavailable.' });
  }
};
