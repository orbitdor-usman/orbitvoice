const links = Object.freeze({
  website: 'https://ov.orbitdor.com/',
  help: 'https://ov.orbitdor.com/docs',
  support: 'mailto:orbitdor@gmail.com',
  company: 'https://www.orbitdor.com/',
  updates: 'https://github.com/orbitdor-usman/orbitvoice/releases',
});
function isNewerVersion(candidate, current) {
  const parse = value => /^v?\d+\.\d+\.\d+$/.test(value) ? value.replace(/^v/, '').split('.').map(Number) : null;
  const next = parse(candidate), existing = parse(current);
  if (!next || !existing) return false;
  for (let i = 0; i < 3; i++) { if (next[i] !== existing[i]) return next[i] > existing[i]; }
  return false;
}
module.exports = { links, isNewerVersion };
