const express = require('express');
const { classifyAndRespond, parseFolderAnswer, parseYesNo } = require('../services/llm');

const router = express.Router();

router.post('/classify', async (req, res) => {
  try {
    const { transcript, folders, recentFacts, conversationHistory } = req.body;
    if (!transcript) return res.status(400).json({ error: 'transcript is required' });
    res.json(await classifyAndRespond(transcript, folders || [], recentFacts || [], conversationHistory || []));
  } catch (err) {
    console.error('[/v1/classify] error:', err.message);
    res.status(502).json({ error: err.message });
  }
});

router.post('/parse-folder-answer', async (req, res) => {
  try {
    const { answerTranscript, folders } = req.body;
    if (!answerTranscript) return res.status(400).json({ error: 'answerTranscript is required' });
    res.json(await parseFolderAnswer(answerTranscript, folders || []));
  } catch (err) {
    console.error('[/v1/parse-folder-answer] error:', err.message);
    res.status(502).json({ error: err.message });
  }
});

router.post('/parse-yes-no', async (req, res) => {
  try {
    const { answerTranscript } = req.body;
    if (!answerTranscript) return res.status(400).json({ error: 'answerTranscript is required' });
    const affirmative = await parseYesNo(answerTranscript);
    res.json({ affirmative });
  } catch (err) {
    console.error('[/v1/parse-yes-no] error:', err.message);
    res.status(502).json({ error: err.message });
  }
});

module.exports = router;
