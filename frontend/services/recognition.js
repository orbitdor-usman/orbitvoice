import SpeechToText from 'speech-to-text';

let worker;
let sequence = 0;
const pending = new Map();
export function localRequest(audio, language, onProgress) {
  if (!worker) {
    worker = new Worker(new URL('./speech.worker.js', import.meta.url));
    worker.onmessage = ({ data }) => {
      const job = pending.get(data.id);
      if (!job) return;
      if (data.progress) return job.onProgress?.(data.progress);
      clearTimeout(job.timer);
      pending.delete(data.id);
      if (data.error) job.reject(new Error(data.error));
      else job.resolve(data.text || '');
    };
    worker.onerror = () => disposeRecognition('The local speech worker stopped. Try recording again.');
  }
  return new Promise((resolve, reject) => {
    const id = ++sequence;
    const timer = setTimeout(() => disposeRecognition('Local recognition timed out. Try a shorter recording.'), 180000);
    pending.set(id, { resolve, reject, onProgress, timer });
    worker.postMessage({ id, audio, language });
  });
}
export function disposeRecognition(message = 'Recognition cancelled.') {
  worker?.terminate(); worker = null;
  for (const job of pending.values()) { clearTimeout(job.timer); job.reject(new Error(message)); }
  pending.clear();
}

// Always capture audio in parallel: browser services can fail after starting.
export function startBrowserRecognition(language, microphoneId, onInterim) {
  if (language === 'auto' || (microphoneId && microphoneId !== 'default')) return null;
  let listener;
  let ended = false;
  let failed = false;
  let finals = [];
  let finish;
  const completion = new Promise(resolve => { finish = resolve; });
  try {
    listener = new SpeechToText(text => finals.push(text), () => {
      ended = true;
      finish();
    }, onInterim, language || 'en');
    listener.recognition.continuous = true;
    listener.recognition.onerror = () => { failed = true; finish(); };
    listener.startListening();
  } catch { return null; }
  return {
    async stop() {
      const endedEarly = ended;
      if (!ended) { try { listener.stopListening(); } catch { failed = true; } }
      let timer;
      let timedOut = false;
      await Promise.race([completion, new Promise(resolve => { timer = setTimeout(() => { timedOut = true; resolve(); }, 1500); })]);
      clearTimeout(timer);
      try { listener.recognition.abort(); } catch {}
      // An early browser disconnect may have captured only part of the session.
      return failed || endedEarly || timedOut ? '' : finals.join(' ').trim();
    },
    cancel() { failed = true; try { listener.recognition.abort(); } catch {} finish(); }
  };
}

export async function decodeAudio(blob) {
  const context = new AudioContext();
  try {
    const decoded = await context.decodeAudioData(await blob.arrayBuffer());
    const offline = new OfflineAudioContext(1, Math.max(1, Math.ceil(decoded.duration * 16000)), 16000);
    const source = offline.createBufferSource(); source.buffer = decoded;
    source.connect(offline.destination); source.start();
    const audio = (await offline.startRendering()).getChannelData(0);
    let energy = 0;
    for (const sample of audio) energy += sample * sample;
    if (audio.length < 3200 || Math.sqrt(energy / audio.length) < 0.001) throw new Error('No speech was detected. Check your microphone and try again.');
    return audio;
  } finally { await context.close(); }
}

export function microphoneError(error) {
  if (['NotAllowedError', 'SecurityError'].includes(error.name)) return 'Microphone permission required. Allow desktop microphone access in Windows Settings, then try again.';
  if (['NotFoundError', 'OverconstrainedError'].includes(error.name)) return 'No matching microphone found. Connect one or select System default in Voice input.';
  if (error.name === 'NotReadableError') return 'The microphone is busy or unavailable. Close other recording apps and try again.';
  return error.message || 'Speech recognition failed. Try again.';
}
