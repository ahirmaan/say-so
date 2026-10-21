// A shared secret baked into the client app. This is NOT strong security -
// anyone who extracts it from the installed app could call the API directly
// - it's a basic deterrent, not a substitute for the daily cap in
// rateLimit.js, which is the real protection against a runaway bill.
const APP_SHARED_SECRET = process.env.APP_SHARED_SECRET;

function requireAppSecret(req, res, next) {
  if (!APP_SHARED_SECRET) {
    // Misconfiguration - fail closed, not open.
    return res.status(500).json({ error: 'Server is missing APP_SHARED_SECRET' });
  }

  const header = req.get('authorization') || '';
  const token = header.startsWith('Bearer ') ? header.slice(7) : null;

  if (token !== APP_SHARED_SECRET) {
    return res.status(401).json({ error: 'Invalid or missing app secret' });
  }

  next();
}

module.exports = { requireAppSecret };
