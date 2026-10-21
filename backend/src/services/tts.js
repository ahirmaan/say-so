const FISH_API_KEY = process.env.FISH_API_KEY;

// "Sarah" - see electron/services/tts.js for how this voice was picked.
const VOICE_REFERENCE_ID = '933563129e564b19a115bedd57b7406a';

async function fetchFishAudioBuffer(text) {
  if (!FISH_API_KEY) throw new Error('FISH_API_KEY is not set on the server');

  const res = await fetch('https://api.fish.audio/v1/tts', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${FISH_API_KEY}`,
      'Content-Type': 'application/json',
      model: 's2.1-pro-free',
    },
    body: JSON.stringify({
      text,
      reference_id: VOICE_REFERENCE_ID,
      format: 'mp3',
      mp3_bitrate: 128,
      latency: 'low',
    }),
    signal: AbortSignal.timeout(10000),
  });

  if (!res.ok) {
    throw new Error(`Fish Audio TTS failed: ${res.status} ${await res.text()}`);
  }

  const arrayBuffer = await res.arrayBuffer();
  return Buffer.from(arrayBuffer);
}

module.exports = { fetchFishAudioBuffer };
