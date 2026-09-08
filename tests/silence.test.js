const { test } = require('node:test');
const assert = require('node:assert/strict');

test('silence ends exactly after 3 seconds following speech, never during a normal pause', async () => {
  const { SilenceDetector } = await import('../frontend/services/speech-utils.mjs');
  const detector = new SilenceDetector();
  for (let n = 0; n < 20; n++) assert.equal(detector.update(0.08, 100).reason, null);
  for (let n = 0; n < 20; n++) assert.equal(detector.update(0.001, 100).reason, null);
  for (let n = 0; n < 8; n++) assert.equal(detector.update(0.06, 100).reason, null);
  for (let n = 0; n < 29; n++) assert.equal(detector.update(0.001, 100).reason, null);
  assert.equal(detector.update(0.001, 100).reason, 'silence');
  assert.equal(detector.update(0.001, 100).reason, null, 'stop is emitted only once');
});

test('initial silence allows time to begin, then stops an empty session at 12 seconds', async () => {
  const { SilenceDetector } = await import('../frontend/services/speech-utils.mjs');
  const detector = new SilenceDetector();
  for (let n = 0; n < 119; n++) assert.equal(detector.update(0.0005, 100).reason, null);
  assert.equal(detector.update(0.0005, 100).reason, 'no-speech');
});

test('background floor does not absorb quiet continuous speech or stop a slow speaker', async () => {
  const { SilenceDetector } = await import('../frontend/services/speech-utils.mjs');
  const detector = new SilenceDetector();
  for (let n = 0; n < 100; n++) assert.equal(detector.update(0.009, 100).reason, null);
  for (let n = 0; n < 28; n++) assert.equal(detector.update(0.003, 100).reason, null);
  assert.equal(detector.update(0.012, 100).reason, null);
});

test('conservative correction preserves numbers, deliberate repeats and multilingual words', async () => {
  const { cleanTranscript } = await import('../frontend/services/speech-utils.mjs');
  assert.equal(cleanTranscript(' i think  it is very very good , at 3.14 . ', 'en'), 'I think it is very very good, at 3.14.');
  assert.equal(cleanTranscript('السلام علیکم — Hola mundo', 'auto'), 'السلام علیکم — Hola mundo');
  assert.equal(cleanTranscript('Mira sent 0042 to Dr. Ng', 'en'), 'Mira sent 0042 to Dr. Ng');
});

test('update comparison handles versions numerically and ignores prereleases', () => {
  const { isNewerVersion } = require('../electron/services/productInfo');
  assert.equal(isNewerVersion('v1.10.0', '1.2.0'), true);
  assert.equal(isNewerVersion('v1.1.0', '1.2.0'), false);
  assert.equal(isNewerVersion('v2.0.0-beta', '1.2.0'), false);
});
