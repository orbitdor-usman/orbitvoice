// Run with PLAYWRIGHT_MODULE pointing at an installed playwright package.
// Uses synthetic microphone audio and an isolated profile; no API key is used.
const { _electron } = require(process.env.PLAYWRIGHT_MODULE || 'playwright');
const path = require('path');
const fs = require('fs');
const assert = require('assert/strict');
const root = path.join(__dirname, '..');
const executablePath = process.argv[2] || require('electron');
const packaged = !executablePath.includes('node_modules');
const simulateInput = process.argv.includes('--simulate-input');
const profile = fs.mkdtempSync(path.join(root, '.runtime-data', 'desktop-qa-'));
let application;
(async () => {
  application = await _electron.launch({ executablePath,
    args: [...(packaged ? [] : [root]), '--use-fake-device-for-media-stream', '--use-fake-ui-for-media-stream', `--use-file-for-fake-audio-capture=${path.join(root, '.runtime-data', 'qa-speech.wav')}`],
    env: { ...Object.fromEntries(Object.entries(process.env).filter(([key]) => key !== 'ELECTRON_RUN_AS_NODE')), ORBITVOICE_DATA_DIR: profile }, timeout: 45000 });
  application.process().stderr.on('data', data => console.log('electron:', data.toString().trim()));
  const externalRequests = [];
  await application.context().route(url => !['localhost', '127.0.0.1'].includes(url.hostname), route => {
    externalRequests.push(route.request().url());
    return route.abort();
  });
  await application.firstWindow();
  let main;
  for (let n = 0; n < 100; n++) {
    main = application.windows().find(page => /\/$/.test(page.url()) && !page.url().includes('/widget'));
    if (main) break;
    await new Promise(resolve => setTimeout(resolve, 100));
  }
  if (!main) throw new Error('Dashboard did not open');
  await main.waitForLoadState('domcontentloaded');
  await main.waitForFunction(() => Boolean(window.voiceToText), undefined, { timeout: 30000 });
  let widget;
  for (let n = 0; n < 100; n++) {
    widget = application.windows().find(page => page.url().includes('/widget'));
    if (widget) break;
    await new Promise(resolve => setTimeout(resolve, 100));
  }
  if (!widget) throw new Error('Widget did not open');
  await widget.waitForSelector('button');
  if (simulateInput) {
    // Exercise the real packaged capture, worker, models and React UI while
    // replacing only OS target/clipboard I/O on hosts without foreground access.
    await application.evaluate(({ ipcMain, BrowserWindow }) => {
      const main = BrowserWindow.getAllWindows().find(win => !win.webContents.getURL().includes('/widget'));
      for (const name of ['dictation:begin', 'dictation:cancel', 'speech:enhance', 'text:insert']) ipcMain.removeHandler(name);
      ipcMain.handle('dictation:begin', () => 'qa-simulated-target');
      ipcMain.handle('dictation:cancel', () => {});
      ipcMain.handle('speech:enhance', (_event, { text }) => ({ text, enhanced: false, fallback: false }));
      ipcMain.handle('text:insert', async (_event, { text }) => {
        globalThis.__qaTranscript = text;
        await main.webContents.executeJavaScript(`(() => {
          const field = document.querySelector('#dictation-test');
          const text = ${JSON.stringify(text)};
          Object.getOwnPropertyDescriptor(HTMLTextAreaElement.prototype, 'value').set.call(field, field.value.slice(0, 7) + text + field.value.slice(7));
          field.dispatchEvent(new Event('input', { bubbles: true }));
          field.setSelectionRange(7 + text.length, 7 + text.length);
        })()`);
        main.webContents.send('app-state', { lastTranscript: text, interimTranscript: '' });
        return { verified: true };
      });
      ipcMain.removeAllListeners('widget:progress');
      ipcMain.on('widget:progress', (_event, { progress }) => main.webContents.send('app-state', progress));
      ipcMain.on('widget:recording-state', () => {
        if (globalThis.__qaTranscript) main.webContents.send('app-state', { lastTranscript: globalThis.__qaTranscript, interimTranscript: '' });
      });
    });
    console.log('QA MODE: OS target capture and insertion are simulated; audio and local inference are real.');
  }
  const errors = [];
  for (const page of [main, widget]) { page.on('pageerror', error => errors.push(error.message)); page.on('console', msg => { if (msg.type() === 'error') console.log('renderer:', msg.text()); }); }
  await main.evaluate(model => window.voiceToText.updateSettings({ language: 'en', speechModel: model, autoStopSilence: true, browserRecognition: false, aiEnhancement: false, enabled: true }), process.argv.includes('--tiny') ? 'tiny' : 'base');
  await main.evaluate(() => {
    window.__qaStates = [];
    window.__qaPreview = false;
    window.voiceToText.onAppState(state => {
      if (state.recordingState) window.__qaStates.push({ state: state.recordingState, at: performance.now() });
      if (state.interimTranscript) window.__qaPreview = true;
    });
  });
  await main.screenshot({ path: path.join(profile, 'startup.png') });
  console.log('Dashboard:', main.url(), (await main.locator('body').innerText()).slice(0, 1000));
  await main.waitForSelector('textarea');
  const field = main.locator('textarea').first();
  await application.evaluate(({ BrowserWindow, app }) => {
    const window = BrowserWindow.getAllWindows().find(win => !win.webContents.getURL().includes('/widget'));
    window.setAlwaysOnTop(true); window.show(); window.focus(); app.focus();
  });
  await main.bringToFront();
  if (!simulateInput) {
    const handle = await application.evaluate(({ BrowserWindow }) => BrowserWindow.getAllWindows().find(win => !win.webContents.getURL().includes('/widget')).getNativeWindowHandle().readBigUInt64LE().toString());
    require('child_process').execFileSync('powershell.exe', ['-NoProfile', '-NonInteractive', '-ExecutionPolicy', 'Bypass', '-File', path.join(root, 'scripts/focus-qa-window.ps1'), '-WindowHandle', handle], { windowsHide: true });
  }
  await field.click();
  await field.fill('Before  after');
  await field.evaluate(element => { element.focus(); element.setSelectionRange(7, 7); });
  await main.waitForFunction(() => document.hasFocus() && document.activeElement?.id === 'dictation-test');
  await main.screenshot({ path: path.join(profile, 'overview.png') });
  if (process.argv.includes('--input-only')) {
    const result = await main.evaluate(async () => {
      const id = await window.voiceToText.beginDictation();
      return window.voiceToText.insertText('The quick brown fox', id);
    });
    assert.equal(await field.inputValue(), 'Before The quick brown fox after');
    console.log('PASS: native cursor insertion and surrounding-text preservation.', result);
    return;
  }
  await widget.evaluate(() => document.querySelector('button').click());
  await widget.waitForFunction(() => document.querySelector('button')?.getAttribute('aria-pressed') === 'true', undefined, { timeout: 30000 });
  console.log('Microphone entered listening state.');
  // No stop click: synthetic speech is followed by a 5-second silent gap.
  await widget.waitForFunction(() => document.querySelector('button')?.getAttribute('aria-pressed') === 'false', undefined, { timeout: 30000 });
  console.log('Silence detection stopped the microphone automatically.');
  await widget.waitForFunction(() => /widget-(success|fallback|error)/.test(document.querySelector('button')?.className), undefined, { timeout: 180000 });
  const state = await main.evaluate(() => window.voiceToText.getSettings());
  console.log('Final recording state:', state.recordingState, state.message);
  assert.notEqual(state.recordingState, 'error', state.message);
  if (simulateInput) state.lastTranscript = await application.evaluate(() => globalThis.__qaTranscript || '');
  console.log('Dictation result:', JSON.stringify({ state: state.recordingState, message: state.message, transcript: state.lastTranscript, engine: state.engine }));
  const value = await field.inputValue();
  console.log('Editable field:', value);
  assert.match(state.lastTranscript.toLowerCase(), /quick brown fox/);
  assert.ok(value.startsWith('Before ')); assert.ok(value.endsWith(' after'));
  assert.match(value.toLowerCase(), /quick brown fox/);
  assert.equal((value.toLowerCase().match(/quick brown fox/g) || []).length, 1, 'Preview must not duplicate final insertion');
  const timeline = await main.evaluate(() => ({ states: window.__qaStates, preview: window.__qaPreview }));
  console.log('Recording timeline:', JSON.stringify(timeline));
  assert.ok(timeline.states.some(item => item.state === 'recording'));
  assert.ok(timeline.states.some(item => item.state === 'transcribing'));
  assert.equal(timeline.preview, true, 'Progressive transcript preview is visible');
  assert.equal(errors.length, 0, errors.join('\n'));
  assert.equal(externalRequests.length, 0, 'Offline recognition must not request remote models or services');
  await main.screenshot({ path: path.join(profile, 'dictation.png') });
  const labels = ['Overview', 'Voice input', 'Behavior', 'AI enhancement', 'About Orbitvoice'];
  for (const width of [640, 900, 1180]) {
    await application.evaluate(({ BrowserWindow }, width) => {
      BrowserWindow.getAllWindows().find(win => !win.webContents.getURL().includes('/widget')).setSize(width, 820);
    }, width);
    for (const label of labels) {
      await main.getByRole('navigation', { name: 'Main navigation' }).getByRole('button', { name: label, exact: true }).click();
      assert.equal(await main.locator('h1').count(), 1);
      if (label === 'Overview') assert.equal(await main.locator('#dictation-test').inputValue(), value, 'Practice text persists across navigation');
      assert.equal(await main.evaluate(() => document.documentElement.scrollWidth > innerWidth + 1), false, `Horizontal overflow: ${width} ${label}`);
      await main.screenshot({ path: path.join(profile, `${width}-${label.replaceAll(' ', '-')}.png`), fullPage: true });
    }
  }
  console.log('PASS: all five desktop sections at 640, 900, and 1180 pixels.');
  // A paused application must not acquire the microphone again.
  await main.evaluate(() => window.voiceToText.setEnabled(false));
  await widget.waitForFunction(() => document.querySelector('button')?.classList.contains('widget-paused'));
  await widget.evaluate(() => document.querySelector('button').click());
  assert.equal((await main.evaluate(() => window.voiceToText.getSettings())).recordingState, 'paused');
  console.log(`PASS: offline multilingual-model transcription, ${simulateInput ? 'simulated' : 'native'} cursor insertion, text preservation, paused state.`);
  console.log('QA artifacts:', profile);
})().catch(error => { console.error(error); process.exitCode = 1; }).finally(async () => { await application?.close(); });
