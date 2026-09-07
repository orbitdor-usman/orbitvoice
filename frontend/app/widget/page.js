'use client';
import { useEffect, useRef, useState } from 'react';
import { AlertIcon, CheckIcon, MicIcon } from '../../components/icons';
import { decodeAudio, disposeRecognition, localRequest, microphoneError, startBrowserRecognition } from '../../services/recognition';

export default function WidgetPage() {
  const [state, setState] = useState('idle');
  const [message, setMessage] = useState('Ready — click to dictate, drag to move');
  const status = useRef('idle');
  const settings = useRef({ enabled: true, language: 'auto', microphoneId: 'default' });
  const session = useRef(null);
  const action = useRef(null);
  const pointer = useRef(null);
  const reset = useRef(null);
  const bridge = () => window.voiceToText;
  const publish = (next, detail, engine) => {
    clearTimeout(reset.current);
    status.current = next;
    setState(next); setMessage(detail);
    bridge()?.recordingState(next, detail, engine);
  };
  const release = run => {
    clearTimeout(run?.limit);
    run?.stream?.getTracks().forEach(track => track.stop());
    run?.browser?.cancel();
  };
  const cancel = () => {
    const run = session.current;
    session.current = null;
    if (run) {
      run.cancelled = true;
      if (run.recorder?.state === 'recording') { run.recorder.onstop = null; run.recorder.stop(); }
      release(run);
      if (run.id) bridge()?.cancelDictation(run.id).catch(() => {});
    }
    disposeRecognition();
  };
  const settle = (next, detail, engine) => {
    publish(next, detail, engine);
    if (next === 'success' || next === 'fallback') reset.current = setTimeout(() => publish(settings.current.enabled ? 'idle' : 'paused', settings.current.enabled ? 'Ready — click to dictate, drag to move' : 'Paused'), 6000);
  };
  const transcribe = async run => {
    run.stream?.getTracks().forEach(track => track.stop());
    clearTimeout(run.limit);
    try {
      let text = await run.browser?.stop();
      if (run.cancelled) return;
      let engine = 'Browser speech';
      if (!text) {
        engine = 'Local speech';
        publish('processing', 'Recognizing speech on this device…', engine);
        const blob = new Blob(run.chunks, { type: run.recorder.mimeType });
        if (!blob.size) throw new Error('No audio was recorded. Try again.');
        const audio = await decodeAudio(blob);
        if (run.cancelled) return;
        text = await localRequest(audio, run.settings.language, detail => { if (!run.cancelled) publish('processing', detail, engine); });
      }
      if (run.cancelled) return;
      if (!text?.trim()) throw new Error('No speech was detected. Try speaking closer to the microphone.');
      let result = { text, enhanced: false, fallback: false };
      if (run.settings.aiEnhancement && run.settings.apiKeyConfigured) publish('ai-processing', 'Improving punctuation and grammar…', engine);
      try { result = await bridge().enhanceText(text, run.id); }
      catch { result = { text, fallback: Boolean(run.settings.aiEnhancement) }; }
      if (run.cancelled) return;
      publish('processing', 'Inserting at your cursor…', engine);
      const insertion = await bridge().insertText(result.text, run.id);
      if (run.cancelled) return;
      settle(result.fallback ? 'fallback' : 'success', result.fallback ? 'API unavailable — using local/fallback speech recognition. Text sent to your field.' : insertion.verified ? 'Text inserted' : 'Text sent to your field. If it did not appear, copy it from Overview.', engine);
    } catch (error) {
      if (!run.cancelled) settle('error', microphoneError(error));
    } finally {
      release(run);
      if (run.id) bridge()?.cancelDictation(run.id).catch(() => {});
      if (session.current === run) session.current = null;
    }
  };
  const start = async () => {
    if (!settings.current.enabled || session.current) return;
    const run = { settings: { ...settings.current }, chunks: [], cancelled: false };
    session.current = run;
    publish('processing', 'Preparing microphone…');
    try {
      if (!bridge()) throw new Error('Open the desktop app to dictate into another application.');
      run.id = await bridge().beginDictation();
      if (run.cancelled) { await bridge().cancelDictation(run.id); return; }
      if (!navigator.mediaDevices?.getUserMedia || typeof MediaRecorder === 'undefined') throw new Error('Microphone recording is unavailable on this computer.');
      const id = run.settings.microphoneId;
      run.stream = await navigator.mediaDevices.getUserMedia({ audio: id && id !== 'default' ? { deviceId: { exact: id } } : true });
      if (run.cancelled) { release(run); return; }
      const mimeType = ['audio/webm;codecs=opus', 'audio/webm'].find(type => MediaRecorder.isTypeSupported(type));
      run.recorder = new MediaRecorder(run.stream, mimeType ? { mimeType } : undefined);
      run.recorder.ondataavailable = event => { if (event.data.size) run.chunks.push(event.data); };
      run.recorder.onstop = () => { if (!run.cancelled) transcribe(run); };
      run.recorder.onerror = () => { cancel(); publish('error', 'Microphone recording failed. Try again.'); };
      run.browser = startBrowserRecognition(run.settings.language, id, () => {});
      run.recorder.start(250);
      run.stream.getAudioTracks().forEach(track => { track.onended = () => { if (!run.cancelled && status.current === 'listening') stop(); }; });
      run.limit = setTimeout(stop, 60000);
      publish('listening', 'Listening — click to stop (up to 60 seconds)', run.browser ? 'Browser speech' : 'Local speech');
    } catch (error) {
      release(run);
      if (run.id) bridge()?.cancelDictation(run.id).catch(() => {});
      if (session.current === run) session.current = null;
      if (!run.cancelled) publish(['NotAllowedError', 'SecurityError'].includes(error.name) ? 'permission-required' : 'error', microphoneError(error));
    }
  };
  const stop = () => {
    const run = session.current;
    if (run?.recorder?.state === 'recording') { publish('processing', 'Processing speech…'); run.recorder.stop(); }
  };
  action.current = () => { if (status.current === 'listening') stop(); else if (!session.current) start(); };
  useEffect(() => {
    let active = true;
    bridge()?.getSettings().then(value => { if (active) { settings.current = value; if (!value.enabled) publish('paused', 'Paused'); } }).catch(() => {});
    const offState = bridge()?.onAppState(value => {
      settings.current = { ...settings.current, ...value };
      if (!value.enabled && status.current !== 'paused') { cancel(); publish('paused', 'Paused'); }
      else if (value.enabled && status.current === 'paused') publish('idle', 'Ready — click to dictate, drag to move');
    });
    const offToggle = bridge()?.onToggleRecording(() => action.current());
    return () => { active = false; offState?.(); offToggle?.(); cancel(); clearTimeout(reset.current); };
  }, []);
  const down = event => {
    if (event.button !== 0) return;
    event.preventDefault();
    event.currentTarget.setPointerCapture(event.pointerId);
    pointer.current = { x: event.screenX, y: event.screenY, moved: false };
    bridge()?.dragWidget('start');
  };
  const move = event => {
    const point = pointer.current;
    if (!point) return;
    if (Math.hypot(event.screenX - point.x, event.screenY - point.y) >= 6) point.moved = true;
    if (point.moved) bridge()?.dragWidget('move');
  };
  const up = event => {
    const point = pointer.current;
    if (!point) return;
    pointer.current = null;
    if (event.currentTarget.hasPointerCapture(event.pointerId)) event.currentTarget.releasePointerCapture(event.pointerId);
    bridge()?.dragWidget(point.moved ? 'end' : 'cancel');
    if (!point.moved && event.type !== 'pointercancel') action.current();
  };
  const busy = state === 'processing' || state === 'ai-processing';
  return <div className="widget-shell" title={message}>
    <button className={`widget-button widget-${state}`} aria-label={message} aria-pressed={state === 'listening'}
      onPointerDown={down} onPointerMove={move} onPointerUp={up} onPointerCancel={up}
      onClick={event => { if (event.detail === 0) action.current(); }}>
      {busy ? <span className="widget-spinner" /> : state === 'success' ? <CheckIcon size={23} /> : ['error', 'permission-required'].includes(state) ? <AlertIcon size={23} /> : <MicIcon size={23} />}
      {state === 'listening' && <span className="widget-live-dot" />}
    </button>
  </div>;
}
