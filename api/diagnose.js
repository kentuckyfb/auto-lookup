const { json } = require('./_lib/data');

const clean = (value, max = 500) => String(value || '').trim().slice(0, max);
const model = () => process.env.GEMINI_MODEL || 'gemini-2.5-flash';

const plannerSchema = {
  type: 'OBJECT', required: ['stage', 'questionId', 'question', 'choices', 'searchQuery'],
  properties: {
    stage: { type: 'STRING', enum: ['question', 'ready'] }, questionId: { type: 'STRING' }, question: { type: 'STRING' },
    choices: { type: 'ARRAY', items: { type: 'OBJECT', required: ['id', 'label'], properties: { id: { type: 'STRING' }, label: { type: 'STRING' } } } },
    searchQuery: { type: 'STRING' }
  }
};

const resultSchema = {
  type: 'OBJECT',
  required: ['title', 'explanation', 'likelyProblems', 'affectedParts', 'checks', 'repairRecommendation', 'replacementAdvice', 'timeframe', 'urgency', 'safeToDrive', 'stopDrivingIf', 'garageQuestion', 'limitations'],
  properties: {
    title: { type: 'STRING' }, explanation: { type: 'STRING' },
    likelyProblems: { type: 'ARRAY', items: { type: 'OBJECT', required: ['name', 'likelihood', 'reason', 'affectedParts'], properties: {
      name: { type: 'STRING' }, likelihood: { type: 'STRING', enum: ['most likely', 'possible', 'less likely'] }, reason: { type: 'STRING' }, affectedParts: { type: 'ARRAY', items: { type: 'STRING' } }
    } } },
    affectedParts: { type: 'ARRAY', items: { type: 'STRING' } }, checks: { type: 'ARRAY', items: { type: 'STRING' } },
    repairRecommendation: { type: 'STRING' }, replacementAdvice: { type: 'STRING' }, timeframe: { type: 'STRING' },
    urgency: { type: 'STRING', enum: ['low', 'medium', 'high', 'stop driving'] }, safeToDrive: { type: 'STRING' },
    stopDrivingIf: { type: 'ARRAY', items: { type: 'STRING' } }, garageQuestion: { type: 'STRING' }, limitations: { type: 'STRING' }
  }
};

function textFromGemini(body) {
  const text = (body?.candidates?.[0]?.content?.parts || []).map(part => part.text || '').join('').trim();
  if (!text) throw new Error(body?.error?.message || 'The AI returned no usable response.');
  return text;
}

function sourcesFromGemini(body) {
  const seen = new Set();
  return (body?.candidates?.[0]?.groundingMetadata?.groundingChunks || []).flatMap(chunk => {
    const web = chunk.web;
    if (!web?.uri || seen.has(web.uri)) return [];
    seen.add(web.uri);
    return [{ title: clean(web.title || 'Reference', 120), url: web.uri }];
  }).slice(0, 6);
}

async function gemini(key, { prompt, schema, search = false, temperature = 0.2 }) {
  const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model())}:generateContent`, {
    method: 'POST', headers: { 'x-goog-api-key': key, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      contents: [{ role: 'user', parts: [{ text: prompt }] }],
      ...(search ? { tools: [{ google_search: {} }] } : {}),
      generationConfig: { temperature, maxOutputTokens: search ? 2200 : 1600, ...(schema ? { responseMimeType: 'application/json', responseSchema: schema } : {}) }
    }),
    signal: AbortSignal.timeout(30000)
  });
  const body = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(body?.error?.message || `Gemini request failed (${response.status})`);
  return { body, text: textFromGemini(body) };
}

const normalize = value => clean(value, 500).toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();

function validQuestion(plan, history) {
  if (plan?.stage !== 'question' || !plan.questionId || !plan.question || !Array.isArray(plan.choices) || plan.choices.length < 2 || plan.choices.length > 5) return false;
  if (!plan.choices.every(choice => choice?.id && choice?.label)) return false;
  return !new Set(history.map(turn => turn.questionId).filter(Boolean)).has(plan.questionId)
    && !new Set(history.map(turn => normalize(turn.question))).has(normalize(plan.question));
}

function vehicleContext(vehicle, problem, history) {
  return JSON.stringify({ vehicle, originalSymptom: problem, answers: history }, null, 2);
}

async function planNext(key, vehicle, problem, history) {
  const mustFinish = history.length >= 4;
  if (mustFinish) return { stage: 'ready', searchQuery: `${vehicle.year} ${vehicle.make} ${vehicle.model} ${problem} ${history.map(turn => turn.answer).join(' ')}` };
  const prompt = `You are planning a cautious vehicle symptom interview for Auto Lookup.

Context:
${vehicleContext(vehicle, problem, history)}

Rules:
- Ask one short follow-up only if it materially narrows the affected system; otherwise return "ready".
- Ask only something an ordinary driver can observe: location, timing, operating condition, warning lights, smell, temperature, vibration, or safety change.
- Never repeat or rephrase a previous question and never ask for information already supplied.
- Use a stable, descriptive questionId such as noise_location or warning_lights.
- For a question, provide 2-5 plain choices. For ready, use blank questionId/question and an empty choices array.
- searchQuery must contain year, make, model, the original symptom, and useful answers. Do not assert a diagnosis in the query.
- At most four follow-ups total. Return JSON only.`;
  let response = await gemini(key, { prompt, schema: plannerSchema, temperature: 0.15 });
  let plan = JSON.parse(response.text);
  if (plan.stage === 'question' && !validQuestion(plan, history)) {
    response = await gemini(key, { prompt: `${prompt}\n\nThat proposed question was repetitive or invalid: ${JSON.stringify(plan)}. Return a different valid question or stage "ready".`, schema: plannerSchema, temperature: 0.1 });
    plan = JSON.parse(response.text);
  }
  if (plan.stage === 'question' && validQuestion(plan, history) && !mustFinish) return plan;
  return { stage: 'ready', searchQuery: clean(plan.searchQuery, 500) };
}

async function groundedEvidence(key, vehicle, problem, history, searchQuery) {
  const prompt = `Research evidence that can help a mechanic inspect this vehicle symptom.

Vehicle and symptom:
${vehicleContext(vehicle, problem, history)}

Suggested query: ${searchQuery || `${vehicle.year} ${vehicle.make} ${vehicle.model} ${problem}`}

Use Google Search. Prefer manufacturer/service information, government safety records, reputable technical references, and repeated model-specific owner reports. Clearly distinguish recalls from general symptom evidence. Owner reports are patterns, not proof. Do not claim that one part has failed. Summarize plausible causes, affected parts, diagnostic checks, repair versus replacement considerations, urgency, safety, and time-to-action guidance. Mention conflicts or weak model-specific evidence.`;
  return gemini(key, { prompt, search: true, temperature: 0.15 });
}

async function structuredResult(key, vehicle, problem, history, evidence) {
  const prompt = `Create a concise driver-facing vehicle assessment using the supplied evidence.

Vehicle and symptom:
${vehicleContext(vehicle, problem, history)}

Grounded research evidence:
${evidence.slice(0, 12000)}

Rules:
- This is triage, not a confirmed diagnosis. Never invent a recall or pretend a part was tested.
- Give 1-3 likely problems ordered by fit. Use "most likely" only for the leading possibility.
- Name specific affected parts and 2-5 checks a garage should perform before replacing anything.
- repairRecommendation says what is normally tested or repaired first.
- replacementAdvice explains when replacement is justified, including wear, age, or mileage when relevant; never invent mileage.
- timeframe is plain language such as "Before the next drive", "Within a few days", or "Monitor and book routinely".
- urgency is exactly low, medium, high, or stop driving.
- safeToDrive directly answers whether limited driving is reasonable.
- stopDrivingIf lists observable danger signs.
- Keep fields brief and readable. Return JSON only.`;
  return JSON.parse((await gemini(key, { prompt, schema: resultSchema, temperature: 0.1 })).text);
}

function validResult(result) {
  return Boolean(result?.title && result.explanation && result.likelyProblems?.length && result.affectedParts?.length && result.checks?.length && result.repairRecommendation && result.replacementAdvice && result.timeframe && result.urgency && result.safeToDrive && result.garageQuestion);
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
  const key = process.env.GEMINI_API_KEY;
  if (!key) return json(res, 503, { error: 'AI diagnosis is temporarily unavailable.', code: 'AI_NOT_CONFIGURED' });

  try {
    const plan = await planNext(key, vehicle, problem, history);
    if (plan.stage === 'question') return json(res, 200, {
      stage: 'question', questionId: plan.questionId, question: clean(plan.question, 300),
      choices: plan.choices.slice(0, 5).map(choice => ({ id: clean(choice.id, 80), label: clean(choice.label, 160) }))
    });
    const grounded = await groundedEvidence(key, vehicle, problem, history, plan.searchQuery);
    const result = await structuredResult(key, vehicle, problem, history, grounded.text);
    if (!validResult(result)) throw new Error('The AI response did not pass the diagnosis format check.');
    const safety = `${result.safeToDrive}${result.stopDrivingIf?.length ? ` Stop driving if: ${result.stopDrivingIf.join('; ')}.` : ''}`;
    return json(res, 200, { stage: 'result', diagnosis: {
      title: result.title, explanation: result.explanation, likelyProblems: result.likelyProblems,
      parts: result.affectedParts.slice(0, 8), checks: result.checks.slice(0, 8), action: result.repairRecommendation,
      replacementAdvice: result.replacementAdvice, timeframe: result.timeframe, urgency: result.urgency,
      garageQuestion: result.garageQuestion, safety, limitations: result.limitations, sources: sourcesFromGemini(grounded.body)
    } });
  } catch (error) {
    console.error('Gemini diagnosis failed:', error.message);
    return json(res, 502, { error: 'AI diagnosis is temporarily unavailable. Please try again.' });
  }
};
