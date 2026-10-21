const { callBackend } = require('./backendClient');

// All fact extraction / folder routing / yes-no parsing now goes through
// Say.so's hosted backend instead of calling OpenRouter directly - no
// OPENROUTER_API_KEY needed on this machine anymore. See
// backend/src/services/llm.js for the actual prompts and Claude call (moved
// there verbatim, so behavior is unchanged - only where the call happens).

async function classifyAndRespond(transcript, folders) {
  return callBackend('/v1/classify', { transcript, folders });
}

async function parseFolderAnswer(answerTranscript, folders) {
  return callBackend('/v1/parse-folder-answer', { answerTranscript, folders });
}

async function parseYesNo(answerTranscript) {
  const { affirmative } = await callBackend('/v1/parse-yes-no', { answerTranscript });
  return affirmative;
}

module.exports = { classifyAndRespond, parseFolderAnswer, parseYesNo };
