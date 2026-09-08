const { test } = require('node:test');
const assert = require('node:assert/strict');
const audio = (...samples) => new Float32Array(samples);

test('Whisper cancellation retains standard stopping rules and yields before decoding', async () => {
  const { installCooperativeDecoder } = await import('../frontend/services/cooperative-decoder.mjs');
  const events = [];
  const stop = { interrupted: false };
  const model = {
    _get_stopping_criteria: () => ['eos', 'max-length'],
    forward: async input => { events.push('decode'); return input; },
  };
  installCooperativeDecoder(model, () => stop, async () => { events.push('yield'); stop.interrupted = true; });
  assert.deepEqual(model._get_stopping_criteria(), ['eos', 'max-length', stop]);
  assert.equal(await model.forward('input'), 'input');
  assert.deepEqual(events, ['yield', 'decode']);
  assert.equal(stop.interrupted, true);
});

test('silence-period inference is reused only when final PCM is identical', async () => {
  const { TranscriptionSession } = await import('../frontend/services/transcription-session.mjs');
  let calls = 0;
  const session = new TranscriptionSession(async () => { calls++; return 'Complete sentence.'; });
  assert.equal(await session.preview(audio(1, 2)), 'Complete sentence.');
  assert.equal(await session.finish(audio(1, 2)), 'Complete sentence.');
  assert.equal(calls, 1, 'Do not decode the same recording twice');
  session.cancel();
});

test('speech after a natural pause invalidates an old completed preview', async () => {
  const { TranscriptionSession } = await import('../frontend/services/transcription-session.mjs');
  let calls = 0;
  const session = new TranscriptionSession(async () => ++calls === 1 ? 'First part.' : 'First part and the rest.');
  await session.preview(audio(1));
  assert.equal(await session.finish(audio(1, 2)), 'First part and the rest.');
  assert.equal(calls, 2);
  session.cancel();
});

test('final inference interrupts a stale decoder instead of waiting for its full result', async () => {
  const { TranscriptionSession } = await import('../frontend/services/transcription-session.mjs');
  let firstSignal;
  const session = new TranscriptionSession((samples, signal) => {
    if (samples.length > 1) return Promise.resolve('Full sentence');
    firstSignal = signal;
    return new Promise((_resolve, reject) => signal.addEventListener('abort', () => reject(new Error('Aborted')), { once: true }));
  });
  const old = session.preview(audio(1));
  await Promise.resolve();
  assert.equal(await session.finish(audio(1, 2)), 'Full sentence');
  assert.equal(firstSignal.aborted, true);
  assert.equal(await old, '', 'Never publish stale text');
  session.cancel();
});

test('a failed speculative pass retries final audio, not an incomplete transcript', async () => {
  const { TranscriptionSession } = await import('../frontend/services/transcription-session.mjs');
  let calls = 0;
  const session = new TranscriptionSession(async () => { if (++calls === 1) throw new Error('Temporary error'); return 'Recovered'; });
  assert.equal(await session.preview(audio(1)), '');
  assert.equal(await session.finish(audio(1)), 'Recovered');
  session.cancel();
});

test('cancelled sessions do not publish or finish, including queued work', async () => {
  const { TranscriptionSession } = await import('../frontend/services/transcription-session.mjs');
  const session = new TranscriptionSession(async () => 'Must not insert');
  const pending = session.preview(audio(1));
  session.cancel();
  assert.equal(await pending, '');
  await assert.rejects(session.finish(audio(1)), /cancelled/);
});

test('a failed final pass is not retried with an already-transferred audio buffer', async () => {
  const { TranscriptionSession } = await import('../frontend/services/transcription-session.mjs');
  let calls = 0;
  const session = new TranscriptionSession(async samples => {
    calls++;
    structuredClone(samples, { transfer: [samples.buffer] });
    throw new Error('Final recognition failed');
  });
  await assert.rejects(session.finish(audio(1, 2)), /Final recognition failed/);
  assert.equal(calls, 1);
  session.cancel();
});

test('equal-length but different audio cannot reuse a preview; trimmed buffers are exact', async () => {
  const { sameAudio } = await import('../frontend/services/transcription-session.mjs');
  const { concatenateAudio } = await import('../frontend/services/speech-utils.mjs');
  assert.equal(sameAudio(audio(1, 2), audio(1, 3)), false);
  assert.equal(sameAudio(null, audio(1)), false);
  assert.deepEqual(concatenateAudio([audio(1, 2), audio(3, 4)], 3), audio(1, 2, 3));
});

test('worker RPC abort drops late partial/final events and keeps the worker warm', async () => {
  const { localRequest, disposeRecognition } = await import('../frontend/services/recognition.mjs');
  const messages = [];
  let worker, creations = 0, partials = 0;
  global.Worker = class {
    constructor() { worker = this; creations++; }
    postMessage(message) { messages.push(message); }
    terminate() {}
  };
  try {
    const controller = new AbortController();
    const stale = localRequest(audio(1), 'en', undefined, { signal: controller.signal, onPartial: () => partials++ });
    const firstId = messages[0].id;
    controller.abort();
    await assert.rejects(stale, { name: 'AbortError' });
    assert.equal(messages[1].cancel, firstId);
    worker.onmessage({ data: { id: firstId, partial: 'stale' } });
    worker.onmessage({ data: { id: firstId, text: 'stale' } });
    const final = localRequest(audio(1, 2), 'en');
    worker.onmessage({ data: { id: messages[2].id, text: 'Complete' } });
    assert.equal(await final, 'Complete');
    assert.equal(creations, 1);
    assert.equal(partials, 0);
  } finally { disposeRecognition(); delete global.Worker; }
});
