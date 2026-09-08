import { SilenceDetector, concatenateAudio } from './speech-utils.mjs';

export async function captureAudio(acquireStream, { onActivity, onStop, autoStop = true } = {}) {
  const context = new AudioContext({ sampleRate: 16000, latencyHint: 'interactive' });
  let stream;
  let source, node, closed = false, finishing = false, length = 0, flushResolve;
  const chunks = [];
  const detector = new SilenceDetector();
  const close = () => {
    if (closed) return;
    closed = true;
    if (node) { node.port.onmessage = null; node.disconnect(); node.port.close(); }
    source?.disconnect();
    stream?.getTracks().forEach(track => { track.onended = null; track.stop(); });
    void context.close().catch(() => {});
  };
  const snapshot = async (trim = false) => {
    // Trim silence only after the last speech, keeping a 400ms word-end margin.
    const end = trim && detector.speechMs >= 160
      ? Math.min(length, Math.ceil((detector.lastSpeech + 400) * context.sampleRate / 1000)) : length;
    let audio = concatenateAudio(chunks, length).slice(0, end);
    if (context.sampleRate !== 16000 && audio.length) {
      const offline = new OfflineAudioContext(1, Math.ceil(audio.length * 16000 / context.sampleRate), 16000);
      const buffer = offline.createBuffer(1, audio.length, context.sampleRate);
      buffer.copyToChannel(audio, 0);
      const input = offline.createBufferSource(); input.buffer = buffer;
      input.connect(offline.destination); input.start();
      audio = (await offline.startRendering()).getChannelData(0);
    }
    return audio;
  };
  try {
    await context.audioWorklet.addModule('/audio-capture.worklet.js');
    await context.resume();
    node = new AudioWorkletNode(context, 'orbitvoice-capture');
    node.onprocessorerror = () => {
      if (!closed && !finishing) onStop?.('capture-error');
    };
    node.port.onmessage = ({ data }) => {
      if (data.flushed) { flushResolve?.(); return; }
      if (!data.audio || closed) return;
      const audio = data.audio;
      chunks.push(audio); length += audio.length;
      let energy = 0;
      for (const sample of audio) energy += sample * sample;
      const rms = Math.sqrt(energy / audio.length);
      const activity = detector.update(rms, audio.length * 1000 / context.sampleRate);
      onActivity?.({ ...activity, level: Math.min(1, rms * 10) });
      if (!finishing && ((autoStop && activity.reason) || activity.elapsed >= 60000)) {
        onStop?.(activity.elapsed >= 60000 ? 'limit' : activity.reason);
      }
    };
    // Load/initialize before opening the device so the first words aren't lost.
    stream = await acquireStream();
    source = context.createMediaStreamSource(stream);
    source.connect(node);
    // Worklet produces silence; connecting it keeps processing active without monitoring the mic.
    node.connect(context.destination);
    return {
      snapshot,
      cancel() { close(); chunks.length = 0; },
      async stop() {
        finishing = true;
        let timer;
        await Promise.race([
          new Promise(resolve => { flushResolve = resolve; node.port.postMessage('flush'); }),
          new Promise(resolve => { timer = setTimeout(resolve, 250); }),
        ]);
        clearTimeout(timer);
        await context.suspend().catch(() => {});
        const audio = await snapshot(true);
        close(); chunks.length = 0;
        if (detector.speechMs < 160) throw new Error('No speech detected. Check the selected microphone and speak a little closer.');
        return audio;
      },
    };
  } catch (error) { close(); throw error; }
}
