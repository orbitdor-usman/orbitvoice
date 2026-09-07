const fs = require('fs');
const path = require('path');

const root = path.join(__dirname, '..');
const sourceInstaller = path.join(root, '..', 'release', 'Orbitvoice-1.1.0-Setup.exe');
const sourceLogo = path.join(root, '..', 'electron', 'assets', 'orbitvoice.png');
const installerDir = path.join(root, 'public', 'downloads');
fs.mkdirSync(installerDir, { recursive: true });
if (!fs.existsSync(sourceInstaller)) throw new Error(`Installer not found: ${sourceInstaller}`);
fs.copyFileSync(sourceInstaller, path.join(installerDir, path.basename(sourceInstaller)));
fs.copyFileSync(sourceLogo, path.join(root, 'public', 'orbitvoice-logo.png'));
console.log('Website assets prepared.');
