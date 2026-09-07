const fs = require('fs');
const path = require('path');
const { safeStorage } = require('electron');

function getKeyPath() {
  return path.join(process.env.APP_DATA_DIR || process.cwd(), 'openai-api-key.bin');
}

function saveApiKey(value) {
  const key = String(value || '').trim();
  const filePath = getKeyPath();
  if (!key) {
    if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
    return false;
  }
  if (!safeStorage.isEncryptionAvailable()) {
    throw new Error('Windows secure storage is unavailable on this device.');
  }
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  fs.writeFileSync(filePath, safeStorage.encryptString(key));
  return true;
}

function readApiKey() {
  const filePath = getKeyPath();
  try {
    if (!fs.existsSync(filePath) || !safeStorage.isEncryptionAvailable()) return '';
    return safeStorage.decryptString(fs.readFileSync(filePath));
  } catch {
    return '';
  }
}

function hasApiKey() {
  return Boolean(readApiKey());
}

module.exports = { saveApiKey, readApiKey, hasApiKey };
