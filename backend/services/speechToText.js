const axios = require('axios');
const FormData = require('form-data');

class SpeechToTextError extends Error {
  constructor(message, code = 'TRANSCRIPTION_FAILED', status = 502) {
    super(message);
    this.name = 'SpeechToTextError';
    this.code = code;
    this.status = status;
  }
}

class OpenAIWhisperProvider {
  constructor({ apiKey, model = 'whisper-1' } = {}) {
    this.apiKey = apiKey;
    this.model = model;
  }

  async transcribe({ buffer, mimetype = 'audio/webm', filename = 'recording.webm', language = 'en' }) {
    if (!this.apiKey) {
      throw new SpeechToTextError(
        'Add OPENAI_API_KEY to .env to enable transcription.',
        'MISSING_API_KEY',
        503
      );
    }

    const form = new FormData();
    form.append('file', buffer, { filename, contentType: mimetype });
    form.append('model', this.model);
    form.append('language', language || 'en');
    form.append('response_format', 'json');

    try {
      const response = await axios.post('https://api.openai.com/v1/audio/transcriptions', form, {
        headers: {
          ...form.getHeaders(),
          Authorization: `Bearer ${this.apiKey}`
        },
        timeout: 120000,
        maxContentLength: 25 * 1024 * 1024,
        maxBodyLength: 25 * 1024 * 1024
      });
      const text = String(response.data?.text || '').trim();
      if (!text) throw new SpeechToTextError('No speech was detected in the recording.', 'EMPTY_TRANSCRIPT', 422);
      return text;
    } catch (error) {
      if (error instanceof SpeechToTextError) throw error;
      const providerMessage = error.response?.data?.error?.message;
      if (error.code === 'ECONNABORTED') {
        throw new SpeechToTextError('Transcription timed out. Try a shorter recording.', 'TIMEOUT', 504);
      }
      throw new SpeechToTextError(providerMessage || 'The speech service is unavailable right now.', 'PROVIDER_ERROR', 502);
    }
  }

  async validateKey() {
    if (!this.apiKey) throw new SpeechToTextError('Add your OpenAI API key first.', 'MISSING_API_KEY', 503);
    try {
      await axios.get('https://api.openai.com/v1/models', {
        headers: { Authorization: `Bearer ${this.apiKey}` },
        timeout: 15000
      });
      return true;
    } catch (error) {
      if (error.response?.status === 401) throw new SpeechToTextError('This API key is invalid or expired. Update it in Overview.', 'INVALID_API_KEY', 401);
      throw new SpeechToTextError('The API key could not be checked. Try again when you are online.', 'KEY_CHECK_FAILED', 502);
    }
  }
}

function createSpeechToTextProvider({ apiKey } = {}) {
  const provider = process.env.SPEECH_PROVIDER || 'openai';
  if (provider === 'openai') {
    return new OpenAIWhisperProvider({
      apiKey: apiKey || process.env.OPENAI_API_KEY,
      model: process.env.OPENAI_TRANSCRIPTION_MODEL || 'whisper-1'
    });
  }
  throw new SpeechToTextError(`Unsupported speech provider: ${provider}`, 'UNSUPPORTED_PROVIDER', 500);
}

module.exports = { createSpeechToTextProvider, OpenAIWhisperProvider, SpeechToTextError };
