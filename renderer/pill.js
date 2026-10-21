const pill = document.getElementById('pill');
const player = document.getElementById('player');
const bars = Array.from(document.querySelectorAll('#bars span'));
const captionEl = document.getElementById('caption');

let mediaStream = null;
let mediaRecorder = null;
let chunks = [];

let audioCtx = null;
let micAnalyser = null; // small fftSize, drives the visual bars
let vadAnalyser = null; // larger fftSize, drives silence detection (separate node so bar tuning and VAD tuning don't fight each other)
let playbackAnalyser = null;
let playbackSourceConnected = false;
let rafId = null;

function getAudioContext() {
  if (!audioCtx) audioCtx = new AudioContext();
  return audioCtx;
}

const STATE_CLASSES = ['idle', 'listening', 'processing', 'speaking'];

function setVisualState(state) {
  STATE_CLASSES.forEach((c) => pill.classList.remove(c));
  pill.classList.add(state);
  if (state !== 'speaking') pill.classList.remove('speaking-local');
  if (state === 'idle') pill.classList.remove('has-caption');

  // Whatever loop was running (listening VAD, playback bars + barge-in
  // watch, or the local-voice barge-in-only watch) belongs to the state
  // being left. 'listening'/'speaking' immediately start their own loop
  // right after this via startRecording()/onPlayAudio/onSpeakingLocal, so
  // this mainly matters for the case this safety net exists for: barge-in
  // pausing playback early (which doesn't fire the <audio> 'ended' event)
  // followed directly by 'idle' rather than a new recording - without this,
  // that loop would otherwise keep running forever.
  if (state !== 'speaking') stopBarLoop();
}

function arrayBufferToBase64(buffer) {
  let binary = '';
  const bytes = new Uint8Array(buffer);
  const chunkSize = 0x8000;
  for (let i = 0; i < bytes.length; i += chunkSize) {
    binary += String.fromCharCode.apply(null, bytes.subarray(i, i + chunkSize));
  }
  return btoa(binary);
}

async function ensureStream() {
  if (!mediaStream) {
    console.log('[pill] requesting microphone via getUserMedia...');
    mediaStream = await navigator.mediaDevices.getUserMedia({ audio: true });
    console.log(
      '[pill] getUserMedia resolved, audio tracks:',
      mediaStream.getAudioTracks().map((t) => t.label || '(unlabeled)').join(', ') || '(none)'
    );
    const ctx = getAudioContext();
    const source = ctx.createMediaStreamSource(mediaStream);

    micAnalyser = ctx.createAnalyser();
    micAnalyser.fftSize = 64;
    source.connect(micAnalyser);

    vadAnalyser = ctx.createAnalyser();
    vadAnalyser.fftSize = 512;
    source.connect(vadAnalyser);
  }
  return mediaStream;
}

function ensurePlaybackAnalyser() {
  if (!playbackAnalyser) {
    const ctx = getAudioContext();
    playbackAnalyser = ctx.createAnalyser();
    playbackAnalyser.fftSize = 64;
  }
  if (!playbackSourceConnected) {
    const ctx = getAudioContext();
    const source = ctx.createMediaElementSource(player);
    source.connect(playbackAnalyser);
    playbackAnalyser.connect(ctx.destination);
    playbackSourceConnected = true;
  }
}

// Picks a handful of frequency bins spread across the spectrum and renders
// them as bar heights - a rough-but-lively equalizer, not a precise one.
const BAR_BIN_INDICES = [2, 5, 9, 14, 20];

function renderBars(analyser) {
  const data = new Uint8Array(analyser.frequencyBinCount);
  analyser.getByteFrequencyData(data);
  BAR_BIN_INDICES.forEach((binIndex, i) => {
    const value = data[Math.min(binIndex, data.length - 1)] / 255; // 0..1
    const height = 6 + value * 22; // 6px..28px
    bars[i].style.height = `${height}px`;
  });
}

// --- Voice-activity detection (auto-stop on silence) -----------------------
//
// Groq's Whisper endpoint only returns a transcript for a complete clip, so
// there's no live/streaming captioning while you talk - but we already have
// live mic volume data for the waveform, which is enough to detect "they've
// gone quiet" and auto-stop without needing a second key press.
const VAD_SILENCE_RMS = 0.045; // below this counts as "quiet" (lower = more forgiving of quieter speech)
const VAD_SILENCE_HOLD_MS = 1900; // how long of continuous quiet before auto-stopping (natural sentences have pauses)
const VAD_ARM_DELAY_MS = 500; // grace period after starting before silence can trigger a stop

let vadSpeechHeard = false;
let vadQuietSince = null;
let vadArmedAt = 0;
let vadStopRequested = false;

function computeRms(analyser) {
  const data = new Uint8Array(analyser.fftSize);
  analyser.getByteTimeDomainData(data);
  let sumSquares = 0;
  for (let i = 0; i < data.length; i++) {
    const normalized = (data[i] - 128) / 128;
    sumSquares += normalized * normalized;
  }
  return Math.sqrt(sumSquares / data.length);
}

function resetVad() {
  vadSpeechHeard = false;
  vadQuietSince = null;
  vadStopRequested = false;
  vadArmedAt = performance.now() + VAD_ARM_DELAY_MS;
}

function checkVad(analyser) {
  if (vadStopRequested) return;
  const now = performance.now();
  if (now < vadArmedAt) return;

  const isSpeaking = computeRms(analyser) > VAD_SILENCE_RMS;

  if (isSpeaking) {
    vadSpeechHeard = true;
    vadQuietSince = null;
    return;
  }

  if (!vadSpeechHeard) return; // hasn't said anything yet - don't auto-stop on startup silence

  if (vadQuietSince === null) {
    vadQuietSince = now;
  } else if (now - vadQuietSince >= VAD_SILENCE_HOLD_MS) {
    vadStopRequested = true;
    console.log('[pill] silence detected - requesting auto-stop');
    window.sayso.requestStop();
  }
}

// --- Barge-in (stop talking when the user starts talking) ------------------
//
// Monitored during 'speaking' using the same mic VAD analyser, not the
// playback analyser. Threshold is deliberately higher than silence-detection
// VAD: without headphones, Say.so's own TTS voice bleeds from the speakers
// back into the mic, and this needs to be clearly louder than that leakage
// to avoid the voice interrupting itself. Headphones make this far more
// reliable.
const BARGE_IN_RMS = 0.12;
const BARGE_IN_HOLD_MS = 220;

let bargeInSince = null;
let bargeInTriggered = false;

function resetBargeIn() {
  bargeInSince = null;
  bargeInTriggered = false;
}

function checkBargeIn(analyser) {
  if (bargeInTriggered || !analyser) return;
  const now = performance.now();
  const isLoud = computeRms(analyser) > BARGE_IN_RMS;

  if (isLoud) {
    if (bargeInSince === null) bargeInSince = now;
    else if (now - bargeInSince >= BARGE_IN_HOLD_MS) {
      bargeInTriggered = true;
      console.log('[pill] barge-in detected - interrupting playback');
      player.pause();
      window.sayso.bargeIn();
    }
  } else {
    bargeInSince = null;
  }
}

function startListeningLoop(barAnalyser, vadAnalyserNode) {
  stopBarLoop();
  resetVad();
  const loop = () => {
    renderBars(barAnalyser);
    checkVad(vadAnalyserNode);
    rafId = requestAnimationFrame(loop);
  };
  rafId = requestAnimationFrame(loop);
}

function startPlaybackLoop(analyser) {
  stopBarLoop();
  resetBargeIn();
  const loop = () => {
    renderBars(analyser);
    checkBargeIn(vadAnalyser);
    rafId = requestAnimationFrame(loop);
  };
  rafId = requestAnimationFrame(loop);
}

// The local OS-voice fallback has no audio buffer to render bars from (CSS
// handles that pulse animation on its own), but barge-in still needs to be
// watched for during it.
function startBargeInOnlyLoop() {
  stopBarLoop();
  resetBargeIn();
  const loop = () => {
    checkBargeIn(vadAnalyser);
    rafId = requestAnimationFrame(loop);
  };
  rafId = requestAnimationFrame(loop);
}

function stopBarLoop() {
  if (rafId !== null) {
    cancelAnimationFrame(rafId);
    rafId = null;
  }
  bars.forEach((bar) => {
    bar.style.height = '';
  });
}

// --- Streaming transcript caption -------------------------------------------

let captionRevealTimer = null;

function revealCaption(text) {
  clearInterval(captionRevealTimer);
  captionEl.textContent = '';
  pill.classList.add('has-caption');

  const words = text.trim().split(/\s+/).filter(Boolean);
  let i = 0;
  captionRevealTimer = setInterval(() => {
    if (i >= words.length) {
      clearInterval(captionRevealTimer);
      return;
    }
    captionEl.textContent += (i === 0 ? '' : ' ') + words[i];
    i++;
  }, 55);
}

function clearCaption() {
  clearInterval(captionRevealTimer);
  captionEl.textContent = '';
  pill.classList.remove('has-caption');
}

async function startRecording() {
  const stream = await ensureStream();
  chunks = [];
  mediaRecorder = new MediaRecorder(stream, { mimeType: 'audio/webm' });
  mediaRecorder.ondataavailable = (e) => {
    if (e.data.size > 0) chunks.push(e.data);
  };
  mediaRecorder.start();
  console.log('[pill] MediaRecorder started, state:', mediaRecorder.state);
  startListeningLoop(micAnalyser, vadAnalyser);
}

async function stopRecording() {
  stopBarLoop();
  if (!mediaRecorder) {
    console.warn('[pill] stopRecording called but mediaRecorder is null - was startRecording ever called?');
    return;
  }
  console.log('[pill] stopping MediaRecorder, state:', mediaRecorder.state);
  const recorder = mediaRecorder;
  const stopped = new Promise((resolve) => {
    recorder.onstop = resolve;
  });
  recorder.stop();
  await stopped;
  console.log('[pill] MediaRecorder stopped, chunks:', chunks.length);

  const blob = new Blob(chunks, { type: 'audio/webm' });
  const arrayBuffer = await blob.arrayBuffer();
  const base64 = arrayBufferToBase64(arrayBuffer);
  console.log('[pill] submitting audio, bytes:', arrayBuffer.byteLength);
  window.sayso.submitAudio({ base64, mimeType: 'audio/webm' });
}

window.sayso.onState(setVisualState);

window.sayso.onBeginRecording(() => {
  clearCaption();
  startRecording().catch((err) => console.error('Failed to start recording:', err));
});

window.sayso.onEndRecording(() => {
  stopRecording().catch((err) => console.error('Failed to stop recording:', err));
});

window.sayso.onTranscript((text) => {
  revealCaption(text);
});

window.sayso.onPlayAudio(({ base64, mimeType }) => {
  ensurePlaybackAnalyser();
  player.src = `data:${mimeType};base64,${base64}`;
  player
    .play()
    .then(() => startPlaybackLoop(playbackAnalyser))
    .catch((err) => console.error('Failed to play audio:', err));
});

window.sayso.onSpeakingLocal(() => {
  // No audio buffer to analyze for the OS-voice fallback - fall back to a
  // generic CSS pulse (see pill.css's #pill.speaking-local rule), but still
  // watch for barge-in.
  pill.classList.add('speaking-local');
  startBargeInOnlyLoop();
});

player.addEventListener('ended', () => {
  stopBarLoop();
  window.sayso.audioPlaybackFinished();
});
