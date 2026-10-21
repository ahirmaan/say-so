// override: true - see electron/main.js for why this matters (a stale OS-level
// env var of the same name would otherwise silently and permanently win over
// whatever's actually in .env).
require('dotenv').config({ override: true });
const express = require('express');
const cors = require('cors');

const { requireAppSecret } = require('./src/middleware/auth');
const { perIpLimiter, enforceDailyCap } = require('./src/middleware/rateLimit');
const sttRoutes = require('./src/routes/stt');
const ttsRoutes = require('./src/routes/tts');
const llmRoutes = require('./src/routes/llm');

const app = express();

// Audio clips arrive as base64 JSON - a few minutes of webm audio can run a
// few MB once base64-inflated, so the default 100kb body limit is nowhere
// close to enough.
app.use(express.json({ limit: '25mb' }));
app.use(cors());

// No auth/cap needed just to check the server is alive.
app.get('/health', (_req, res) => res.json({ ok: true }));

app.use(perIpLimiter);
app.use(requireAppSecret);
app.use(enforceDailyCap);

app.use('/v1', sttRoutes);
app.use('/v1', ttsRoutes);
app.use('/v1', llmRoutes);

app.use((err, _req, res, _next) => {
  console.error('[unhandled error]', err);
  res.status(500).json({ error: 'Internal server error' });
});

const PORT = process.env.PORT || 8787;
app.listen(PORT, () => {
  console.log(`Say.so backend listening on port ${PORT}`);
});
