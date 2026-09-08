require('dotenv').config();
const path = require('path');
const { randomUUID } = require('crypto');
const { app, ipcMain, globalShortcut, systemPreferences, session, screen, shell, net } = require('electron');
const { startServer } = require('../backend/server');
const { readSettings, writeSettings } = require('../backend/config/settings');
const { saveApiKey, readApiKey, hasApiKey } = require('./services/apiKeyStorage');
const { createMainWindow } = require('./windows/mainWindow');
const { createWidgetWindow, clampPosition } = require('./windows/widget');
const { createTray } = require('./tray');
const { captureTarget, pasteIntoFocusedField, shutdownInputHelper, warmInputHelper } = require('./services/textInsertion');
const { links, isNewerVersion } = require('./services/productInfo');
const { enhanceTranscript } = require('../backend/services/textEnhancement');
const { OpenAIWhisperProvider } = require('../backend/services/speechToText');

app.setName('Orbitvoice');
if (process.env.ORBITVOICE_DATA_DIR) app.setPath('userData', process.env.ORBITVOICE_DATA_DIR);
else if (app.isPackaged) app.setPath('userData', path.join(app.getPath('appData'), 'Orbitvoice'));
process.env.APP_DATA_DIR = process.env.ORBITVOICE_DATA_DIR || (app.isPackaged ? app.getPath('userData') : path.join(__dirname, '..', '.runtime-data'));
app.disableHardwareAcceleration();
let rendererUrl = 'http://localhost:3000';
let apiServer, mainWindow, widgetWindow, tray, dictation, drag;
let isQuitting = false;
let cleanupComplete = false;
let appState = { enabled: true, recordingState: 'idle', message: 'Ready', lastTranscript: '', engine: 'Local speech' };

function publishState(patch = {}) {
  appState = { ...appState, ...patch };
  for (const win of [mainWindow, widgetWindow]) if (win && !win.isDestroyed()) win.webContents.send('app-state', appState);
  tray?.updateMenu();
}
function publicSettings() { return { ...readSettings(), apiKeyConfigured: hasApiKey() }; }
function showMainWindow() { if (mainWindow && !mainWindow.isDestroyed()) { mainWindow.show(); mainWindow.focus(); } }
function showWidget() { if (appState.enabled) widgetWindow?.showInactive(); publishState({ floatingVisible: appState.enabled }); }
function hideWidget() { widgetWindow?.hide(); publishState({ floatingVisible: false }); }
function setEnabled(enabled) {
  const settings = writeSettings({ enabled: Boolean(enabled) });
  if (!settings.enabled) { dictation?.abort.abort(); dictation = null; }
  publishState({ enabled: settings.enabled, recordingState: settings.enabled ? 'idle' : 'paused', message: settings.enabled ? 'Ready' : 'Paused' });
  if (settings.enabled && settings.showFloating) showWidget(); else hideWidget();
  return settings;
}
function applyStartupSetting(enabled) {
  if (app.isPackaged && !process.env.ORBITVOICE_DATA_DIR) app.setLoginItemSettings({ openAtLogin: Boolean(enabled), args: ['--hidden'] });
}
function registerShortcut() {
  globalShortcut.unregisterAll();
  let registered = false;
  try { registered = globalShortcut.register(readSettings().shortcut, () => { if (appState.enabled) widgetWindow?.webContents.send('toggle-recording'); }); } catch {}
  publishState({ shortcutAvailable: registered });
}
function trusted(event) {
  const sender = event.sender;
  return [mainWindow, widgetWindow].some(win => win && !win.isDestroyed() && win.webContents === sender) &&
    event.senderFrame === sender.mainFrame && new URL(event.senderFrame.url).origin === rendererUrl;
}
function handle(name, callback) {
  ipcMain.handle(name, (event, ...args) => { if (!trusted(event)) throw new Error('Untrusted application frame'); return callback(event, ...args); });
}
async function createApplication() {
  app.setAppUserModelId('com.orbitdor.orbitvoice');
  if (app.isPackaged) {
    process.env.NODE_ENV = 'production';
    // Own our server instead of loading an older installed app's UI.
    // Keep a stable origin so Chromium microphone device IDs survive restarts.
    const preferredPort = process.env.ORBITVOICE_DATA_DIR ? 0 : readSettings().servicePort;
    try { apiServer = await startServer(preferredPort); }
    catch (error) {
      if (error.code !== 'EADDRINUSE') throw error;
      apiServer = await startServer(0);
    }
    if (!process.env.ORBITVOICE_DATA_DIR) writeSettings({ servicePort: apiServer.address().port });
    rendererUrl = `http://127.0.0.1:${apiServer.address().port}`;
  }
  session.defaultSession.setPermissionRequestHandler((contents, permission, callback, details) => {
    callback(Boolean(contents && new URL(contents.getURL()).origin === rendererUrl && ['media', 'microphone'].includes(permission) && !details?.mediaTypes?.includes('video')));
  });
  session.defaultSession.setPermissionCheckHandler((contents, permission, origin) => Boolean(contents && origin === rendererUrl && ['media', 'microphone'].includes(permission)));
  const settings = publicSettings();
  appState = { ...appState, ...settings, floatingVisible: settings.enabled && settings.showFloating, recordingState: settings.enabled ? 'idle' : 'paused' };
  mainWindow = createMainWindow({ rendererUrl });
  widgetWindow = createWidgetWindow({ rendererUrl, onReady: () => { if (appState.floatingVisible) widgetWindow.showInactive(); publishState(); } });
  mainWindow.webContents.on('did-finish-load', () => publishState());
  for (const win of [mainWindow, widgetWindow]) {
    win.webContents.setWindowOpenHandler(() => ({ action: 'deny' }));
    win.webContents.on('will-navigate', (event, url) => { if (new URL(url).origin !== rendererUrl) event.preventDefault(); });
  }
  mainWindow.on('close', event => {
    if (!isQuitting && readSettings().minimizeToTray) { event.preventDefault(); mainWindow.hide(); }
    else { isQuitting = true; app.quit(); }
  });
  tray = createTray({ iconPath: path.join(__dirname, 'assets', 'orbitvoice.ico'), getEnabled: () => appState.enabled,
    getFloatingVisible: () => appState.floatingVisible, onEnable: () => setEnabled(true), onDisable: () => setEnabled(false),
    onShow: showWidget, onHide: hideWidget, onOpen: showMainWindow, onQuit: () => { isQuitting = true; app.quit(); } });
  applyStartupSetting(settings.startWithWindows);
  registerShortcut();
  warmInputHelper().catch(() => {});
  publishState();
}
handle('settings:get', () => ({ ...publicSettings(), ...appState }));
handle('settings:update', (_event, patch = {}) => {
  const { openaiApiKey, ...settingsPatch } = patch;
  if (openaiApiKey !== undefined) saveApiKey(openaiApiKey);
  const settings = writeSettings(settingsPatch);
  if (settings.enabled !== appState.enabled) setEnabled(settings.enabled);
  publishState({ ...settings, apiKeyConfigured: hasApiKey() });
  if (settings.enabled && settings.showFloating) showWidget(); else hideWidget();
  if (Object.hasOwn(settingsPatch, 'startWithWindows')) applyStartupSetting(settings.startWithWindows);
  if (Object.hasOwn(settingsPatch, 'shortcut')) registerShortcut();
  return publicSettings();
});
handle('app:set-enabled', (_event, enabled) => setEnabled(enabled));
handle('widget:show', () => { showWidget(); return true; });
handle('widget:hide', () => { hideWidget(); return true; });
handle('permission:status', () => process.platform === 'darwin' ? systemPreferences.getMediaAccessStatus('microphone') : 'available');
handle('app:info', () => ({ version: app.getVersion(), platform: process.platform, links }));
handle('app:open-link', async (_event, name) => {
  if (!Object.hasOwn(links, name)) throw new Error('Unknown product link.');
  await shell.openExternal(links[name]);
});
let updateCheck;
handle('app:check-updates', () => {
  if (!updateCheck) updateCheck = (async () => {
    try {
      const response = await net.fetch('https://api.github.com/repos/orbitdor-usman/orbitvoice/releases/latest', {
        headers: { Accept: 'application/vnd.github+json' }, signal: AbortSignal.timeout(10000),
      });
      if (!response.ok) throw new Error('Update service unavailable.');
      const release = await response.json();
      return { current: app.getVersion(), latest: release.tag_name, available: !release.prerelease && !release.draft && isNewerVersion(release.tag_name, app.getVersion()) };
    } catch { throw new Error('Could not check for updates. Check your connection or visit the releases page.'); }
    finally { updateCheck = null; }
  })();
  return updateCheck;
});
handle('dictation:begin', async () => {
  if (!appState.enabled || dictation) throw new Error('Dictation is paused or already running.');
  const current = { id: randomUUID(), abort: new AbortController(), target: null };
  dictation = current;
  publishState({ interimTranscript: '', elapsed: 0, level: 0 });
  try { current.target = await captureTarget(); }
  catch (error) { if (dictation === current) dictation = null; throw error; }
  if (dictation !== current) throw new Error('Dictation cancelled.');
  return current.id;
});
handle('dictation:cancel', (_event, id) => { if (dictation?.id === id) { dictation.abort.abort(); dictation = null; } });
handle('speech:enhance', async (_event, { text, id } = {}) => {
  if (!dictation || dictation.id !== id) throw new Error('Dictation cancelled.');
  if (typeof text !== 'string' || text.length > 20000) throw new Error('Transcript is too long.');
  publishState({ lastTranscript: text, interimTranscript: '' });
  return enhanceTranscript(text, { apiKey: readApiKey(), enabled: readSettings().aiEnhancement, signal: dictation.abort.signal });
});
handle('text:insert', async (_event, { text, id } = {}) => {
  if (typeof text !== 'string' || !text.trim() || text.length > 20000) throw new Error('No valid text to insert.');
  publishState({ lastTranscript: text, interimTranscript: '' });
  if (!dictation || dictation.id !== id || !appState.enabled) throw new Error('Dictation cancelled. Your transcript is available in Overview.');
  const current = dictation;
  try { return await pasteIntoFocusedField(text, current.target, current.abort.signal); }
  finally { if (dictation === current) dictation = null; }
});
handle('speech:validate-key', async () => {
  await new OpenAIWhisperProvider({ apiKey: readApiKey() }).validateKey();
  return { valid: true };
});
ipcMain.on('widget:toggle-request', event => { if (trusted(event) && appState.enabled) widgetWindow?.webContents.send('toggle-recording'); });
ipcMain.on('widget:recording-state', (event, payload) => {
  if (!trusted(event) || event.sender !== widgetWindow?.webContents) return;
  const allowed = new Set(['idle', 'listening', 'recording', 'transcribing', 'processing', 'ai-processing', 'paused', 'permission-required', 'fallback', 'success', 'error']);
  if (allowed.has(payload?.state)) publishState({ recordingState: payload.state, message: String(payload.message || '').slice(0,1000), engine: payload.engine || appState.engine });
});
ipcMain.on('widget:progress', (event, { id, progress } = {}) => {
  if (!trusted(event) || event.sender !== widgetWindow?.webContents || !dictation || dictation.id !== id || !progress) return;
  const patch = {};
  if (typeof progress.interimTranscript === 'string') patch.interimTranscript = progress.interimTranscript.slice(0, 20000);
  if (Number.isFinite(progress.elapsed)) patch.elapsed = Math.max(0, Math.min(60, progress.elapsed));
  if (Number.isFinite(progress.level)) patch.level = Math.max(0, Math.min(1, progress.level));
  appState = { ...appState, ...patch };
  // Meter/preview updates don't rebuild the tray or echo to the recording window.
  if (mainWindow && !mainWindow.isDestroyed()) mainWindow.webContents.send('app-state', patch);
});
ipcMain.on('widget:drag', (event, phase) => {
  if (!trusted(event) || event.sender !== widgetWindow?.webContents) return;
  if (phase === 'cancel') { drag = null; return; }
  if (phase === 'start') drag = { cursor: screen.getCursorScreenPoint(), position: widgetWindow.getPosition() };
  if (drag && (phase === 'move' || phase === 'end')) {
    const cursor = screen.getCursorScreenPoint();
    const point = clampPosition({ x: drag.position[0] + cursor.x - drag.cursor.x, y: drag.position[1] + cursor.y - drag.cursor.y });
    widgetWindow.setPosition(point.x, point.y);
    if (phase === 'end') { writeSettings({ widgetPosition: point }); drag = null; }
  }
});
if (!app.requestSingleInstanceLock()) app.quit();
else {
  app.on('second-instance', showMainWindow);
  app.whenReady().then(createApplication).catch(error => { console.error('Unable to start Orbitvoice:', error.message); app.quit(); });
}
app.on('before-quit', event => {
  isQuitting = true;
  dictation?.abort.abort();
  if (!cleanupComplete) {
    event.preventDefault();
    shutdownInputHelper().finally(() => { cleanupComplete = true; app.quit(); });
  }
});
app.on('will-quit', () => { globalShortcut.unregisterAll(); apiServer?.close(); });
