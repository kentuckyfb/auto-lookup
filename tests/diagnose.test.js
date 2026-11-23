const assert = require('node:assert/strict');

process.env.GEMINI_API_KEY = 'test-only';

const posted = [];
const responses = [];
global.fetch = async (url, options) => {
  posted.push({ url, headers: options.headers, body: JSON.parse(options.body) });
  const next = responses.shift();
  return { ok: true, json: async () => next };
};

const candidate = (value, extra = {}) => ({ candidates: [{ content: { parts: [{ text: typeof value === 'string' ? value : JSON.stringify(value) }] }, ...extra }] });
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
  responses.push(candidate({
    stage: 'question', questionId: 'noise_location', question: 'Where is the noise loudest?',
    choices: [{ id: 'engine', label: 'Engine bay' }, { id: 'wheel', label: 'Near a wheel' }],
    searchQuery: '2020 Suzuki Wagon R engine noise'
  }));
  const question = await invoke({ year: '2020', make: 'Suzuki', model: 'Wagon R', problem: 'Engine makes a noise', history: [] });
  assert.equal(question.status, 200);
  assert.equal(question.body.stage, 'question');
  assert.equal(question.body.questionId, 'noise_location');
  assert.equal(posted[0].headers['x-goog-api-key'], 'test-only');
  assert.equal(posted[0].body.generationConfig.responseMimeType, 'application/json');
  assert.match(posted[0].body.contents[0].parts[0].text, /2020/);

  posted.length = 0;
  const history = [
    { questionId: 'noise_location', question: 'Where is it?', answer: 'Engine bay' },
    { questionId: 'noise_timing', question: 'When?', answer: 'At idle' },
    { questionId: 'warning_lights', question: 'Any lights?', answer: 'No' },
    { questionId: 'temperature', question: 'Cold or warm?', answer: 'Cold' }
  ];
  responses.push(
    candidate('Evidence points to an auxiliary-belt drive noise; inspect before replacing parts.', {
      groundingMetadata: { groundingChunks: [{ web: { title: 'Technical reference', uri: 'https://example.com/reference' } }] }
    }),
    candidate({
      title: 'Accessory drive needs inspection', explanation: 'The pattern fits a cold-start belt or pulley noise.',
      likelyProblems: [{ name: 'Worn belt or pulley', likelihood: 'most likely', reason: 'It occurs cold at idle.', affectedParts: ['Auxiliary belt', 'Tensioner pulley'] }],
      affectedParts: ['Auxiliary belt', 'Tensioner pulley'], checks: ['Inspect belt condition', 'Listen at each pulley'],
      repairRecommendation: 'Test the belt drive first.', replacementAdvice: 'Replace only a cracked belt or a pulley with confirmed play.',
      timeframe: 'Within a few days', urgency: 'medium', safeToDrive: 'Short trips may be reasonable if the noise is mild.',
      stopDrivingIf: ['the battery warning light appears'], garageQuestion: 'Can you isolate the noisy pulley before replacing parts?',
      limitations: 'No component has been physically tested.'
    })
  );
  const result = await invoke({ year: '2020', make: 'Suzuki', model: 'Wagon R', problem: 'Engine makes a noise', history });
  assert.equal(result.status, 200);
  assert.equal(result.body.stage, 'result');
  assert.equal(result.body.diagnosis.timeframe, 'Within a few days');
  assert.equal(result.body.diagnosis.sources[0].url, 'https://example.com/reference');
  assert.equal(posted.length, 2);
  assert.deepEqual(posted[0].body.tools, [{ google_search: {} }]);
  assert.equal(posted[1].body.generationConfig.responseMimeType, 'application/json');
  console.log('Gemini diagnosis flow test passed');
})().catch(error => {
  console.error(error);
  process.exitCode = 1;
});
