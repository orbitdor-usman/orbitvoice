const { contextBridge, ipcRenderer } = require('electron');

const allowedStateEvents = ['app-state', 'toggle-recording'];

contextBridge.exposeInMainWorld('voiceToText', {
  getSettings: () => ipcRenderer.invoke('settings:get'),
  getAppInfo: () => ipcRenderer.invoke('app:info'),
  openProductLink: (name) => ipcRenderer.invoke('app:open-link', name),
  checkForUpdates: () => ipcRenderer.invoke('app:check-updates'),
  recordingProgress: (id, progress) => ipcRenderer.send('widget:progress', { id, progress }),
  updateSettings: (patch) => ipcRenderer.invoke('settings:update', patch),
  getPermissionStatus: () => ipcRenderer.invoke('permission:status'),
  setEnabled: (enabled) => ipcRenderer.invoke('app:set-enabled', Boolean(enabled)),
  showFloating: () => ipcRenderer.invoke('widget:show'),
  hideFloating: () => ipcRenderer.invoke('widget:hide'),
  toggleRecording: () => ipcRenderer.send('widget:toggle-request'),
  recordingState: (state, message, engine) => ipcRenderer.send('widget:recording-state', { state, message, engine }),
  beginDictation: () => ipcRenderer.invoke('dictation:begin'),
  cancelDictation: (id) => ipcRenderer.invoke('dictation:cancel', id),
  insertText: (text, id) => ipcRenderer.invoke('text:insert', { text, id }),
  enhanceText: (text, id) => ipcRenderer.invoke('speech:enhance', { text, id }),
  dragWidget: (phase) => ipcRenderer.send('widget:drag', phase),
  validateApiKey: () => ipcRenderer.invoke('speech:validate-key'),
  onAppState: (callback) => {
    const handler = (_event, state) => callback(state);
    ipcRenderer.on('app-state', handler);
    return () => ipcRenderer.removeListener('app-state', handler);
  },
  onToggleRecording: (callback) => {
    const handler = () => callback();
    ipcRenderer.on('toggle-recording', handler);
    return () => ipcRenderer.removeListener('toggle-recording', handler);
  },
  isElectron: true,
  allowedStateEvents
});
