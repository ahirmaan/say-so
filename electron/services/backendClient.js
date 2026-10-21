// Thin client for Say.so's hosted backend (see /backend) - the only thing
// that changed when the app moved off "bring your own API keys": every
// service file in this directory now calls these instead of Groq/Fish
// Audio/OpenRouter directly. The backend holds the real provider keys so
// end users never need any.
//
// Defaults point at the real deployed backend, so a fresh install needs no
// .env at all - BACKEND_URL/BACKEND_SHARED_SECRET in .env are overrides for
// pointing at a different backend (e.g. localhost during development), not
// something an end user has to set. The shared secret baked in here is a
// basic deterrent, not a strong secret (anyone could extract it from the
// installed app) - the server's daily request cap is the real protection
// against abuse, by design (see backend/src/middleware/rateLimit.js).
const BACKEND_URL = process.env.BACKEND_URL || 'https://say-so.onrender.com';
const BACKEND_SHARED_SECRET =
  process.env.BACKEND_SHARED_SECRET || '446dd4fe84de24eea04b3b836d49c45bbabadc96cc4e888c3ce62f691a725582';

async function callBackend(path, body, { timeoutMs = 15000 } = {}) {
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
