// Thin client for Say.so's hosted backend (see /backend) - the only thing
// that changed when the app moved off "bring your own API keys": every
// service file in this directory now calls these instead of Groq/Fish
// Audio/OpenRouter directly. The backend holds the real provider keys so
// end users never need any.
const BACKEND_URL = process.env.BACKEND_URL || 'http://localhost:8787';
const BACKEND_SHARED_SECRET = process.env.BACKEND_SHARED_SECRET;

async function callBackend(path, body, { timeoutMs = 15000 } = {}) {
  if (!BACKEND_SHARED_SECRET) {
    throw new Error('BACKEND_SHARED_SECRET is not set');
  }

  const res = await fetch(`${BACKEND_URL}${path}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${BACKEND_SHARED_SECRET}`,
    },
    body: JSON.stringify(body),
    signal: AbortSignal.timeout(timeoutMs),
  });

  if (!res.ok) {
    const errBody = await res.text();
    throw new Error(`Backend ${path} failed: ${res.status} ${errBody}`);
  }

  return res.json();
}

module.exports = { callBackend };
