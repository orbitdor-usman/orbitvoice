# Bundled speech components

Orbitvoice includes `speech-to-text` (MIT), Hugging Face Transformers.js (Apache-2.0), ONNX Runtime (MIT), and the `Xenova/whisper-tiny` and `Xenova/whisper-base` models (Apache-2.0 as declared by their model cards). Upstream notices and licenses are retained in the distribution's models/licenses directory.

- https://github.com/magician11/speech-to-text
- https://github.com/huggingface/transformers.js
- https://github.com/microsoft/onnxruntime
- https://huggingface.co/Xenova/whisper-tiny
- https://huggingface.co/Xenova/whisper-base

The model revisions and asset hashes are recorded in `frontend/public/models/*-manifest.json` in the source project and `frontend/out/models/*-manifest.json` in the packaged application. Recognition accuracy depends on the language and recording conditions.
