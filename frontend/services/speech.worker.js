import { env, pipeline, TextStreamer } from '@huggingface/transformers';
import { cleanTranscript } from './speech-utils.mjs';

env.allowRemoteModels = false;
env.allowLocalModels = true;
env.localModelPath = '/models/';
env.useBrowserCache = false;
env.backends.onnx.wasm.wasmPaths = '/wasm/';
env.backends.onnx.wasm.numThreads = 1;
env.backends.onnx.wasm.proxy = false;
let transcriber;
let loadedModel;

let queue = Promise.resolve();
self.onmessage = ({ data }) => { queue = queue.then(() => recognize(data)); };
async function recognize(data) {
  const { id, audio, language } = data;
  const model = data.model === 'tiny' ? 'tiny' : 'base';
  try {
    if (transcriber && loadedModel !== model) { await transcriber.dispose(); transcriber = null; }
    if (!transcriber) {
      self.postMessage({ id, progress: 'Loading bundled speech model…' });
      transcriber = await pipeline('automatic-speech-recognition', `Xenova/whisper-${model}`, {
        dtype: 'q8', device: 'wasm',
        // ORT 1.26's extended QDQ optimizer rejects quantized Whisper decoders.
        // https://github.com/microsoft/onnxruntime/issues/28306
        session_options: { graphOptimizationLevel: 'basic' }
      });
      loadedModel = model;
    }
    if (!audio) { self.postMessage({ id, ready: true }); return; }
    self.postMessage({ id, progress: 'Recognizing speech on this device…' });
    let partial = '', lastSent = 0;
    const streamer = new TextStreamer(transcriber.tokenizer, {
      skip_prompt: true, skip_special_tokens: true,
      callback_function: piece => {
        partial += piece;
        if (performance.now() - lastSent < 120) return;
        lastSent = performance.now();
        self.postMessage({ id, partial: partial.trim() });
      },
    });
    const options = { task: 'transcribe', return_timestamps: false, chunk_length_s: 30, stride_length_s: 5, do_sample: false };
    // Overlapping long-audio chunks are merged by the pipeline; don't expose
    // concatenated decoder tokens as if they were a deduplicated transcript.
    if (audio.length <= 30 * 16000) options.streamer = streamer;
    if (language && language !== 'auto') options.language = language.split('-')[0];
    const result = await transcriber(audio, options);
    self.postMessage({ id, text: cleanTranscript(result?.text, language) });
  } catch (error) {
    await transcriber?.dispose().catch(() => {});
    transcriber = null;
    console.error('Local recognition:', error.message);
    const message = /fetch|404|not found|ENOENT/i.test(error.message || '')
      ? 'A bundled speech file could not be loaded. Reinstall Orbitvoice, then try again.'
      : /language/i.test(error.message || '')
        ? 'This language could not be recognized. Choose Auto-detect or another spoken language in Voice input.'
        : 'Local recognition could not finish. Try the Fast model in Voice input or record a shorter sentence.';
    self.postMessage({ id, error: message });
  }
}
