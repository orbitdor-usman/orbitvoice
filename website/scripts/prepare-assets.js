const fs = require('fs');
const path = require('path');

const root = path.join(__dirname, '..');
const installerDir = path.join(root, 'public', 'downloads');
fs.mkdirSync(installerDir, { recursive: true });

const installerName = 'Orbitvoice-1.1.0-Setup.exe';
const installerCandidates = [
  process.env.ORBITVOICE_INSTALLER_PATH,
  path.join(root, 'desktop-app', installerName),
  path.join(root, '..', 'release', installerName)
].filter(Boolean);
const sourceInstaller = installerCandidates.find(candidate => fs.existsSync(candidate));
if (sourceInstaller) {
  fs.copyFileSync(sourceInstaller, path.join(installerDir, installerName));
  console.log(`Installer prepared from ${sourceInstaller}`);
} else {
  console.warn('Installer source not found; continuing without a local installer. Set ORBITVOICE_INSTALLER_URL for production downloads.');
}

const logoCandidates = [
  path.join(root, 'public', 'orbitvoice-logo.png'),
  path.join(root, '..', 'electron', 'assets', 'orbitvoice.png')
];
const sourceLogo = logoCandidates.find(candidate => fs.existsSync(candidate));
if (sourceLogo && sourceLogo !== logoCandidates[0]) fs.copyFileSync(sourceLogo, logoCandidates[0]);
if (!sourceLogo) console.warn('Orbitvoice logo source not found; keeping the existing public logo if available.');
console.log('Website assets prepared.');
