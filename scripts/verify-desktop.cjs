// Run with PLAYWRIGHT_MODULE pointing at an installed playwright package.
// Uses synthetic microphone audio and an isolated profile; no API key is used.
const { _electron } = require(process.env.PLAYWRIGHT_MODULE || 'playwright');
const path = require('path');
const fs = require('fs');
const assert = require('assert/strict');
const root = path.join(__dirname, '..');
const executablePath = process.argv[2] || require('electron');
const packaged = !executablePath.includes('node_modules');
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
  const errors = [];
  for (const page of [main, widget]) { page.on('pageerror', error => errors.push(error.message)); page.on('console', msg => { if (msg.type() === 'error') console.log('renderer:', msg.text()); }); }
  await main.evaluate(() => window.voiceToText.updateSettings({ language: 'auto', aiEnhancement: false, enabled: true }));
  await main.screenshot({ path: path.join(profile, 'startup.png') });
  console.log('Dashboard:', main.url(), (await main.locator('body').innerText()).slice(0, 1000));
  await main.waitForSelector('textarea');
  const field = main.locator('textarea').first();
  await field.fill('Before  after');
  await field.evaluate(element => { element.focus(); element.setSelectionRange(7, 7); });
  await main.bringToFront();
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
  await new Promise(resolve => setTimeout(resolve, 11000));
  await widget.evaluate(() => document.querySelector('button').click());
  await widget.waitForFunction(() => /widget-(success|fallback|error)/.test(document.querySelector('button')?.className), undefined, { timeout: 180000 });
  const state = await main.evaluate(() => window.voiceToText.getSettings());
  console.log('Dictation result:', JSON.stringify({ state: state.recordingState, message: state.message, transcript: state.lastTranscript, engine: state.engine }));
  const value = await field.inputValue();
  console.log('Editable field:', value);
  assert.match(state.lastTranscript.toLowerCase(), /quick brown fox/);
  assert.ok(value.startsWith('Before ')); assert.ok(value.endsWith(' after'));
  assert.match(value.toLowerCase(), /quick brown fox/);
  assert.equal(errors.length, 0, errors.join('\n'));
  assert.equal(externalRequests.length, 0, 'Offline recognition must not request remote models or services');
  await main.screenshot({ path: path.join(profile, 'dictation.png') });
  // A paused application must not acquire the microphone again.
  await main.evaluate(() => window.voiceToText.setEnabled(false));
  await widget.waitForFunction(() => document.querySelector('button')?.classList.contains('widget-paused'));
  await widget.evaluate(() => document.querySelector('button').click());
  assert.equal((await main.evaluate(() => window.voiceToText.getSettings())).recordingState, 'paused');
  console.log('PASS: offline multilingual-model transcription, cursor insertion, text preservation, paused state.');
  console.log('QA artifacts:', profile);
})().catch(error => { console.error(error); process.exitCode = 1; }).finally(async () => { await application?.close(); });
