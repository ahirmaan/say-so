const OPENROUTER_API_KEY = process.env.OPENROUTER_API_KEY;
const MODEL = 'anthropic/claude-haiku-5.5';

async function callClaude(systemPrompt, userPrompt) {
  if (!OPENROUTER_API_KEY) throw new Error('OPENROUTER_API_KEY is not set on the server');

  const res = await fetch('https://openrouter.ai/api/v1/chat/completions', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${OPENROUTER_API_KEY}`,
      'content-type': 'application/json',
      'HTTP-Referer': 'https://github.com/sayso-app',
      'X-Title': 'Say.so',
    },
    body: JSON.stringify({
      model: MODEL,
      max_tokens: 1200,
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt },
      ],
    }),
    signal: AbortSignal.timeout(15000),
  });

  if (!res.ok) {
    throw new Error(`OpenRouter call failed: ${res.status} ${await res.text()}`);
  }

  const data = await res.json();
  const text = data.choices?.[0]?.message?.content ?? '';
  return extractJson(text);
}

function extractJson(text) {
  const match = text.match(/\{[\s\S]*\}/);
  if (!match) throw new Error(`No JSON found in model output: ${text}`);
  return JSON.parse(match[0]);
}

// See electron/services/llm.js (the original, client-side version this was
// moved from) for the full reasoning behind this prompt.
//
// `recentFacts` (optional) is a flat list of {id, content, folder_name} for
// recently added/updated facts across ALL folders - separate from each
// folder's own `recentFacts` (used for save_fact's folder-routing decision).
// It exists so "edit_fact" has something to match a correction against.
async function classifyAndRespond(transcript, folders, recentFacts = []) {
  const system = `You are Say.so, a voice assistant with several jobs depending on what the user says:

1. SAVE: they're directly telling you something to remember (a plain statement, or "remember that...", "save this...") - intent "save_fact". Clean the transcript into a clear, storable fact (strip filler words, false starts, "um"/"uh", meta-instructions like "save this to Say.so"), and decide which existing folder it belongs in.

2. EDIT A FOLDER NAME: "change X to Y", "rename X to Y", "it should be called Y, not X" - where X clearly refers to an EXISTING FOLDER's name (check the folder list below, allowing for mishearings/typos - e.g. "DevFast" can clearly match a folder actually named "Devfast 2026") - intent "edit_folder". Set edit_target_id to that folder's id, and edit_new_value to the CORRECTED FULL NAME - apply only the specific correction requested and keep the rest of the name as it was (e.g. folder "Devfast 2026" + "change DevFast to DevFest" -> edit_new_value "DevFest 2026", not just "DevFest").

3. EDIT A SAVED FACT: same "change X to Y" shape, but X clearly refers to the CONTENT of something already saved (check the recent facts list below), not a folder name - intent "edit_fact". Set edit_target_id to that fact's id, edit_new_value to the corrected fact content, applying only the specific correction and keeping the rest as it was.

   If a "change X to Y" request doesn't clearly match either an existing folder name or a recent fact, don't guess - use intent "chat" and ask out loud (in "response") which one they mean.

4. QUESTION: a genuine question wanting an actual answer ("who is...", "what is...", "how does...", "tell me about...") - intent "question". Answer it helpfully and conversationally from your own knowledge, in 2-4 short spoken sentences (this will be read aloud by text-to-speech, so keep it natural-sounding, not a bulleted list). If you don't know or it's about very recent events past your knowledge, say so honestly rather than guessing. Also produce a short candidate "fact" capturing the gist of your answer, in case the user wants it saved - unless they explicitly say not to save it (e.g. "just curious", "don't save this"), in which case fact must be null.

5. CHAT: anything else (greetings, unclear, chit-chat) - intent "chat". Reply naturally and briefly; fact should usually be null unless there's something clearly worth offering to remember.

Folder rules (for save_fact's fact, and question/chat's candidate fact):
- If it clearly matches the topic of exactly one existing folder (by name and by the kind of facts already in it), set folder_id to that folder's id.
- If it's ambiguous, could fit multiple folders, fits none well, or fact is null, set folder_id to null.
- Always explain your folder decision in one short sentence.

Respond with ONLY a JSON object:
{"intent": "save_fact"|"edit_folder"|"edit_fact"|"question"|"chat", "response": string|null, "fact": string|null, "folder_id": number|null, "edit_target_id": number|null, "edit_new_value": string|null, "reasoning": string}

"response" is the spoken reply for "question"/"chat" (null otherwise). "fact" is the clean/candidate fact for save_fact/question/chat (null for edit_folder/edit_fact). "edit_target_id"/"edit_new_value" are only for edit_folder/edit_fact (null otherwise).`;

  const foldersDescription = folders.length
    ? folders
        .map(
          (f) =>
            `- id=${f.id} name="${f.name}"${
              f.recentFacts && f.recentFacts.length
                ? `, recent facts: ${f.recentFacts.map((x) => `"${x}"`).join('; ')}`
                : ' (empty)'
            }`
        )
        .join('\n')
    : '(no folders exist yet)';

  const recentFactsDescription = recentFacts.length
    ? recentFacts.map((f) => `- id=${f.id} folder="${f.folder_name}" content="${f.content}"`).join('\n')
    : '(no facts saved yet)';

  const user = `Existing folders:\n${foldersDescription}\n\nRecently saved facts (for matching edit_fact corrections against):\n${recentFactsDescription}\n\nRaw transcript:\n"${transcript}"`;

  const result = await callClaude(system, user);
  console.log(
    `[classify] intent=${result.intent} fact=${JSON.stringify(result.fact)} folder_id=${result.folder_id} edit_target_id=${result.edit_target_id} edit_new_value=${JSON.stringify(result.edit_new_value)} (${result.reasoning})`
  );

  return {
    intent: result.intent,
    response: result.response ?? null,
    fact: result.fact ?? null,
    folderId: result.folder_id ?? null,
    editTargetId: result.edit_target_id ?? null,
    editNewValue: result.edit_new_value ?? null,
  };
}

async function parseFolderAnswer(answerTranscript, folders) {
  const system = `The user was asked which folder a fact should go in, or whether to make a new one. Interpret their spoken answer.

Respond with ONLY a JSON object:
- If they named an existing folder: {"action": "use_existing", "folder_id": number}
- If they want a new folder: {"action": "create_new", "folder_name": string}`;

  const foldersDescription = folders.map((f) => `- id=${f.id} name="${f.name}"`).join('\n');
  const user = `Existing folders:\n${foldersDescription}\n\nUser's answer:\n"${answerTranscript}"`;

  const result = await callClaude(system, user);
  console.log(`[folder routing] answer="${answerTranscript}" -> ${JSON.stringify(result)}`);

  return {
    action: result.action,
    folderId: result.folder_id,
    folderName: result.folder_name,
  };
}

async function parseYesNo(answerTranscript) {
  const system = `The user was asked a yes/no question out loud and gave a short spoken reply. Decide whether they mean yes or no.

Respond with ONLY a JSON object: {"affirmative": true|false}`;

  const result = await callClaude(system, `Their reply: "${answerTranscript}"`);
  console.log(`[yes/no] "${answerTranscript}" -> affirmative=${result.affirmative}`);
  return Boolean(result.affirmative);
}

module.exports = { classifyAndRespond, parseFolderAnswer, parseYesNo };
