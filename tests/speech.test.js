const { test } = require('node:test');
const assert = require('node:assert/strict');
const { enhanceTranscript } = require('../backend/services/textEnhancement');

test('dictation needs no key and disabled enhancement makes no network request', async () => {
  let calls = 0;
  const request = async () => { calls++; throw new Error('network'); };
  assert.equal((await enhanceTranscript('hello', { request })).text, 'hello');
  assert.equal((await enhanceTranscript('hello', { enabled: true, request })).text, 'hello');
  assert.equal(calls, 0);
});
for (const status of [401, 403, 429, 500, 'ETIMEDOUT', 'ENOTFOUND']) {
  test(`AI failure ${status} preserves multilingual transcript`, async () => {
    const original = 'السلام علیکم — Hola mundo';
    const result = await enhanceTranscript(original, { apiKey: 'test-only', enabled: true,
      request: async () => { throw Object.assign(new Error('failure'), { status }); } });
    assert.equal(result.text, original);
    assert.equal(result.fallback, true);
  });
}
test('successful enhancement and malformed/incomplete output', async () => {
  const response = text => ({ data: { status: 'completed', output: [{ type: 'message', content: [{ type: 'output_text', text }] }] } });
  const good = await enhanceTranscript('hello world', { apiKey: 'test', enabled: true, request: async (_url, body, options) => {
    assert.equal(body.store, false); assert.equal(options.timeout, 12000); return response('Hello, world.');
  } });
  assert.equal(good.text, 'Hello, world.'); assert.equal(good.enhanced, true);
  for (const data of [{}, { status: 'incomplete' }, response('').data]) {
    const result = await enhanceTranscript('keep my words', { apiKey: 'test', enabled: true, request: async () => ({ data }) });
    assert.equal(result.text, 'keep my words'); assert.equal(result.fallback, true);
  }
});

test('speech-to-text integration selects local for auto language/custom mic and survives browser service failure', async () => {
  const { startBrowserRecognition } = await import('../frontend/services/recognition.mjs');
  let recognition;
  global.window = { webkitSpeechRecognition: class {
    constructor() { recognition = this; }
    start() {}
    stop() { queueMicrotask(() => this.onend()); }
    abort() {}
  } };
  assert.equal(startBrowserRecognition('auto', 'default'), null);
  assert.equal(startBrowserRecognition('en', 'custom-device'), null);
  const good = startBrowserRecognition('ur', 'default');
  assert.equal(recognition.lang, 'ur');
  recognition.onresult({ resultIndex: 0, results: [Object.assign([{ transcript: 'السلام علیکم' }], { isFinal: true })] });
  assert.equal(await good.stop(), 'السلام علیکم');
  const broken = startBrowserRecognition('en', 'default');
  recognition.onerror({ error: 'network' });
  assert.equal(await broken.stop(), '');
  const partial = startBrowserRecognition('en', 'default');
  recognition.onresult({ resultIndex: 0, results: [Object.assign([{ transcript: 'partial' }], { isFinal: true })] });
  recognition.onend();
  assert.equal(await partial.stop(), '');
  const unfinished = startBrowserRecognition('en', 'default');
  recognition.onresult({ resultIndex: 0, results: [Object.assign([{ transcript: 'only the first sentence' }], { isFinal: true })] });
  recognition.stop = () => {};
  assert.equal(await unfinished.stop(), '', 'stop timeout must use the complete recording instead of partial browser text');
  delete global.window;
});

test('microphone failures have actionable messages', async () => {
  const { microphoneError } = await import('../frontend/services/recognition.mjs');
  assert.match(microphoneError({ name: 'NotAllowedError' }), /permission required/i);
  assert.match(microphoneError({ name: 'NotFoundError' }), /No matching microphone/);
  assert.match(microphoneError({ name: 'OverconstrainedError' }), /System default/);
  assert.match(microphoneError({ name: 'NotReadableError' }), /busy/);
});
