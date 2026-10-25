// override: true makes .env win over any pre-existing OS-level environment
// variable of the same name - without this, a stale system/user env var
// (e.g. set once by mistake, or left over from something else) would
// silently and permanently shadow whatever's actually written in .env.
require('dotenv').config({ override: true });
const path = require('node:path');
const fs = require('node:fs');
const {
  app,
  BrowserWindow,
  ipcMain,
  screen,
  session,
  Tray,
  Menu,
  nativeImage,
  dialog,
} = require('electron');

const {
  initDb,
  listFolders,
  listFoldersWithCounts,
  getFolder,
  createFolder,
  renameFolder,
  deleteFolder,
  setFolderIcon,
  setFolderDescription,
  recentFactsForFolder,
  createFact,
  listFacts,
  getFact,
  updateFactContent,
  setFactFavorite,
  moveFact,
  deleteFact,
  bulkMove,
  bulkFavorite,
  bulkDelete,
  listActivity,
  getOverviewStats,
} = require('./db');
const { transcribeAudio } = require('./services/stt');
const { fetchFishAudioBuffer, speakLocally, interruptLocalSpeech } = require('./services/tts');
const { classifyAndRespond, parseFolderAnswer, parseYesNo } = require('./services/llm');
const { watchHotkey } = require('./hotkey');

// Recording/playback here is triggered by a global OS-level key hook, not a
// real DOM click - Chromium's autoplay policy would otherwise silently block
// both the TTS <audio> playback and the AudioContext behind the waveform.
app.commandLine.appendSwitch('autoplay-policy', 'no-user-gesture-required');

let pillWindow;
let dashboardWindow;
let tray;
let appState = 'idle'; // idle | listening | processing | speaking

let pipelineWatchdog = null; // guards against a hang with no error to catch (e.g. mic capture silently failing)

// While a fact is waiting to be filed and we're mid-conversation about where
// (or whether) to save it, this tracks the fact and which question we're
// waiting on an answer to:
//   'confirm-save-answer' - answered a question, asked "want me to save that?"
//   'which-folder'        - "which folder, or make a new one?"
//   'confirm-new-folder'  - "<name> doesn't exist yet, create it?"
let pendingFact = null; // { content, rawTranscript, folderId?, stage, proposedFolderName? }

let audioFinishedResolve = null;

const PILL_WIDTH = 320;
const PILL_HEIGHT = 104; // tall enough for bars + a 2-line caption; CSS controls how much is visually used
const PILL_TOP_MARGIN = 24;
const HIDE_ANIMATION_MS = 220; // must stay >= the CSS exit-transition duration in pill.css

function setState(state) {
  console.log(`[state] ${appState} -> ${state}`);
  appState = state;
  if (!pillWindow) return;

  if (state === 'listening') pillWindow.show();
  pillWindow.webContents.send('state', state);

  if (state === 'idle') {
    // Let the renderer's exit animation (fade/scale out) actually play
    // before the OS window disappears, instead of vanishing instantly.
    setTimeout(() => {
      if (appState === 'idle' && pillWindow) pillWindow.hide();
    }, HIDE_ANIMATION_MS);
  }
}

function createWindow() {
  const { width } = screen.getPrimaryDisplay().workAreaSize;
  pillWindow = new BrowserWindow({
    width: PILL_WIDTH,
    height: PILL_HEIGHT,
    x: Math.round((width - PILL_WIDTH) / 2),
    y: PILL_TOP_MARGIN,
    frame: false,
    transparent: true,
    alwaysOnTop: true,
    resizable: false,
    skipTaskbar: true,
    hasShadow: false,
    show: false,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
    },
  });
  pillWindow.setVisibleOnAllWorkspaces(true, { visibleOnFullScreen: true });

  // Deliberately NOT using win.setBackgroundMaterial('acrylic') here: it
  // paints Windows' translucent backdrop across the whole rectangular
  // window at the OS compositor level, which overrides this window's own
  // transparent-background rounded-pill shape - confirmed this is exactly
  // what was turning the pill into a rectangle. The CSS glass look in
  // pill.css is the real deal here, not a fallback.
  pillWindow.loadFile(path.join(__dirname, '..', 'renderer', 'index.html'));
  pillWindow.webContents.on('console-message', (_event, _level, message) => {
    console.log(`[pill renderer] ${message}`);
  });
}

function openDashboard() {
  if (dashboardWindow) {
    dashboardWindow.focus();
    return;
  }
  dashboardWindow = new BrowserWindow({
    width: 1360,
    height: 860,
    minWidth: 860,
    minHeight: 560,
    title: 'Say.so',
    backgroundColor: '#0B0D12',
    webPreferences: {
      preload: path.join(__dirname, 'preload-dashboard.js'),
      contextIsolation: true,
      nodeIntegration: false,
    },
  });
  dashboardWindow.loadFile(path.join(__dirname, '..', 'dashboard-ui', 'dist', 'index.html'));
  dashboardWindow.webContents.on('console-message', (_event, _level, message) => {
    console.log(`[dashboard renderer] ${message}`);
  });
  dashboardWindow.on('closed', () => {
    dashboardWindow = null;
  });
}

function createTray() {
  const icon = nativeImage.createFromPath(path.join(__dirname, '..', 'assets', 'tray-icon.png'));
  tray = new Tray(icon);
  tray.setToolTip('Say.so');
  tray.setContextMenu(
    Menu.buildFromTemplate([
      { label: 'Open Dashboard', click: openDashboard },
      { type: 'separator' },
      { label: 'Quit Say.so', click: () => app.quit() },
    ])
  );
  tray.on('double-click', openDashboard);
}

// --- Recording state machine ----------------------------------------------
//
// One tap (or hold) of the hotkey starts listening - holding isn't required,
// and releasing the key does nothing special. The renderer watches the
// mic's live volume (the same data driving the waveform) and automatically
// requests a stop once it detects you've gone quiet for a bit (see pill.js's
// voice-activity detection). Pressing the hotkey again at any point while
// listening is a manual "stop now" override, for cutting it short.

function beginRecording() {
  setState('listening');
  pillWindow.webContents.send('begin-recording');
}

function stopRecordingAndProcess() {
  setState('processing');
  pillWindow.webContents.send('end-recording');

  // If the renderer never manages to stop the recorder and hand back audio
  // (e.g. mic capture failed silently), don't leave the pill stuck forever.
  pipelineWatchdog = setTimeout(() => {
    console.error('No audio received within 20s of end-recording - resetting.');
    pendingFact = null;
    setState('idle');
  }, 20000);
}

function onComboDown() {
  console.log(`[combo] down (appState=${appState})`);
  if (appState === 'idle') {
    beginRecording();
  } else if (appState === 'listening') {
    stopRecordingAndProcess(); // manual override - stop early
  }
  // processing/speaking: ignore
}

function onComboUp() {
  // Release no longer ends anything - auto-stop (voice-activity detection)
  // or a second press (onComboDown above) handles that now.
}

ipcMain.on('request-stop', () => {
  // The renderer's own voice-activity detection thinks you've stopped
  // talking and is asking to end the recording - same effect as a manual
  // second press, just triggered automatically.
  if (appState === 'listening') stopRecordingAndProcess();
});

ipcMain.on('submit-audio', (_event, payload) => {
  if (pipelineWatchdog) {
    clearTimeout(pipelineWatchdog);
    pipelineWatchdog = null;
  }
  handleAudio(payload).catch(async (err) => {
    console.error('Pipeline error:', err);
    pendingFact = null;
    await speak('[apologetic] Sorry, something went wrong. Please try again.');
    setState('idle');
  });
});

ipcMain.on('audio-playback-finished', () => {
  if (audioFinishedResolve) {
    const resolve = audioFinishedResolve;
    audioFinishedResolve = null;
    resolve();
  }
});

// Renderer detected the user talking over the TTS (see pill.js's barge-in
// watch). Stop whichever voice is actually playing - interruptLocalSpeech()
// is a harmless no-op if the Fish Audio <audio> path is what's active, and
// the renderer already paused that itself before sending this - then let
// speak() resolve exactly as if playback had finished normally, so whatever
// was going to happen next (e.g. listening for a pending question's answer)
// still happens.
ipcMain.on('barge-in', () => {
  if (appState !== 'speaking') return;
  console.log('[barge-in] user started talking - interrupting playback');
  interruptLocalSpeech();
  if (audioFinishedResolve) {
    const resolve = audioFinishedResolve;
    audioFinishedResolve = null;
    resolve();
  }
});

function waitForAudioPlaybackFinished() {
  return new Promise((resolve) => {
    audioFinishedResolve = resolve;
  });
}

async function handleAudio({ base64, mimeType }) {
  const buffer = Buffer.from(base64, 'base64');

  if (pendingFact?.stage === 'confirm-new-folder') {
    await handleNewFolderConfirmation(buffer, mimeType);
  } else if (pendingFact?.stage === 'which-folder') {
    await handleFolderAnswer(buffer, mimeType);
  } else if (pendingFact?.stage === 'confirm-save-answer') {
    await handleConfirmSaveAnswer(buffer, mimeType);
  } else {
    await handleNewUtterance(buffer, mimeType);
  }
}

// The entry point for every fresh utterance (not a reply to a pending
// question). Figures out whether this is a fact to save outright, a genuine
// question to answer conversationally, or just chat - see
// services/llm.js's classifyAndRespond for the full reasoning.
async function handleNewUtterance(buffer, mimeType) {
  const transcript = await transcribeAudio(buffer, mimeType);
  const folders = listFolders().map((f) => ({
    ...f,
    recentFacts: recentFactsForFolder(f.id).map((r) => r.content),
  }));
  // Separate from the per-folder recentFacts above (which helps route NEW
  // facts) - this is a flat cross-folder list so "edit_fact" has something
  // to match a correction against (e.g. "change DevFast to DevFest").
  const recentFacts = listFacts({ sort: 'recent_updated', limit: 30 }).rows.map((f) => ({
    id: f.id,
    content: f.content,
    folder_name: f.folder_name,
  }));

  const { intent, response, fact, folderId, editTargetId, editNewValue } = await classifyAndRespond(
    transcript,
    folders,
    recentFacts
  );

  if (intent === 'save_fact') {
    if (folderId) {
      await saveFactAndConfirm({ content: fact, rawTranscript: transcript, folderId });
      setState('idle');
    } else {
      pendingFact = { content: fact, rawTranscript: transcript, stage: 'which-folder' };
      await speak('[curious] Which folder should this go in, or should I make a new one?');
      beginRecording();
    }
    return;
  }

  if (intent === 'edit_folder') {
    const folder = renameFolder(editTargetId, editNewValue);
    await speak(`[warm] Got it — renamed to ${folder.name}.`);
    setState('idle');
    return;
  }

  if (intent === 'edit_fact') {
    const updated = updateFactContent(editTargetId, editNewValue);
    await speak(`[warm] Updated — it now says: ${updated.content}`);
    setState('idle');
    return;
  }

  // "question" or "chat" - answer conversationally. If there's a candidate
  // fact worth remembering (and the user didn't say not to save it), ask
  // once, in the same breath as the answer, rather than a separate TTS call.
  if (!response) {
    setState('idle');
    return;
  }

  if (fact) {
    pendingFact = { content: fact, rawTranscript: transcript, folderId, stage: 'confirm-save-answer' };
    await speak(`[warm] ${response} [curious] Want me to save that as a fact?`);
    beginRecording();
  } else {
    await speak(`[warm] ${response}`);
    setState('idle');
  }
}

// They've answered yes/no to "want me to save that as a fact?" after a
// conversational answer.
async function handleConfirmSaveAnswer(buffer, mimeType) {
  const answerTranscript = await transcribeAudio(buffer, mimeType);
  const confirmed = await parseYesNo(answerTranscript);
  const { content, rawTranscript, folderId } = pendingFact;

  if (!confirmed) {
    pendingFact = null;
    await speak('[friendly] No problem, not saving that.');
    setState('idle');
    return;
  }

  if (folderId) {
    pendingFact = null;
    await saveFactAndConfirm({ content, rawTranscript, folderId });
    setState('idle');
  } else {
    pendingFact.stage = 'which-folder';
    await speak('[curious] Which folder should this go in, or should I make a new one?');
    beginRecording();
  }
}

// They've answered "which folder" - either an existing one (saves right
// away) or a new name (asks for confirmation before actually creating it).
async function handleFolderAnswer(buffer, mimeType) {
  const answerTranscript = await transcribeAudio(buffer, mimeType);
  const folders = listFolders();
  const decision = await parseFolderAnswer(answerTranscript, folders);

  if (decision.action === 'use_existing') {
    const folder = getFolder(decision.folderId);
    const { content, rawTranscript } = pendingFact;
    pendingFact = null;
    await saveFactAndConfirm({ content, rawTranscript, folderId: folder.id });
    setState('idle');
    return;
  }

  const proposedName = decision.folderName || answerTranscript.trim().slice(0, 40);
  pendingFact.stage = 'confirm-new-folder';
  pendingFact.proposedFolderName = proposedName;
  await speak(`[curious][friendly] ${proposedName} doesn't exist yet. Want me to create it?`);
  beginRecording();
}

// They've answered yes/no to "want me to create <name>?"
async function handleNewFolderConfirmation(buffer, mimeType) {
  const answerTranscript = await transcribeAudio(buffer, mimeType);
  const confirmed = await parseYesNo(answerTranscript);

  if (confirmed) {
    const folder = createFolder(pendingFact.proposedFolderName);
    const { content, rawTranscript } = pendingFact;
    pendingFact = null;
    await saveFactAndConfirm({ content, rawTranscript, folderId: folder.id });
    setState('idle');
  } else {
    pendingFact.stage = 'which-folder';
    pendingFact.proposedFolderName = null;
    await speak('[friendly] No problem - which folder should this go in, then?');
    beginRecording();
  }
}

async function saveFactAndConfirm({ content, rawTranscript, folderId }) {
  const folder = getFolder(folderId);
  createFact({ content, rawTranscript, folderId });
  await speak(`[warm][happy] Saved to ${folder.name}: ${content}`);
}

// Fish Audio (free tier) first, with the OS's own voice as a fallback if
// Fish Audio errors, rate-limits, or is unreachable - never block the demo
// on a third-party TTS hiccup.
async function speak(text) {
  setState('processing');

  let buffer = null;
  try {
    buffer = await fetchFishAudioBuffer(text);
  } catch (err) {
    console.warn('Fish Audio TTS unavailable, falling back to local voice:', err.message);
  }

  setState('speaking');

  // Caption shows what Say.so is SAYING, not what you said - strip the
  // [bracket] emotion tags, they're delivery instructions for the TTS, not
  // part of the actual sentence.
  const captionText = text.replace(/\[[^\]]*\]/g, '').replace(/\s+/g, ' ').trim();
  pillWindow.webContents.send('transcript', captionText);

  if (buffer) {
    pillWindow.webContents.send('play-audio', {
      base64: buffer.toString('base64'),
      mimeType: 'audio/mpeg',
    });
    await waitForAudioPlaybackFinished();
  } else {
    pillWindow.webContents.send('speaking-local');
    await speakLocally(text);
  }
}

// --- Dashboard IPC ---------------------------------------------------------
//
// Purely additive to the voice-assistant pipeline above - the dashboard
// window is a separate renderer with its own preload (preload-dashboard.js)
// and never touches recording/hotkey state.
ipcMain.handle('dashboard:get-overview-stats', () => getOverviewStats());
ipcMain.handle('dashboard:list-folders', () => listFoldersWithCounts());
ipcMain.handle('dashboard:create-folder', (_e, { name, icon, description }) =>
  createFolder(name, { icon, description })
);
ipcMain.handle('dashboard:set-folder-description', (_e, { id, description }) =>
  setFolderDescription(id, description)
);
ipcMain.handle('dashboard:rename-folder', (_e, { id, name }) => renameFolder(id, name));
ipcMain.handle('dashboard:delete-folder', (_e, { id }) => deleteFolder(id));
ipcMain.handle('dashboard:set-folder-icon', (_e, { id, icon }) => setFolderIcon(id, icon));

ipcMain.handle('dashboard:list-facts', (_e, opts) => listFacts(opts));
ipcMain.handle('dashboard:get-fact', (_e, { id }) => getFact(id));
ipcMain.handle('dashboard:update-fact-content', (_e, { id, content }) => updateFactContent(id, content));
ipcMain.handle('dashboard:set-fact-favorite', (_e, { id, favorite }) => setFactFavorite(id, favorite));
ipcMain.handle('dashboard:move-fact', (_e, { id, folderId }) => moveFact(id, folderId));
ipcMain.handle('dashboard:delete-fact', (_e, { id }) => deleteFact(id));

ipcMain.handle('dashboard:bulk-move', (_e, { ids, folderId }) => bulkMove(ids, folderId));
ipcMain.handle('dashboard:bulk-favorite', (_e, { ids, favorite }) => bulkFavorite(ids, favorite));
ipcMain.handle('dashboard:bulk-delete', (_e, { ids }) => bulkDelete(ids));

ipcMain.handle('dashboard:list-activity', (_e, { limit } = {}) => listActivity(limit));

ipcMain.handle('dashboard:get-app-info', () => ({
  version: app.getVersion(),
  dbPath: path.join(__dirname, '..', 'data', 'sayso.db'),
}));

// Real export, not a stub: writes every folder and fact to a JSON file the
// user picks via a native save dialog.
ipcMain.handle('dashboard:export-data', async () => {
  const { canceled, filePath } = await dialog.showSaveDialog({
    title: 'Export Say.so data',
    defaultPath: `sayso-export-${new Date().toISOString().slice(0, 10)}.json`,
    filters: [{ name: 'JSON', extensions: ['json'] }],
  });
  if (canceled || !filePath) return { exported: false };

  const exportData = {
    exportedAt: new Date().toISOString(),
    folders: listFoldersWithCounts(),
    facts: listFacts({ limit: 1000000 }).rows,
  };
  fs.writeFileSync(filePath, JSON.stringify(exportData, null, 2));
  return { exported: true, filePath };
});

app.whenReady().then(() => {
  initDb();
  createWindow();
  createTray();

  session.defaultSession.setPermissionRequestHandler((_webContents, permission, callback) => {
    callback(permission === 'media');
  });

  const stopWatching = watchHotkey(process.env.SAYSO_HOTKEY || 'F9', {
    onComboDown,
    onComboUp,
  });

  app.on('will-quit', stopWatching);
});

app.on('window-all-closed', () => {
  app.quit();
});
