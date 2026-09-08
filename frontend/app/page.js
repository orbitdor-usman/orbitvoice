'use client';

import { useEffect, useRef, useState } from 'react';
import api from '../services/api';
import { AlertIcon, CheckIcon, ChevronIcon, MicIcon, SettingsIcon, ShieldIcon, SparkleIcon } from '../components/icons';

const initialSettings = {
  enabled: true, microphoneId: 'default', language: 'auto', aiEnhancement: false,
  localSpeechEnabled: true, startWithWindows: false, showFloating: true,
  speechModel: 'base', autoStopSilence: true, browserRecognition: false,
  minimizeToTray: true, shortcut: 'CommandOrControl+Shift+Space', apiKeyConfigured: false,
};
const languages = [
  ['auto', 'Auto-detect'], ['en', 'English'], ['ur', 'Urdu · اردو'], ['hi', 'Hindi · हिन्दी'],
  ['ar', 'Arabic · العربية'], ['es', 'Spanish · Español'], ['fr', 'French · Français'],
  ['de', 'German · Deutsch'], ['zh', 'Chinese · 中文'], ['ja', 'Japanese · 日本語'],
  ['ko', 'Korean · 한국어'], ['pt', 'Portuguese · Português'], ['ru', 'Russian · Русский'],
  ['tr', 'Turkish · Türkçe'], ['it', 'Italian · Italiano'],
];
const statuses = {
  ready: { label: 'Ready to dictate', detail: 'Focus an editable field, then use your global shortcut to start listening.' },
  listening: { label: 'Listening', detail: 'Speak naturally. A three-second pause finishes your recording automatically.' },
  recording: { label: 'Recording', detail: 'Your microphone is capturing speech. Pause for three seconds when you are done.' },
  transcribing: { label: 'Transcribing', detail: 'Turning your recording into words on this device.' },
  processing: { label: 'Processing', detail: 'Converting your speech into text. Keep your target field focused.' },
  'ai-processing': { label: 'AI processing', detail: 'Polishing your transcript with optional AI enhancement.' },
  paused: { label: 'Paused', detail: 'Resume Orbitvoice to use voice typing and the floating microphone.' },
  'permission-required': { label: 'Microphone permission required', detail: 'Allow microphone access in Windows settings, then test your microphone in Voice input.' },
  fallback: { label: 'Fallback speech recognition', detail: 'AI is unavailable. Key-free speech recognition remains available.' },
  error: { label: 'Needs attention', detail: 'Recording could not finish. Check your microphone and try again. Recover any available transcript below.' },
  success: { label: 'Text inserted', detail: 'Your words are in place. You can recover the latest transcript below.' },
};
const navigation = [
  { id: 'overview', label: 'Overview', icon: SparkleIcon },
  { id: 'voice', label: 'Voice input', icon: MicIcon },
  { id: 'behavior', label: 'Behavior', icon: SettingsIcon },
  { id: 'ai', label: 'AI enhancement', icon: SparkleIcon },
  { id: 'about', label: 'About Orbitvoice', icon: ShieldIcon },
];
const bridge = () => typeof window !== 'undefined' ? window.voiceToText : null;
const settingsPatch = (source) => Object.fromEntries(Object.keys(initialSettings)
  .filter((key) => source?.[key] !== undefined).map((key) => [key, source[key]]));

function Logo() {
  return <div className="brand-logo"><img src="/orbitvoice-logo.png" alt="" /></div>;
}

function Toggle({ checked, onChange, label, disabled }) {
  return <button type="button" role="switch" aria-checked={Boolean(checked)} aria-label={label}
    disabled={disabled} onClick={() => onChange(!checked)} className="toggle"><span /></button>;
}

function SettingRow({ title, description, children }) {
  return <div className="setting-row"><div className="setting-copy"><h3>{title}</h3><p>{description}</p></div><div className="setting-control">{children}</div></div>;
}

function SelectBox({ id, label, value, onChange, disabled, children }) {
  return <div className="select-box"><select id={id} aria-label={label} value={value} disabled={disabled}
    onChange={(event) => onChange(event.target.value)}>{children}</select><ChevronIcon size={16} /></div>;
}

function PageHeader({ eyebrow, title, description, children }) {
  return <div className="page-heading"><div><p className="eyebrow">{eyebrow}</p><h1>{title}</h1><p className="page-description">{description}</p></div>{children}</div>;
}

function StatusBadge({ state }) {
  return <span className={`status-badge state-${state}`}><span className="status-dot" />{statuses[state].label}</span>;
}

export default function HomePage() {
  const [active, setActive] = useState('overview');
  const [settings, setSettings] = useState(initialSettings);
  const [loaded, setLoaded] = useState(false);
  const [permission, setPermission] = useState('unknown');
  const [devices, setDevices] = useState([]);
  const [appState, setAppState] = useState({ recordingState: 'ready', message: '', lastTranscript: '', engine: '' });
  const [apiKeyInput, setApiKeyInput] = useState('');
  const [practiceText, setPracticeText] = useState('');
  const [showKey, setShowKey] = useState(false);
  const [notice, setNotice] = useState(null);
  const [testing, setTesting] = useState(false);
  const [saving, setSaving] = useState(false);
  const [keyAction, setKeyAction] = useState('');
  const [appInfo, setAppInfo] = useState({ version: '', links: {} });
  const [checkingUpdates, setCheckingUpdates] = useState(false);
  const [updateResult, setUpdateResult] = useState(null);
  const meter = useRef(null);
  const mounted = useRef(false);
  const settingsBusy = useRef(false);
  const testBusy = useRef(false);
  const notify = (type, text) => setNotice({ type, text });

  useEffect(() => {
    mounted.current = true;
    let disposed = false;
    let latestSettings = {};
    const desktop = bridge();
    const unsubscribe = desktop?.onAppState?.((state) => {
      if (disposed || !state) return;
      const patch = { ...settingsPatch(state), ...settingsPatch(state.settings) };
      latestSettings = { ...latestSettings, ...patch };
      if (Object.keys(patch).length) setSettings((current) => ({ ...current, ...patch }));
      const { level, ...visibleState } = state;
      if (Number.isFinite(level)) meter.current?.style.setProperty('--audio-level', String(level));
      setAppState((current) => Object.keys(visibleState).some(key => current[key] !== visibleState[key]) ? { ...current, ...visibleState } : current);
      if (['listening', 'recording'].includes(state.recordingState)) setPermission('granted');
    });
    const refreshDevices = async () => {
      try {
        const list = await navigator.mediaDevices?.enumerateDevices();
        if (!disposed && list) setDevices(list.filter((device) => device.kind === 'audioinput'));
      } catch { /* Device labels may remain unavailable until permission is granted. */ }
    };
    (async () => {
      try {
        const current = desktop?.getSettings ? await desktop.getSettings() : (await api.get('/api/settings')).data;
        if (!disposed) {
          setSettings((value) => ({ ...value, ...settingsPatch(current), ...latestSettings }));
          setLoaded(true);
        }
      } catch {
        if (!disposed) setNotice({ type: 'error', text: 'Could not load settings. Reopen Orbitvoice to reconnect to the desktop service.' });
      }
    })();
    if (desktop?.getPermissionStatus) desktop.getPermissionStatus().then((value) => {
      if (!disposed) setPermission(value);
    }).catch(() => {});
    desktop?.getAppInfo?.().then(info => { if (!disposed) setAppInfo(info); }).catch(() => {});
    refreshDevices();
    navigator.mediaDevices?.addEventListener?.('devicechange', refreshDevices);
    return () => {
      disposed = true;
      mounted.current = false;
      unsubscribe?.();
      navigator.mediaDevices?.removeEventListener?.('devicechange', refreshDevices);
    };
  }, []);

  const save = async (patch) => {
    if (settingsBusy.current) return;
    settingsBusy.current = true;
    setSaving(true);
    try {
      const desktop = bridge();
      const saved = desktop?.updateSettings ? await desktop.updateSettings(patch) : (await api.put('/api/settings', patch)).data;
      setSettings((value) => ({ ...value, ...patch, ...settingsPatch(saved) }));
      notify('success', 'Settings saved.');
    } catch (error) {
      notify('error', error.message || 'That setting could not be saved. Please try again.');
    } finally {
      settingsBusy.current = false;
      setSaving(false);
    }
  };

  const manageKey = async (action) => {
    if (settingsBusy.current) return;
    const desktop = bridge();
    if (!desktop?.updateSettings) return notify('error', 'Open the desktop app to manage your optional API key. Voice typing does not need a key.');
    if (action === 'save' && !apiKeyInput.trim()) return notify('error', 'Enter an API key to save it. This is optional for voice typing.');
    settingsBusy.current = true;
    setKeyAction(action);
    try {
      if (action === 'check') {
        if (!desktop.validateApiKey) throw new Error('API key checking is unavailable in this version.');
        const result = await desktop.validateApiKey();
        if (result === false || result?.valid === false || result?.ok === false || result?.success === false || result?.error) {
          throw new Error(result?.error || result?.message || 'The AI service could not validate this key.');
        }
        notify('success', 'API key verified. AI enhancement is available when enabled.');
      } else {
        const saved = await desktop.updateSettings(action === 'save'
          ? { openaiApiKey: apiKeyInput.trim() }
          : { openaiApiKey: '', aiEnhancement: false });
        setSettings((value) => ({ ...value, apiKeyConfigured: action === 'save',
          ...(action === 'remove' ? { aiEnhancement: false } : {}), ...settingsPatch(saved) }));
        setApiKeyInput('');
        setShowKey(false);
        notify('success', action === 'save' ? 'API key saved. Enable AI enhancement whenever you want.' : 'API key removed. Key-free voice typing is still available.');
      }
    } catch (error) {
      notify('error', `${error.message || 'Could not complete this API key action.'} Key-free voice typing remains available.`);
    } finally {
      settingsBusy.current = false;
      setKeyAction('');
    }
  };

  const testMicrophone = async () => {
    if (testBusy.current) return;
    if (!navigator.mediaDevices?.getUserMedia) return notify('error', 'Microphone access is unavailable. Open Orbitvoice on your desktop.');
    testBusy.current = true;
    setTesting(true);
    let stream;
    try {
      stream = await navigator.mediaDevices.getUserMedia({ audio: settings.microphoneId === 'default'
        ? true : { deviceId: { exact: settings.microphoneId } } });
      // This is an access check: immediately release the device; no recording is retained.
      stream.getTracks().forEach((track) => track.stop());
      if (!mounted.current) return;
      setPermission('granted');
      setAppState((value) => value.recordingState === 'permission-required'
        ? { ...value, recordingState: 'ready', message: '' } : value);
      notify('success', 'Microphone access confirmed. Try a short dictation in the test area to check speech recognition.');
      const list = await navigator.mediaDevices.enumerateDevices().catch(() => null);
      if (mounted.current && list) setDevices(list.filter((device) => device.kind === 'audioinput'));
    } catch (error) {
      if (!mounted.current) return;
      const denied = ['NotAllowedError', 'SecurityError'].includes(error.name);
      setPermission(denied ? 'denied' : 'unavailable');
      notify('error', denied ? 'Microphone permission is required. Allow access in Windows privacy settings, then test again.'
        : 'The selected microphone is unavailable or busy. Connect a microphone, choose System default, or close another recording app.');
    } finally {
      stream?.getTracks().forEach((track) => track.stop());
      testBusy.current = false;
      if (mounted.current) setTesting(false);
    }
  };

  const copyTranscript = async () => {
    try {
      if (!navigator.clipboard?.writeText) throw new Error();
      await navigator.clipboard.writeText(appState.lastTranscript);
      notify('success', 'Transcript copied. Paste it into your destination with Ctrl + V.');
    } catch {
      notify('error', 'Clipboard access is unavailable. Select the transcript below and copy it with Ctrl + C.');
    }
  };

  const rawState = appState.recordingState === 'idle' ? 'ready' : appState.recordingState;
  const state = !settings.enabled ? 'paused' : ['denied', 'restricted'].includes(permission) ? 'permission-required'
    : permission === 'unavailable' && rawState === 'ready' ? 'error' : statuses[rawState] ? rawState : 'ready';
  const status = statuses[state];
  const disabled = !loaded || saving || Boolean(keyAction);
  const recordingBusy = ['listening', 'recording', 'processing', 'transcribing', 'ai-processing'].includes(state);
  const languageCode = settings.language || 'auto';
  const languageLabel = languages.find(([code]) => code === languageCode)?.[1] || languageCode;
  const shortcut = (settings.shortcut || initialSettings.shortcut).replace(/CommandOrControl|Control/g, 'Ctrl').replace(/\+/g, ' + ');
  const permissionLabel = { granted: 'Access allowed', available: 'Ready to test', denied: 'Permission required',
    restricted: 'Permission restricted', unavailable: 'Device unavailable', unknown: 'Not tested', 'not-determined': 'Not tested' }[permission] || 'Ready to test';
  const engineLabel = appState.engine ? ({ local: 'Local model', browser: 'Browser recognition',
    'speech-to-text': 'Browser recognition', 'local-whisper': 'Local Whisper model' }[appState.engine] || appState.engine) : 'Key-free speech';

  const openLink = async (name) => {
    try { await bridge()?.openProductLink(name); }
    catch { notify('error', 'Could not open the link. Please try again.'); }
  };
  const checkUpdates = async () => {
    setCheckingUpdates(true);
    try { setUpdateResult(await bridge().checkForUpdates()); }
    catch (error) { notify('error', error.message); }
    finally { setCheckingUpdates(false); }
  };
  const tryDictation = () => {
    if (!recordingBusy) document.getElementById('dictation-test')?.focus();
    bridge()?.toggleRecording();
  };
  const aiPanel = <section className="panel ai-panel" aria-labelledby="ai-heading">
    <div className="panel-heading"><div className="heading-with-icon"><span className="icon-tile"><SparkleIcon size={18} /></span><div><h2 id="ai-heading">Optional AI enhancement</h2><p>Connect your API key for grammar and punctuation polish.</p></div></div><div className="ai-enable"><span>{settings.aiEnhancement ? 'On' : 'Off'}</span><Toggle label="Enable optional AI enhancement" checked={settings.aiEnhancement === true} disabled={disabled} onChange={(value) => save({ aiEnhancement: value })} /></div></div>
    {settings.apiKeyConfigured ? <div className="key-connected"><span><CheckIcon size={16} /> API key saved</span><div className="button-group"><button className="button button-small" disabled={disabled} onClick={() => manageKey('check')}>{keyAction === 'check' ? 'Checking…' : 'Check key'}</button><button className="button button-small button-danger" disabled={disabled} onClick={() => manageKey('remove')}>{keyAction === 'remove' ? 'Removing…' : 'Remove key'}</button></div></div>
      : <form className="key-form" onSubmit={(event) => { event.preventDefault(); manageKey('save'); }}>
        <label htmlFor="api-key">OpenAI API key <span className="muted">· optional</span></label>
        <div className="key-input-row"><div className="key-input"><input id="api-key" type={showKey ? 'text' : 'password'} value={apiKeyInput}
          onChange={(event) => setApiKeyInput(event.target.value)} placeholder="sk-…" autoComplete="off" autoCapitalize="none" spellCheck={false} disabled={disabled} />
          <button type="button" className="text-button" aria-label={showKey ? 'Hide API key' : 'Show API key'} aria-pressed={showKey} onClick={() => setShowKey((value) => !value)}>{showKey ? 'Hide' : 'Show'}</button></div>
          <button type="submit" className="button" disabled={disabled || !apiKeyInput.trim()}>{keyAction === 'save' ? 'Saving…' : 'Save key'}</button></div>
      </form>}
    <p className="helper-text"><ShieldIcon size={13} />Local dictation is always free of API keys. When AI is enabled, transcript text is sent to OpenAI; your original text is kept if it fails.</p>
  </section>;

  const renderPage = () => {
    if (active === 'ai') return <><PageHeader eyebrow="AI / API" title="Your words, a little more polished." description="Optional transcript cleanup. Your microphone audio and core recognition stay on your device." />{aiPanel}<div className="information-note"><ShieldIcon size={18} /><p>Your API key is protected by Windows on this computer. You can remove it at any time. Speech recognition works with no key and no internet connection.</p></div></>;
    if (active === 'voice') return <>
      <PageHeader eyebrow="Voice input" title="Sound like yourself." description="Choose how Orbitvoice listens. Every language is available without an API key." />
      <section className="panel settings-panel" aria-label="Voice input settings">
        <SettingRow title="Local recognition model" description="Balanced uses Whisper Base for more capable recognition. Fast uses Whisper Tiny for lower memory use. Both are bundled and work offline.">
          <SelectBox id="speech-model" label="Local recognition model" value={settings.speechModel} disabled={disabled || recordingBusy} onChange={(value) => save({ speechModel: value })}><option value="base">Balanced · Whisper Base</option><option value="tiny">Fast · Whisper Tiny</option></SelectBox>
        </SettingRow>
        <SettingRow title="Microphone" description="Custom device selection applies to local recording. Browser speech recognition may use your system default microphone.">
          <SelectBox id="microphone" label="Microphone" value={settings.microphoneId || 'default'} disabled={disabled || testing || recordingBusy} onChange={(value) => { setPermission('unknown'); save({ microphoneId: value }); }}>
            <option value="default">System default microphone</option>
            {settings.microphoneId !== 'default' && !devices.some((device) => device.deviceId === settings.microphoneId) && <option value={settings.microphoneId}>Saved microphone (not detected)</option>}
            {devices.filter((device) => device.deviceId && device.deviceId !== 'default').map((device, index) => <option key={device.deviceId} value={device.deviceId}>{device.label || `Microphone ${index + 1}`}</option>)}
          </SelectBox>
        </SettingRow>
        <SettingRow title="Finish after silence" description="Automatically finish after 3 seconds of quiet following speech. Short pauses keep the recorder running. No speech for 12 seconds ends an empty session."><Toggle label="Finish after silence" checked={settings.autoStopSilence !== false} disabled={disabled || recordingBusy} onChange={value => save({ autoStopSilence: value })} /></SettingRow>
        <SettingRow title="Try browser speech service" description="Optional online recognition for a selected language and default microphone. If unavailable, the complete recording uses the bundled local model."><Toggle label="Try browser speech service" checked={settings.browserRecognition === true} disabled={disabled || recordingBusy} onChange={value => save({ browserRecognition: value })} /></SettingRow>
        <SettingRow title="Spoken language" description="Auto-detect uses the bundled multilingual local model. Select a language to give recognition a clearer hint.">
          <SelectBox id="language" label="Spoken language" value={languageCode} disabled={disabled || recordingBusy} onChange={(value) => save({ language: value })}>
            {!languages.some(([code]) => code === languageCode) && <option value={languageCode}>{languageCode}</option>}
            {languages.map(([code, label]) => <option key={code} value={code}>{label}</option>)}
          </SelectBox>
        </SettingRow>
        <div className="permission-row"><div><ShieldIcon size={18} /><span>Microphone access</span><span className={`quiet-badge ${permission === 'denied' ? 'attention-text' : ''}`}>{permissionLabel}</span></div><button className="button button-small" disabled={!loaded || testing || recordingBusy} onClick={testMicrophone}>{testing ? 'Testing…' : 'Test microphone'}</button></div>
        <p className="helper-text">The microphone test checks device access and immediately releases it. Use the Overview test area to check your spoken words.</p>
      </section>
      <div className="two-columns"><section className="panel"><span className="icon-tile"><ShieldIcon size={20} /></span><h2 className="spaced-title">Offline, without a key</h2><p>The bundled multilingual local model works offline. Browser recognition may require an internet connection. AI enhancement is optional and requires internet.</p></section>
        <section className="panel"><p className="eyebrow">Your global shortcut</p><kbd className="shortcut-large">{shortcut}</kbd><p>Focus your destination first. Press once to listen; pause for 3 seconds to finish, or press again. Each recording can last up to 60 seconds.</p></section></div>
    </>;
    if (active === 'behavior') return <>
      <PageHeader eyebrow="Behavior" title="Ready when you are." description="Keep voice typing close at hand, with a workspace that stays out of your way." />
      <section className="panel settings-panel" aria-label="Behavior settings">
        <SettingRow title="Keyboard shortcut" description="Choose a global shortcut for starting or finishing dictation."><SelectBox id="shortcut" label="Keyboard shortcut" value={settings.shortcut} disabled={disabled || recordingBusy} onChange={value => save({ shortcut: value })}>{!['CommandOrControl+Shift+Space', 'CommandOrControl+Alt+Space', 'Alt+Shift+V'].includes(settings.shortcut) && <option value={settings.shortcut}>{shortcut}</option>}<option value="CommandOrControl+Shift+Space">Ctrl + Shift + Space</option><option value="CommandOrControl+Alt+Space">Ctrl + Alt + Space</option><option value="Alt+Shift+V">Alt + Shift + V</option></SelectBox></SettingRow>
        <SettingRow title="Enable Orbitvoice" description="Make voice typing available through the global shortcut and floating microphone."><Toggle label="Enable Orbitvoice" checked={settings.enabled} disabled={disabled} onChange={(value) => save({ enabled: value })} /></SettingRow>
        <SettingRow title="Show floating microphone" description="Keep the microphone above supported windows. Drag it to a comfortable spot; its position is remembered."><Toggle label="Show floating microphone" checked={settings.showFloating} disabled={disabled} onChange={(value) => save({ showFloating: value })} /></SettingRow>
        <SettingRow title="Start with Windows" description="Launch Orbitvoice when you sign in to your computer."><Toggle label="Start with Windows" checked={settings.startWithWindows} disabled={disabled} onChange={(value) => save({ startWithWindows: value })} /></SettingRow>
        <SettingRow title="Minimize to system tray" description="Keep Orbitvoice available when you close the dashboard."><Toggle label="Minimize to system tray" checked={settings.minimizeToTray !== false} disabled={disabled} onChange={(value) => save({ minimizeToTray: value })} /></SettingRow>
      </section>
      <div className="information-note"><MicIcon size={20} /><p>Click the floating microphone to start or stop; drag it to move. If it is hidden, use your global shortcut or the tray menu to bring it back.</p></div>
    </>;
    if (active === 'about') return <>
      <PageHeader eyebrow="About Orbitvoice" title="Less typing. More flow." description="A small desktop companion that turns your voice into words in supported editable fields." />
      <section className="panel product-card"><div className="heading-with-icon"><Logo /><div><h2>Orbitvoice</h2><p>By Orbitdor · Windows x64 {appInfo.version && `· Version ${appInfo.version}`}</p></div></div><div className="support-grid"><button className="support-link" onClick={() => openLink('website')}><span>Official website</span><strong>ov.orbitdor.com ↗</strong></button><button className="support-link" onClick={() => openLink('support')}><span>Support & contact</span><strong>orbitdor@gmail.com ↗</strong></button><button className="support-link" onClick={() => openLink('help')}><span>Getting started</span><strong>Read the user guide ↗</strong></button><button className="support-link" onClick={() => openLink('company')}><span>Our company</span><strong>www.orbitdor.com ↗</strong></button></div><div className="panel-divider"><span className="muted">{updateResult ? updateResult.available ? `Version ${updateResult.latest} is available.` : 'You are using the latest available version.' : 'Check for a newer Windows release.'}</span><div className="button-group"><button className="button button-small" disabled={checkingUpdates} onClick={checkUpdates}>{checkingUpdates ? 'Checking…' : 'Check for updates'}</button><button className="button button-small" onClick={() => openLink('updates')}>View releases ↗</button></div></div></section>
      <div className="two-columns"><section className="panel"><span className="icon-tile"><MicIcon size={20} /></span><h2 className="spaced-title">Speech comes standard</h2><p>Key-free recognition is always the foundation. The bundled multilingual local model can transcribe offline; browser recognition may use an online speech service.</p></section><section className="panel"><span className="icon-tile"><SparkleIcon size={20} /></span><h2 className="spaced-title">AI is your choice</h2><p>Enable AI to clean up a transcript with your own key. If the AI service is unavailable, Orbitvoice keeps the original transcription.</p></section></div>
      <section className="panel"><h2>Made for your cursor</h2><p className="spaced-copy">Focus a text field, document, or editable PDF before using the shortcut. Words are inserted at the cursor; an intentional text selection may be replaced. Read-only documents and unsupported fields cannot accept typing. Recover your latest transcript from Overview if insertion fails.</p><div className="panel-divider"><span className="muted">Orbitvoice · Windows desktop</span><span className="quiet-badge">60-second sessions</span></div></section>
    </>;
    return <>
      <PageHeader eyebrow="Your workspace" title="Your voice, everywhere." description="Turn a thought into text. No API key needed."><button className="button" disabled={disabled} onClick={() => save({ enabled: !settings.enabled })}>{settings.enabled ? 'Pause Orbitvoice' : 'Resume Orbitvoice'}</button></PageHeader>
      {aiPanel}
      <section className={`status-panel state-${state}`} aria-label="Dictation status">
        <div className="status-content"><div className="status-topline"><span className="eyebrow">Voice typing</span><span className="quiet-badge">No key required</span></div>
          <div role="status" aria-live="polite" aria-atomic="true">{loaded ? <StatusBadge state={state} /> : <span className="status-badge">Connecting to desktop…</span>}<h2>{!loaded ? 'Getting your workspace ready.' : state === 'ready' ? 'Go ahead. Say it.' : status.label}</h2><p>{!loaded ? 'Loading settings and microphone availability.' : (state === rawState && appState.message) || status.detail}</p></div>
          <div className="shortcut-hint"><kbd>{shortcut}</kbd><span>{settings.autoStopSilence ? 'Auto-stop after 3s of silence' : 'Press again to finish'}</span></div>
          {state === 'permission-required' && <button className="button button-small" onClick={() => setActive('voice')}>Check microphone access</button>}
        </div>
        <div className="voice-visual" ref={meter}><button className="record-control" aria-label={['listening', 'recording'].includes(state) ? 'Stop dictation' : 'Start dictation in test area'} disabled={!loaded || !settings.enabled || (recordingBusy && !['listening', 'recording'].includes(state))} onClick={tryDictation}>{['listening', 'recording'].includes(state) ? <span className="stop-symbol" /> : <MicIcon size={25} strokeWidth={1.6} />}</button><div className={`voice-waveform ${state === 'recording' ? 'is-listening' : ''}`} aria-hidden="true">{[8, 14, 23, 12, 31, 20, 38, 25, 15, 30, 18, 10, 23, 13, 7].map((height, index) => <i key={index} style={{ height: height * 0.7, animationDelay: `${index * 65}ms` }} />)}</div><span className="record-time">{recordingBusy ? `00:${String(appState.elapsed || 0).padStart(2, '0')} / 01:00` : 'Try dictation'}</span></div>
      </section>
      {(recordingBusy || appState.interimTranscript) && <section className="live-preview panel" aria-label="Live transcript preview"><div className="panel-heading"><h2>Live preview</h2><span className="quiet-badge">{state === 'transcribing' ? 'Finalizing' : 'Draft · may change'}</span></div><p dir="auto">{appState.interimTranscript || 'Your words will appear as recognition progresses…'}</p></section>}
      <div className="metric-grid"><div className="metric"><span>Recognition</span><strong>{engineLabel}</strong><small>{appState.engine ? 'Latest reported engine' : 'Bundled local model · offline'}</small></div><div className="metric"><span>Spoken language</span><strong>{languageLabel}</strong><small>{languageCode === 'auto' ? 'Local multilingual detection' : 'Your recognition language'}</small></div><div className="metric"><span>AI enhancement</span><strong>{settings.aiEnhancement ? settings.apiKeyConfigured ? 'Enabled' : 'Waiting for optional key' : 'Off'}</strong><small>{settings.aiEnhancement && settings.apiKeyConfigured ? 'Original text retained on failure' : 'Key-free speech stays available'}</small></div></div>
      <section className="panel test-panel" aria-labelledby="test-heading"><div className="panel-heading"><div><h2 id="test-heading">Give your keyboard a break.</h2><p>A little space to try voice typing.</p></div><span className="quiet-badge">Try it here</span></div>
        <ol className="instruction-steps"><li><span>1</span>Focus the text area below</li><li><span>2</span>Press {shortcut}</li><li><span>3</span>Speak, then pause to finish</li></ol>
        <label className="sr-only" htmlFor="dictation-test">Test voice typing</label><textarea id="dictation-test" aria-describedby="test-help" dir="auto" rows={5} value={practiceText} onChange={event => setPracticeText(event.target.value)} placeholder="Click here, place your cursor, and say what’s on your mind…" />
        <div className="test-footer" id="test-help"><span>Editable test area · Keep this field focused while dictating.</span><span>60 sec max</span></div>
      </section>
      <section className="panel transcript-panel" aria-labelledby="transcript-heading"><div className="panel-heading"><div><h2 id="transcript-heading">Latest transcript</h2><p>Recover your words if the destination could not accept them.</p></div><button className="button button-small" disabled={!appState.lastTranscript} onClick={copyTranscript}>Copy transcript</button></div>
        {appState.lastTranscript ? <div className="transcript-text" dir="auto" tabIndex={0} aria-label="Latest transcript text">{appState.lastTranscript}</div> : <div className="empty-transcript"><MicIcon size={18} /><p>Your next transcript will appear here.</p></div>}
      </section>
    </>;
  };

  return <main className="dashboard"><a href="#workspace" className="skip-link">Skip to workspace</a>
    <aside className="sidebar"><a className="brand" href="#workspace" onClick={() => setActive('overview')} aria-label="Orbitvoice overview"><Logo /><div><strong>Orbitvoice</strong><span>Voice, everywhere.</span></div></a>
      <div className="sidebar-label">Workspace</div><nav aria-label="Main navigation">{navigation.map(({ id, label, icon: Icon }) => <button type="button" key={id} aria-current={active === id ? 'page' : undefined} className={`nav-item ${active === id ? 'is-active' : ''}`} onClick={() => setActive(id)}><Icon size={18} />{label}{active === id && <span className="nav-marker" />}</button>)}</nav>
      <div className="sidebar-bottom"><button className="sidebar-help" onClick={() => setActive('about')}><ShieldIcon size={16} /><span>Help & updates</span><span>↗</span></button><div className="sidebar-service"><span className={`status-dot state-${state}`} /><span>{!loaded ? 'Connecting…' : settings.enabled ? 'Orbitvoice enabled' : 'Orbitvoice paused'}</span></div>{appInfo.version && <span className="sidebar-version">Orbitdor · v{appInfo.version}</span>}</div>
    </aside>
    <div className="workspace"><header className="topbar"><div className="breadcrumb"><span>Workspace</span><span>/</span><strong>{navigation.find((item) => item.id === active).label}</strong></div><span className="desktop-label"><span className="status-dot" />Windows desktop</span></header>
      <div className="workspace-content" id="workspace" tabIndex={-1}>{appState.shortcutAvailable === false && <div className="information-note shortcut-warning" role="alert"><AlertIcon size={20} /><p>The shortcut {shortcut} could not be registered. Another app may already use it. Focus your destination and use the floating microphone, or close the conflicting app and restart Orbitvoice.</p></div>}{renderPage()}<footer className="workspace-footer"><span>Orbitvoice</span><span><ShieldIcon size={13} />Key-free speech. Optional AI.</span></footer></div>
    </div>
    {notice && <div className={`toast toast-${notice.type}`} role={notice.type === 'error' ? 'alert' : 'status'}>{notice.type === 'error' ? <AlertIcon size={18} /> : <CheckIcon size={18} />}<span>{notice.text}</span><button type="button" className="text-button" aria-label="Dismiss notification" onClick={() => setNotice(null)}>Dismiss</button></div>}
  </main>;
}
