const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const os = require('os');
const path = require('path');
test('settings preserve position/language and cannot disable core recognition', () => {
  const previous = process.env.APP_DATA_DIR;
  const temp = fs.mkdtempSync(path.join(os.tmpdir(), 'orbitvoice-settings-test-'));
  process.env.APP_DATA_DIR = temp;
  try {
    const { writeSettings, readSettings } = require('../backend/config/settings');
    writeSettings({ language: 'ur', widgetPosition: { x: -150, y: 240 }, aiEnhancement: true, localSpeechEnabled: false });
    const settings = readSettings();
    assert.equal(settings.language, 'ur');
    assert.equal(settings.localSpeechEnabled, true);
    assert.deepEqual(settings.widgetPosition, { x: -150, y: 240 });
    writeSettings({ enabled: 'false', openaiApiKey: 'must-not-persist', widgetPosition: { x: 'bad', y: 0 } });
    assert.equal(readSettings().enabled, true);
    assert.equal(readSettings().openaiApiKey, undefined);
    writeSettings({ speechModel: 'base', autoStopSilence: false, browserRecognition: true });
    writeSettings({ speechModel: 'remote-model', autoStopSilence: 'false' });
    assert.equal(readSettings().speechModel, 'base');
    assert.equal(readSettings().autoStopSilence, false);
  } finally {
    if (previous === undefined) delete process.env.APP_DATA_DIR; else process.env.APP_DATA_DIR = previous;
    fs.rmSync(temp, { recursive: true });
  }
});
