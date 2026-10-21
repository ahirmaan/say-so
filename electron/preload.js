const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('sayso', {
  onState: (callback) => ipcRenderer.on('state', (_event, state) => callback(state)),
  onBeginRecording: (callback) => ipcRenderer.on('begin-recording', () => callback()),
  onEndRecording: (callback) => ipcRenderer.on('end-recording', () => callback()),
  onTranscript: (callback) =>
    ipcRenderer.on('transcript', (_event, text) => callback(text)),
  onPlayAudio: (callback) =>
    ipcRenderer.on('play-audio', (_event, payload) => callback(payload)),
  onSpeakingLocal: (callback) => ipcRenderer.on('speaking-local', () => callback()),
  submitAudio: (payload) => ipcRenderer.send('submit-audio', payload),
  audioPlaybackFinished: () => ipcRenderer.send('audio-playback-finished'),
  requestStop: () => ipcRenderer.send('request-stop'),
  bargeIn: () => ipcRenderer.send('barge-in'),
});
