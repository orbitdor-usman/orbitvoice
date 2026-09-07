const { createSpeechToTextProvider } = require('../services/speechToText');
const { readSettings } = require('../config/settings');

async function transcribe(req, res, next) {
  try {
    if (!req.file?.buffer?.length) {
      return res.status(400).json({ error: 'Attach a non-empty audio recording.' });
    }
    const text = await createSpeechToTextProvider({
      apiKey: req.headers['x-openai-api-key'],
    }).transcribe({
      buffer: req.file.buffer,
      mimetype: req.file.mimetype,
      filename: req.file.originalname || 'recording.webm',
      language: String(readSettings().language || 'en').split('-')[0]
    });
    return res.json({ text });
  } catch (error) {
    return next(error);
  }
}

async function validateApiKey(req, res, next) {
  try {
    await createSpeechToTextProvider({ apiKey: req.headers['x-openai-api-key'] }).validateKey();
    res.json({ valid: true });
  } catch (error) {
    next(error);
  }
}

module.exports = { transcribe, validateApiKey };
