const rateLimit = require('express-rate-limit');

// Per-IP limiter: stops one client from hammering the API. Generous enough
// for normal use (a real conversation makes a handful of calls per minute
// at most), tight enough to blunt accidental loops/abuse from one source.
const perIpLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 120,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many requests from this IP - please slow down.' },
});

// The real safety net: a hard cap on TOTAL requests across every user,
// combined, per UTC day. This is what actually prevents "public install +
// no billing relationship with users" from turning into a surprise bill -
// per-IP limits alone don't help once usage is genuinely spread across many
// different people.
//
// Known limitation: this counter lives in memory, so a server restart or
// redeploy resets it early. Good enough for a hackathon-scale safety net;
// a real production version should move this to a persistent store (e.g. a
// small Postgres/Redis counter) so it survives restarts.
const DAILY_REQUEST_CAP = Number(process.env.DAILY_REQUEST_CAP || 300);

let dayKey = null;
let dayCount = 0;

function todayKey() {
  return new Date().toISOString().slice(0, 10); // YYYY-MM-DD (UTC)
}

function enforceDailyCap(req, res, next) {
  const today = todayKey();
  if (today !== dayKey) {
    dayKey = today;
    dayCount = 0;
  }

  if (dayCount >= DAILY_REQUEST_CAP) {
    console.warn(`[rate-limit] Daily cap (${DAILY_REQUEST_CAP}) reached for ${dayKey} - refusing request.`);
    return res.status(503).json({
      error: 'Say.so has hit its shared daily usage cap. Please try again tomorrow, or use your own API keys.',
    });
  }

  dayCount += 1;
  if (dayCount % 25 === 0) {
    console.log(`[rate-limit] ${dayCount}/${DAILY_REQUEST_CAP} requests used today (${dayKey}).`);
  }
  next();
}

module.exports = { perIpLimiter, enforceDailyCap };
