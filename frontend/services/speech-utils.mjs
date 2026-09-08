// Pure helpers shared by capture and deterministic speech tests.
export class SilenceDetector {
  constructor({ silenceMs = 3000, noSpeechMs = 12000 } = {}) {
    this.silenceMs = silenceMs;
    this.noSpeechMs = noSpeechMs;
    this.elapsed = 0;
    this.lastSpeech = 0;
    this.speechMs = 0;
    this.noiseFloor = 0.002;
    this.stopped = false;
  }
  update(rms, durationMs) {
    this.elapsed += durationMs;
    // Only adapt the floor below the speech threshold; speech must not teach
    // the detector that the user's voice is background noise.
    const threshold = Math.max(0.008, Math.min(0.035, this.noiseFloor * 3));
    const speaking = rms >= threshold;
    if (speaking) {
      this.lastSpeech = this.elapsed;
      this.speechMs += durationMs;
    } else {
      this.noiseFloor = this.noiseFloor * 0.96 + Math.min(rms, threshold / 2) * 0.04;
    }
    const hasSpeech = this.speechMs >= 160;
    const silence = hasSpeech && this.elapsed - this.lastSpeech >= this.silenceMs;
    const empty = !hasSpeech && this.elapsed >= this.noSpeechMs;
    const reason = !this.stopped && (silence || empty) ? (silence ? 'silence' : 'no-speech') : null;
    if (reason) this.stopped = true;
    return { speaking, hasSpeech, reason, elapsed: this.elapsed, silenceMs: this.elapsed - this.lastSpeech };
  }
}

export function cleanTranscript(text, language = 'auto') {
  // Conservative typography only: don't guess names, numbers, or homophones.
  let result = String(text || '').normalize('NFC').replace(/[\t ]+/g, ' ').trim();
  result = result.replace(/ +([,.;:!?،۔])/g, '$1');
  if (language.split('-')[0] === 'en') {
    result = result.replace(/\bi\b/g, 'I').replace(/\bi(['’](?:m|ve|ll|d))\b/gi, 'I$1');
  }
  return result;
}

export function concatenateAudio(chunks, length) {
  const output = new Float32Array(length);
  let offset = 0;
  for (const chunk of chunks) {
    const count = Math.min(chunk.length, length - offset);
    if (count <= 0) break;
    output.set(chunk.subarray(0, count), offset); offset += count;
  }
  return output;
}
