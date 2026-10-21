const express = require('express');
const { fetchFishAudioBuffer } = require('../services/tts');

const router = express.Router();

router.post('/tts', async (req, res) => {
  try {
    const { text } = req.body;
    if (!text) return res.status(400).json({ error: 'text is required' });

    const buffer = await fetchFishAudioBuffer(text);
    res.json({ audioBase64: buffer.toString('base64'), mimeType: 'audio/mpeg' });
  } catch (err) {
    console.error('[/v1/tts] error:', err.message);
    // 502 (not 500) so the client's existing fallback-to-local-voice logic
    // treats this the same way it already treats a failed direct call.
    res.status(502).json({ error: err.message });
  }
});

module.exports = router;
