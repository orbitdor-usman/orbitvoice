// A completed preview is reusable only for the exact same final PCM samples.
// A natural pause never commits text or stops microphone capture.
export function sameAudio(left, right) {
  if (!left || !right || left.length !== right.length) return false;
  for (let i = 0; i < left.length; i++) if (left[i] !== right[i]) return false;
  return true;
}

export class TranscriptionSession {
  constructor(recognize) { this.recognize = recognize; this.job = null; this.closed = false; }
  start(audio) {
    this.job?.controller.abort();
    const controller = new AbortController();
    const job = { audio: audio.slice(), controller, busy: true };
    this.job = job;
    job.promise = Promise.resolve().then(() => this.recognize(audio, controller.signal))
      .then(text => ({ text }), error => ({ error }))
      .finally(() => { job.busy = false; });
    return job;
  }
  get busy() { return Boolean(this.job?.busy); }
  async preview(audio) {
    if (this.closed) return '';
    const job = sameAudio(this.job?.audio, audio) ? this.job : this.start(audio);
    const result = await job.promise;
    return !this.closed && this.job === job && !job.controller.signal.aborted ? result.text || '' : '';
  }
  async finish(audio) {
    if (this.closed) throw new Error('Recognition cancelled.');
    const reused = sameAudio(this.job?.audio, audio);
    let job = reused ? this.job : this.start(audio);
    let result = await job.promise;
    // A failed speculative pass must not prevent final inference from retrying.
    if (result.error && reused && !this.closed) {
      job = this.start(audio);
      result = await job.promise;
    }
    if (this.closed) throw new Error('Recognition cancelled.');
    if (result.error) throw result.error;
    return result.text;
  }
  cancel() { this.closed = true; this.job?.controller.abort(); this.job = null; }
}
