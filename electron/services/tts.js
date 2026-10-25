const say = require('say');
const { callBackend } = require('./backendClient');

// Fish Audio TTS now goes through Say.so's hosted backend instead of calling
// Fish Audio directly - no FISH_API_KEY needed on this machine anymore. See
// backend/src/services/tts.js for the actual Fish Audio call (same voice,
// same [bracket] emotion-tag support, same low-latency setting).
//
// speakLocally() below is still the safety net if the backend/Fish Audio is
// ever slow, rate-limited, or unreachable - that fallback stays entirely
// local (OS voice), so it doesn't depend on the backend at all.
async function fetchFishAudioBuffer(text) {
  const { audioBase64 } = await callBackend('/v1/tts', { text }, { timeoutMs: 20000 });
  return Buffer.from(audioBase64, 'base64');
}

// Plays through the OS's built-in voice (Windows SAPI / macOS `say` / espeak
// on Linux) directly - free, offline, zero API calls. No audio buffer comes
// back from this, so the pill can't be voice-reactive during this fallback.
// The OS voice doesn't understand Fish Audio's [bracket] emotion tags, so
// strip them rather than reading them aloud literally.
let localSpeechInterrupted = false;

function speakLocally(text) {
  localSpeechInterrupted = false;
  const plainText = text.replace(/\[[^\]]*\]/g, '').replace(/\s+/g, ' ').trim();
  return new Promise((resolve, reject) => {
    say.speak(plainText, null, 1.0, (err) => {
      // say.stop() below makes the underlying process exit early, which
      // surfaces here as an error - that's an intentional interruption
      // (barge-in), not a real failure, so resolve normally instead.
      if (err && !localSpeechInterrupted) reject(err);
      else resolve();
    });
  });
}

// Called when the user starts talking while the local voice is speaking.
// Harmless no-op if nothing is currently playing via `say`.
function interruptLocalSpeech() {
  localSpeechInterrupted = true;
  try {
    say.stop();
  } catch (err) {
    console.warn('say.stop() failed (probably nothing was playing):', err.message);
  }
}

module.exports = { fetchFishAudioBuffer, speakLocally, interruptLocalSpeech };
