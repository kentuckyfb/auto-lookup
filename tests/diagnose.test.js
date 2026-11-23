const assert = require('node:assert/strict');

process.env.GEMINI_API_KEY = 'test-only';

const posted = [];
const responses = [];
global.fetch = async (url, options) => {
  posted.push({ url, headers: options.headers, body: JSON.parse(options.body) });
  const next = responses.shift();
  if (next?.__error) return { ok: false, status: next.status, json: async () => ({ error: next.error }) };
  return { ok: true, status: 200, json: async () => next };
};

const interaction = value => ({
  status: 'completed',
  steps: [{ type: 'model_output', content: [{ type: 'text', text: JSON.stringify(value) }] }]
});

const emptyDiagnosis = {
  title: '', explanation: '', likelyProblems: [], affectedParts: [], checks: [],
  repairRecommendation: '', replacementAdvice: '', timeframe: '', urgency: 'low',
  safeToDrive: '', stopDrivingIf: [], garageQuestion: '', limitations: ''
};

const diagnose = require('../api/diagnose');

function invoke(body) {
  return new Promise(resolve => diagnose(
    { method: 'POST', headers: {}, body },
    {
      code: 200,
      status(code) { this.code = code; return this; },
      setHeader() { return this; },
      end(payload) { resolve({ status: this.code, body: JSON.parse(payload) }); }
    }
  ));
}

(async () => {
  responses.push(interaction({
    stage: 'question', questionId: 'noise_location', question: 'Where is the noise loudest?',
    choices: [{ id: 'engine', label: 'Engine bay' }, { id: 'wheel', label: 'Near a wheel' }],
    diagnosis: emptyDiagnosis
  }));
  const question = await invoke({ year: '2020', make: 'Suzuki', model: 'Wagon R', problem: 'Engine makes a noise', history: [] });
  assert.equal(question.status, 200);
  assert.equal(question.body.stage, 'question');
  assert.equal(question.body.questionId, 'noise_location');
  assert.equal(posted[0].url, 'https://generativelanguage.googleapis.com/v1beta/interactions');
  assert.equal(posted[0].headers['x-goog-api-key'], 'test-only');
  assert.equal(posted[0].body.model, 'gemini-3.5-flash-lite');
  assert.equal(posted[0].body.store, false);
  assert.equal(posted[0].body.response_format.mime_type, 'application/json');
  assert.equal(posted[0].body.response_format.schema.type, 'object');
  assert.match(posted[0].body.input, /2020/);

  posted.length = 0;
  const diagnosis = {
    title: 'Accessory drive needs inspection', explanation: 'The pattern fits a cold-start belt or pulley noise.',
    likelyProblems: [{ name: 'Worn belt or pulley', likelihood: 'most likely', reason: 'It occurs cold at idle.', affectedParts: ['Auxiliary belt', 'Tensioner pulley'] }],
    affectedParts: ['Auxiliary belt', 'Tensioner pulley'], checks: ['Inspect belt condition', 'Listen at each pulley'],
    repairRecommendation: 'Test the belt drive first.', replacementAdvice: 'Replace only a cracked belt or a pulley with confirmed play.',
    timeframe: 'Within a few days', urgency: 'medium', safeToDrive: 'Short trips may be reasonable if the noise is mild.',
    stopDrivingIf: ['the battery warning light appears'], garageQuestion: 'Can you isolate the noisy pulley before replacing parts?',
    limitations: 'No component has been physically tested.'
  };
  responses.push(interaction({ stage: 'result', questionId: '', question: '', choices: [], diagnosis }));
  const result = await invoke({
    year: '2020', make: 'Suzuki', model: 'Wagon R', problem: 'Engine makes a noise',
    history: [{ questionId: 'noise_location', question: 'Where is it?', answer: 'Engine bay' }]
  });
  assert.equal(result.status, 200);
  assert.equal(result.body.stage, 'result');
  assert.equal(result.body.diagnosis.timeframe, 'Within a few days');
  assert.equal(result.body.diagnosis.sources.length, 0);
  assert.equal(posted.length, 1);

  posted.length = 0;
  responses.push(
    { __error: true, status: 503, error: { status: 'service_unavailable', message: 'High demand' } },
    interaction({ stage: 'question', questionId: 'ac_conditions', question: 'When does the A/C blow warm?', choices: [{ id: 'always', label: 'All the time' }, { id: 'idle', label: 'Mostly at idle' }], diagnosis: emptyDiagnosis })
  );
  const fallback = await invoke({ year: '2021', make: 'Suzuki', model: 'Alto', problem: 'A/C blows warm air', history: [] });
  assert.equal(fallback.status, 200);
  assert.equal(fallback.body.stage, 'question');
  assert.equal(posted.length, 2);
  assert.equal(posted[0].body.model, 'gemini-3.5-flash-lite');
  assert.equal(posted[1].body.model, 'gemini-3.8-flash');
  console.log('Gemini Interactions contract test passed');
})().catch(error => {
  console.error(error);
  process.exitCode = 1;
});
