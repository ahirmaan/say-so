const express = require('express');
const { transcribeAudio } = require('../services/stt');

const router = express.Router();

router.post('/stt', async (req, res) => {
  try {
    const { audioBase64, mimeType } = req.body;
    if (!audioBase64) return res.status(400).json({ error: 'audioBase64 is required' });

    const buffer = Buffer.from(audioBase64, 'base64');
    const text = await transcribeAudio(buffer, mimeType);
    res.json({ text });
  } catch (err) {
    console.error('[/v1/stt] error:', err.message);
    res.status(502).json({ error: err.message });
  }
});

module.exports = router;
