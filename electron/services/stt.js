const { callBackend } = require('./backendClient');

// Speech-to-text now goes through Say.so's hosted backend instead of
// calling Groq directly - no GROQ_API_KEY needed on this machine anymore.
// See backend/src/services/stt.js for the actual Groq call.
async function transcribeAudio(buffer, mimeType = 'audio/webm') {
  const { text } = await callBackend(
    '/v1/stt',
    { audioBase64: buffer.toString('base64'), mimeType },
    { timeoutMs: 20000 }
  );
  return text;
}

module.exports = { transcribeAudio };
