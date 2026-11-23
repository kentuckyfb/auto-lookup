const { json } = require('./_lib/data');

const clean = (value, max = 500) => String(value || '').trim().slice(0, max);
const PRIMARY_MODEL = process.env.GEMINI_MODEL || 'gemini-3.5-flash-lite';
const MODELS = [...new Set([PRIMARY_MODEL, 'gemini-3.5-flash-lite', 'gemini-3.8-flash'])];

const emptyDiagnosis = {
  title: '', explanation: '', likelyProblems: [], affectedParts: [], checks: [],
  repairRecommendation: '', replacementAdvice: '', timeframe: '', urgency: 'low',
  safeToDrive: '', stopDrivingIf: [], garageQuestion: '', limitations: ''
};

const responseSchema = {
  type: 'object',
  properties: {
    stage: { type: 'string', enum: ['question', 'result'] },
    questionId: { type: 'string' },
    question: { type: 'string' },
    choices: {
      type: 'array',
      items: {
        type: 'object',
        properties: { id: { type: 'string' }, label: { type: 'string' } },
        required: ['id', 'label']
      }
    },
    diagnosis: {
      type: 'object',
      properties: {
        title: { type: 'string' },
        explanation: { type: 'string' },
        likelyProblems: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              name: { type: 'string' },
              likelihood: { type: 'string', enum: ['most likely', 'possible', 'less likely'] },
              reason: { type: 'string' },
              affectedParts: { type: 'array', items: { type: 'string' } }
            },
            required: ['name', 'likelihood', 'reason', 'affectedParts']
          }
        },
        affectedParts: { type: 'array', items: { type: 'string' } },
        checks: { type: 'array', items: { type: 'string' } },
        repairRecommendation: { type: 'string' },
        replacementAdvice: { type: 'string' },
        timeframe: { type: 'string' },
        urgency: { type: 'string', enum: ['low', 'medium', 'high', 'stop driving'] },
        safeToDrive: { type: 'string' },
        stopDrivingIf: { type: 'array', items: { type: 'string' } },
        garageQuestion: { type: 'string' },
        limitations: { type: 'string' }
      },
      required: Object.keys(emptyDiagnosis)
    }
  },
  required: ['stage', 'questionId', 'question', 'choices', 'diagnosis']
};

class GeminiError extends Error {
  constructor(response, body) {
    super(body?.error?.message || `Gemini request failed (${response.status})`);
    this.httpStatus = response.status;
    this.apiStatus = body?.error?.status || body?.error?.code || 'UNKNOWN';
  }
}

function outputText(body) {
  for (const step of body?.steps || []) {
    if (step.type !== 'model_output') continue;
    for (const block of step.content || []) {
      if (block.type === 'text' && block.text) return block.text;
    }
  }
  throw new Error(body?.error?.message || 'Gemini returned no text output.');
}

function promptFor(vehicle, problem, history) {
  return `You are Auto Lookup's cautious vehicle triage assistant. Help a driver prepare for a qualified mechanic's inspection. Never claim certainty, invent recalls, or say a part was tested.

Vehicle and symptom:
${JSON.stringify({ vehicle, originalSymptom: problem, previousAnswers: history }, null, 2)}

Return exactly one of these:

1. A useful follow-up question when one observable answer would materially narrow the affected system. Ask only about location, timing, operating condition, warning lights, smell, temperature, vibration, fluid, or a safety change. Provide 2-5 plain choices. Use a stable descriptive questionId. Never repeat or rephrase any previous question. For this stage, set diagnosis to ${JSON.stringify(emptyDiagnosis)}.

2. A result when the information is sufficient or four questions have already been answered. Set questionId and question to empty strings and choices to an empty array. Give 1-3 likely problems ordered by fit, specific affected parts, 2-5 checks a garage should perform before replacement, the typical first repair action, when replacement is justified, a plain timeframe, urgency, direct driving-safety guidance, danger signs, and one precise question for the garage.

Use stage "result" immediately for urgent safety symptoms. Keep every field concise and readable. This is guidance, not a confirmed diagnosis.`;
}

async function askGemini(key, context, model) {
  const response = await fetch('https://generativelanguage.googleapis.com/v1beta/interactions', {
    method: 'POST',
    headers: { 'x-goog-api-key': key, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      model,
      input: promptFor(context.vehicle, context.problem, context.history),
      store: false,
      response_format: { type: 'text', mime_type: 'application/json', schema: responseSchema }
    }),
    signal: AbortSignal.timeout(45000)
  });
  const body = await response.json().catch(() => ({}));
  if (!response.ok) throw new GeminiError(response, body);
  return JSON.parse(outputText(body));
}

function validQuestion(result, history) {
  if (result?.stage !== 'question' || !result.questionId || !result.question) return false;
  if (!Array.isArray(result.choices) || result.choices.length < 2 || result.choices.length > 5) return false;
  const normalized = value => clean(value).toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();
  return !history.some(turn => turn.questionId === result.questionId || normalized(turn.question) === normalized(result.question));
}

function validDiagnosis(result) {
  const diagnosis = result?.diagnosis;
  return result?.stage === 'result'
    && diagnosis?.title && diagnosis?.explanation && diagnosis?.likelyProblems?.length
    && diagnosis?.affectedParts?.length && diagnosis?.checks?.length
    && diagnosis?.repairRecommendation && diagnosis?.replacementAdvice
    && diagnosis?.timeframe && diagnosis?.safeToDrive && diagnosis?.garageQuestion;
}

function safeError(error) {
  if (error.httpStatus === 401) return 'The Gemini key was rejected. Re-copy it from Google AI Studio without quotes or spaces.';
  if (error.httpStatus === 403) return 'The Gemini key does not have permission to generate responses.';
  if (error.httpStatus === 404) return `The configured Gemini models are unavailable for this project.`;
  if (error.httpStatus === 429) return 'The free Gemini request limit has been reached. Please try again later.';
  if (error.httpStatus === 400) return `Gemini rejected the request: ${clean(error.message, 180)}`;
  if (error instanceof SyntaxError) return 'Gemini returned an invalid response. Please try once more.';
  return `Gemini request failed: ${clean(error.message, 180) || 'Unknown error'}`;
}

module.exports = async function handler(req, res) {
  if (req.method !== 'POST') return json(res, 405, { error: 'Method not allowed' });

  const vehicle = {
    year: clean(req.body?.year, 4), make: clean(req.body?.make, 80), model: clean(req.body?.model, 100),
    trim: clean(req.body?.trim, 100), mileage: clean(req.body?.mileage, 40), country: clean(req.body?.country || 'Sri Lanka', 80)
  };
  const problem = clean(req.body?.problem, 800);
  const history = Array.isArray(req.body?.history) ? req.body.history.slice(0, 4).map(turn => ({
    questionId: clean(turn?.questionId, 80), question: clean(turn?.question, 300), answer: clean(turn?.answer, 300)
  })).filter(turn => turn.question && turn.answer) : [];

  if (!vehicle.year || !vehicle.make || !vehicle.model || !problem) return json(res, 400, { error: 'Vehicle and symptom details are required.' });
  if (!process.env.GEMINI_API_KEY) return json(res, 503, { error: 'Gemini is not configured on this deployment.' });

  try {
    let result;
    let lastError;
    for (const model of MODELS) {
      try {
        result = await askGemini(process.env.GEMINI_API_KEY.trim(), { vehicle, problem, history }, model);
        break;
      } catch (error) {
        lastError = error;
        const retryable = error.httpStatus === 503 || error.httpStatus === 404 || String(error.apiStatus).toLowerCase() === 'service_unavailable';
        if (!retryable) throw error;
        console.warn(`Gemini model ${model} unavailable; trying fallback.`);
      }
    }
    if (!result) throw lastError || new Error('No Gemini model was available.');
    if (result.stage === 'question' && validQuestion(result, history) && history.length < 4) {
      return json(res, 200, {
        stage: 'question', questionId: clean(result.questionId, 80), question: clean(result.question, 300),
        choices: result.choices.map(choice => ({ id: clean(choice.id, 80), label: clean(choice.label, 160) }))
      });
    }
    if (!validDiagnosis(result)) throw new Error('The structured diagnosis was incomplete.');
    const diagnosis = result.diagnosis;
    const safety = `${diagnosis.safeToDrive}${diagnosis.stopDrivingIf?.length ? ` Stop driving if: ${diagnosis.stopDrivingIf.join('; ')}.` : ''}`;
    return json(res, 200, { stage: 'result', diagnosis: {
      title: diagnosis.title, explanation: diagnosis.explanation, likelyProblems: diagnosis.likelyProblems,
      parts: diagnosis.affectedParts.slice(0, 8), checks: diagnosis.checks.slice(0, 8),
      action: diagnosis.repairRecommendation, replacementAdvice: diagnosis.replacementAdvice,
      timeframe: diagnosis.timeframe, urgency: diagnosis.urgency, garageQuestion: diagnosis.garageQuestion,
      safety, limitations: diagnosis.limitations, sources: []
    } });
  } catch (error) {
    console.error(`Gemini diagnosis failed [${error.apiStatus || 'LOCAL'}]:`, error.message);
    return json(res, 502, { error: safeError(error), code: `GEMINI_${error.apiStatus || 'ERROR'}` });
  }
};
