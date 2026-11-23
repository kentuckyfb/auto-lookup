const assert = require('node:assert/strict');

process.env.OPENAI_API_KEY = 'test-only';

let posted;
global.fetch = async (_url, options) => {
  posted = JSON.parse(options.body);
  return {
    ok: true,
    json: async () => ({
      output: [{
        content: [{
          type: 'output_text',
          text: JSON.stringify({
            stage: 'question',
            question: 'Where is the noise loudest?',
            choices: [{ id: 'engine', label: 'Engine bay' }, { id: 'wheel', label: 'Near a wheel' }],
            diagnosis: { title: '', explanation: '', parts: [], checks: [], action: '', urgency: '', garageQuestion: '', safety: '' }
          })
        }]
      }]
    })
  };
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
  const response = await invoke({
    year: '2020', make: 'Suzuki', model: 'Wagon R', problem: 'Engine makes a noise',
    history: [{ question: 'When does it happen?', answer: 'While moving' }]
  });
  const context = JSON.parse(posted.input);
  assert.equal(response.status, 200);
  assert.equal(response.body.stage, 'question');
  assert.deepEqual(context.vehicle, { year: '2020', make: 'Suzuki', model: 'Wagon R' });
  assert.equal(context.problem, 'Engine makes a noise');
  assert.equal(context.previousAnswers[0].answer, 'While moving');
  assert.equal(posted.text.format.type, 'json_schema');
  assert.equal(posted.text.format.strict, true);
  console.log('diagnose structured-output test passed');
})().catch(error => {
  console.error(error);
  process.exitCode = 1;
});
