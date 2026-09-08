// Extract and validate the actual NSIS payload without uninstalling a user's
// running copy or changing shortcuts/registry. This is not a full install test.
const fs = require('fs');
const path = require('path');
const assert = require('assert/strict');
const { execFileSync } = require('child_process');
const { createHash } = require('crypto');
const asar = require('@electron/asar');
const root = path.resolve(__dirname, '..');
const version = require('../package.json').version;
const installer = path.join(root, 'release', version, `Orbitvoice-${version}-Setup.exe`);
const expected = path.join(root, 'release', version, 'win-unpacked');
const destination = fs.mkdtempSync(path.join(root, '.runtime-data', 'installer-qa-'));
const sevenZip = require('7zip-bin').path7za;
const hash = bytes => createHash('sha256').update(bytes).digest('hex');
const execute = args => execFileSync(sevenZip, args, { windowsHide: true, encoding: 'utf8', maxBuffer: 8 * 1024 * 1024 });
console.log(execute(['t', installer]));
execute(['x', installer, `-o${destination}`, '-y']);
let checked = 0;
function verifyTree(dir, relative = '') {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const file = path.join(relative, entry.name);
    if (entry.isDirectory()) verifyTree(path.join(dir, entry.name), file);
    else {
      assert.equal(hash(fs.readFileSync(path.join(destination, file))), hash(fs.readFileSync(path.join(expected, file))), `Installer payload differs: ${file}`);
      checked++;
    }
  }
}
verifyTree(expected);
const archive = path.join(destination, 'resources', 'app.asar');
const metadata = JSON.parse(asar.extractFile(archive, 'package.json'));
assert.equal(metadata.version, version);
for (const model of ['tiny', 'base']) {
  const manifest = JSON.parse(fs.readFileSync(path.join(root, 'frontend', 'public', 'models', `whisper-${model}-manifest.json`)));
  for (const file of manifest.files) {
    assert.equal(hash(asar.extractFile(archive, path.normalize(`frontend/out/models/${manifest.model}/${file.file}`))), file.sha256, `Model integrity: ${model}/${file.file}`);
  }
}
const paths = asar.listPackage(archive).map(file => file.replaceAll('\\', '/').replace(/^\//, ''));
assert.ok(paths.includes('frontend/out/audio-capture.worklet.js'));
assert.equal(paths.filter(file => /\.wasm$/.test(file)).length, 1, 'One CPU runtime, with no duplicated webpack copy');
for (const prefix of ['website/', 'node_modules/electron/', 'node_modules/next/', 'node_modules/@huggingface/', 'node_modules/onnxruntime-node/', 'electron/native/']) {
  assert.ok(!paths.some(file => file.startsWith(prefix)), `Unexpected packaged directory: ${prefix}`);
}
assert.ok(fs.existsSync(path.join(destination, 'resources', 'native', 'input.ps1')));
assert.ok(!paths.some(file => /(^|\/)(\.env|tests|\.cache)(\/|$)|\.(map|pdb|log)$/.test(file)));
console.log(`PASS: ${checked} installer payload files match the packaged build; both offline models match every pinned SHA-256; no dev packages or debug files.`);
console.log('Installer SHA256:', hash(fs.readFileSync(installer)));
console.log('Extracted application:', path.join(destination, 'Orbitvoice.exe'));
