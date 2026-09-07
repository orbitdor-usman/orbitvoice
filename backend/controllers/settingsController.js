const { readSettings, writeSettings } = require('../config/settings');

const allowedKeys = new Set([
  'enabled',
  'microphoneId',
  'language',
  'startWithWindows',
  'showFloating',
  'minimizeToTray',
  'shortcut',
  'provider'
]);

function getSettings(req, res) {
  res.json(readSettings());
}

function updateSettings(req, res, next) {
  try {
    const patch = Object.fromEntries(
      Object.entries(req.body || {}).filter(([key]) => allowedKeys.has(key))
    );
    if (patch.language && !/^[a-z]{2}(-[A-Z]{2})?$/.test(patch.language)) {
      return res.status(400).json({ error: 'Invalid language.' });
    }
    res.json(writeSettings(patch));
  } catch (error) {
    next(error);
  }
}

module.exports = { getSettings, updateSettings };
