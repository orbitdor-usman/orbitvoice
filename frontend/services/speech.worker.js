import { env, pipeline } from '@huggingface/transformers';

env.allowRemoteModels = false;
env.allowLocalModels = true;
env.localModelPath = '/models/';
env.useBrowserCache = false;
env.backends.onnx.wasm.wasmPaths = '/wasm/';
env.backends.onnx.wasm.numThreads = 1;
env.backends.onnx.wasm.proxy = false;
let transcriber;

let queue = Promise.resolve();
self.onmessage = ({ data }) => { queue = queue.then(() => recognize(data)); };
async function recognize(data) {
  const { id, audio, language } = data;
  try {
    if (!transcriber) {
      self.postMessage({ id, progress: 'Loading bundled speech model…' });
      transcriber = await pipeline('automatic-speech-recognition', 'Xenova/whisper-tiny', {
        dtype: 'q8', device: 'wasm',
        // ORT 1.26's extended QDQ optimizer rejects quantized Whisper decoders.
        // https://github.com/microsoft/onnxruntime/issues/28306
        session_options: { graphOptimizationLevel: 'basic' }
      });
    }
    if (!audio) { self.postMessage({ id, ready: true }); return; }
    self.postMessage({ id, progress: 'Recognizing speech on this device…' });
    const options = { task: 'transcribe', return_timestamps: false, chunk_length_s: 30, stride_length_s: 5 };
    if (language && language !== 'auto') options.language = language.split('-')[0];
    const result = await transcriber(audio, options);
    self.postMessage({ id, text: String(result?.text || '').trim() });
  } catch (error) {
    transcriber = null;
    self.postMessage({ id, error: error.message || 'Local speech recognition failed.' });
  }
}
