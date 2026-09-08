// Read-only packaging audit. Usage: node scripts/analyze-build.cjs 1.2.0 1.2.1
const fs = require('fs');
const path = require('path');
const asar = require('@electron/asar');
function sumFiles(dir) {
  return fs.readdirSync(dir, { withFileTypes: true }).reduce((total, entry) => {
    const target = path.join(dir, entry.name);
    return total + (entry.isDirectory() ? sumFiles(target) : fs.statSync(target).size);
  }, 0);
}
function inspect(version) {
  const root = path.resolve(__dirname, '..', 'release', version);
  const unpacked = path.join(root, 'win-unpacked');
  const archive = path.join(unpacked, 'resources', 'app.asar');
  const header = asar.getRawHeader(archive).header;
  const groups = {}, files = [];
  function walk(entries, prefix = '') {
    for (const [name, entry] of Object.entries(entries)) {
      const file = `${prefix}${name}`;
      if (entry.files) { walk(entry.files, `${file}/`); continue; }
      const group = file.startsWith('frontend/out/models/') ? 'speech models and licenses'
        : file.startsWith('frontend/out/wasm/') ? 'WASM runtime'
        : file.startsWith('frontend/out/_next/') ? 'compiled frontend'
        : file.split('/')[0];
      groups[group] = (groups[group] || 0) + (entry.size || 0);
      files.push({ file, bytes: entry.size || 0 });
    }
  }
  walk(header.files);
  return { version, installerBytes: fs.statSync(path.join(root, `Orbitvoice-${version}-Setup.exe`)).size,
    installedBytes: sumFiles(unpacked), archiveBytes: fs.statSync(archive).size, groups,
    largest: files.sort((a, b) => b.bytes - a.bytes).slice(0, 15),
    unexpected: files.filter(({ file }) => /(^|\/)(website|tests|\.env|\.cache)(\/|$)|\.(map|pdb|log)$/.test(file)).map(item => item.file) };
}
const reports = (process.argv.slice(2).length ? process.argv.slice(2) : [require('../package.json').version]).map(inspect);
console.log(JSON.stringify(reports, null, 2));
if (reports.length === 2) {
  for (const key of ['installerBytes', 'installedBytes', 'archiveBytes']) {
    console.log(`${key}: saved ${reports[0][key] - reports[1][key]} bytes (${(100 * (1 - reports[1][key] / reports[0][key])).toFixed(1)}%)`);
  }
}
