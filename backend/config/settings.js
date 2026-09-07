const fs = require('fs');
const path = require('path');

const defaults = {
  enabled: true,
  microphoneId: 'default',
  language: 'auto',
  aiEnhancement: false,
  widgetPosition: null,
  servicePort: 3847,
  localSpeechEnabled: true,
  startWithWindows: false,
  showFloating: true,
  minimizeToTray: true,
  shortcut: 'CommandOrControl+Shift+Space',
  provider: process.env.SPEECH_PROVIDER || 'openai'
};

function getSettingsPath() {
  const dataDir = process.env.APP_DATA_DIR || path.join(process.cwd(), '.runtime-data');
  fs.mkdirSync(dataDir, { recursive: true });
  return path.join(dataDir, 'settings.json');
}

function readSettings() {
  try {
    const saved = JSON.parse(fs.readFileSync(getSettingsPath(), 'utf8'));
    return { ...defaults, ...saved, localSpeechEnabled: true };
  } catch {
    return { ...defaults };
  }
}

function writeSettings(patch) {
  const allowed = {};
  for (const [key, value] of Object.entries(patch || {})) {
    if (!Object.hasOwn(defaults, key)) continue;
    if (typeof defaults[key] === 'boolean' && typeof value !== 'boolean') continue;
    if (typeof defaults[key] === 'string' && (typeof value !== 'string' || value.length > 256)) continue;
    if (key === 'servicePort' && (!Number.isInteger(value) || value < 1024 || value > 65535)) continue;
    if (key === 'widgetPosition' && value !== null && (!Number.isFinite(value?.x) || !Number.isFinite(value?.y))) continue;
    allowed[key] = value;
  }
  const next = { ...readSettings(), ...allowed, localSpeechEnabled: true };
  fs.writeFileSync(getSettingsPath(), JSON.stringify(next, null, 2));
  return next;
}

module.exports = { defaults, readSettings, writeSettings };
