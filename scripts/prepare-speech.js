// Pin and bundle the multilingual model so installed dictation needs no download.
const fs = require('fs/promises');
const path = require('path');
const { createHash } = require('crypto');
const model = 'Xenova/whisper-tiny';
const root = path.join(__dirname, '..', 'frontend', 'public');
const files = ['config.json', 'generation_config.json', 'preprocessor_config.json', 'tokenizer.json', 'tokenizer_config.json', 'onnx/encoder_model_quantized.onnx', 'onnx/decoder_model_merged_quantized.onnx'];

async function main() {
  const manifestFile = path.join(root, 'models', 'manifest.json');
  let previous;
  try { previous = JSON.parse(await fs.readFile(manifestFile, 'utf8')); } catch {}
  const meta = previous || await fetch(`https://huggingface.co/api/models/${model}`).then(r => { if (!r.ok) throw new Error('Cannot resolve speech model revision'); return r.json(); });
  const revision = meta.revision || meta.sha;
  const records = [];
  for (const file of files) {
    const dest = path.join(root, 'models', model, file);
    const record = previous?.files?.find(item => item.file === file);
    let bytes;
    try { bytes = await fs.readFile(dest); } catch {}
    if (!bytes || !record || createHash('sha256').update(bytes).digest('hex') !== record.sha256) {
      console.log(`Bundling ${file}`);
      const response = await fetch(`https://huggingface.co/${model}/resolve/${revision}/${file}`, { signal: AbortSignal.timeout(300000) });
      if (!response.ok) throw new Error(`Speech model download failed: ${file} (${response.status})`);
      bytes = Buffer.from(await response.arrayBuffer());
      await fs.mkdir(path.dirname(dest), { recursive: true });
      await fs.writeFile(dest, bytes);
    }
    records.push({ file, bytes: bytes.length, sha256: createHash('sha256').update(bytes).digest('hex') });
  }
  await fs.writeFile(manifestFile, JSON.stringify({ model, revision, files: records }, null, 2));
  const licenses = path.join(root, 'models', 'licenses');
  await fs.mkdir(licenses, { recursive: true });
  for (const [pkg, name] of [['@huggingface/transformers', 'Apache-2.0.txt'], ['speech-to-text', 'speech-to-text-MIT.txt']]) {
    await fs.copyFile(path.join(__dirname, '..', 'node_modules', pkg, 'LICENSE'), path.join(licenses, name));
  }
  const ortLicense = path.join(licenses, 'onnxruntime-MIT.txt');
  try { await fs.access(ortLicense); } catch {
    const response = await fetch('https://raw.githubusercontent.com/microsoft/onnxruntime/main/LICENSE');
    if (!response.ok) throw new Error('Could not bundle the ONNX Runtime license.');
    await fs.writeFile(ortLicense, await response.text());
  }
  const wasmDir = path.join(root, 'wasm');
  await fs.mkdir(wasmDir, { recursive: true });
  const ortDir = path.join(__dirname, '..', 'node_modules', 'onnxruntime-web', 'dist');
  for (const file of await fs.readdir(ortDir)) {
    if (/^ort-wasm.*\.(wasm|mjs)$/.test(file)) await fs.copyFile(path.join(ortDir, file), path.join(wasmDir, file));
  }
  console.log('Offline speech model and WASM runtime ready.');
}
main().catch(error => { console.error(error); process.exitCode = 1; });
