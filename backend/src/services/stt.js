const GROQ_API_KEY = process.env.GROQ_API_KEY;

// Same Groq Whisper call as the client used to make directly - the only
// difference is the key lives here now, not on every user's machine.
async function transcribeAudio(audioBuffer, mimeType = 'audio/webm') {
  if (!GROQ_API_KEY) throw new Error('GROQ_API_KEY is not set on the server');

  const ext = mimeType.includes('webm') ? 'webm' : mimeType.includes('ogg') ? 'ogg' : 'wav';
  const form = new FormData();
  form.append('file', new Blob([audioBuffer], { type: mimeType }), `clip.${ext}`);
  form.append('model', 'whisper-large-v3-turbo');

  const res = await fetch('https://api.groq.com/openai/v1/audio/transcriptions', {
    method: 'POST',
    headers: { Authorization: `Bearer ${GROQ_API_KEY}` },
    body: form,
    signal: AbortSignal.timeout(15000),
  });

  if (!res.ok) {
    throw new Error(`Groq STT failed: ${res.status} ${await res.text()}`);
  }

  const data = await res.json();
  return data.text.trim();
}

module.exports = { transcribeAudio };
