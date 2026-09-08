'use client';
import { useEffect, useRef, useState } from 'react';
import { AlertIcon, CheckIcon, MicIcon } from '../../components/icons';
import { disposeRecognition, localRequest, microphoneError, startBrowserRecognition } from '../../services/recognition.mjs';
import { captureAudio } from '../../services/audio-capture';
import { cleanTranscript } from '../../services/speech-utils.mjs';
import { TranscriptionSession } from '../../services/transcription-session.mjs';

export default function WidgetPage() {
  const [state, setState] = useState('idle');
  const [message, setMessage] = useState('Ready — click to dictate, drag to move');
  const status = useRef('idle');
  const settings = useRef({ enabled: true, language: 'auto', microphoneId: 'default' });
  const session = useRef(null);
  const action = useRef(null);
  const pointer = useRef(null);
  const reset = useRef(null);
  const warmup = useRef(null);
  const idleUnload = useRef(null);
  const bridge = () => window.voiceToText;
  const publish = (next, detail, engine) => {
    clearTimeout(reset.current);
    status.current = next;
    setState(next); setMessage(detail);
    bridge()?.recordingState(next, detail, engine);
  };
  const release = run => {
    clearTimeout(run?.limit);
    run?.capture?.cancel();
    run?.stream?.getTracks().forEach(track => track.stop());
    run?.browser?.cancel();
    run?.transcription?.cancel();
  };
  const cancel = () => {
    const run = session.current;
    session.current = null;
    if (run) {
      run.cancelled = true;
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
    clearTimeout(run.limit);
    try {
      // Stop browser and PCM capture together; stopping either one never waits
      // for the inference worker, so the microphone is released immediately.
      const [audio, browserText] = await Promise.all([run.capture.stop(), run.browser?.stop()]);
      let text = browserText;
      if (run.cancelled) return;
      let engine = 'Browser speech';
      if (!text) {
        engine = `Whisper ${run.settings.speechModel || 'base'} · local`;
        publish('transcribing', 'Transcribing on your device…', engine);
        // Reuse only a full inference over identical PCM, never interim tokens.
        // Otherwise interrupt stale preview decoding without unloading the model.
        text = await run.transcription.finish(audio);
      }
      if (run.cancelled) return;
      if (!text?.trim()) throw new Error('No speech was detected. Try speaking closer to the microphone.');
      text = cleanTranscript(text, run.settings.language);
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
      clearTimeout(idleUnload.current);
      idleUnload.current = setTimeout(() => { if (!session.current) disposeRecognition(); }, 300000);
    }
  };
  const start = async () => {
    if (!settings.current.enabled || session.current) return;
    clearTimeout(warmup.current);
    clearTimeout(idleUnload.current);
    const run = { settings: { ...settings.current }, cancelled: false, stopping: false, lastPreviewAt: 0, lastTelemetryAt: 0 };
    run.transcription = new TranscriptionSession((audio, signal) => localRequest(audio, run.settings.language,
      detail => { if (run.stopping && !run.cancelled) publish('transcribing', detail, `Whisper ${run.settings.speechModel || 'base'} · local`); },
      { model: run.settings.speechModel, signal, onPartial: text => preview(run, text) }));
    session.current = run;
    publish('processing', 'Preparing microphone…');
    try {
      if (!bridge()) throw new Error('Open the desktop app to dictate into another application.');
      run.id = await bridge().beginDictation();
      if (run.cancelled) { await bridge().cancelDictation(run.id); return; }
      // Warm in parallel with device acquisition and speech, even when the user
      // starts before the idle warm-up timer fires. Never delay microphone start.
      void localRequest(null, run.settings.language, undefined, { model: run.settings.speechModel }).catch(() => {});
      if (!navigator.mediaDevices?.getUserMedia) throw new Error('Microphone recording is unavailable on this computer.');
      const id = run.settings.microphoneId;
      run.capture = await captureAudio(async () => {
        run.stream = await navigator.mediaDevices.getUserMedia({ audio: {
          ...(id && id !== 'default' ? { deviceId: { exact: id } } : {}),
          channelCount: 1, echoCancellation: true, noiseSuppression: true, autoGainControl: true,
        } });
        if (run.cancelled) { release(run); throw new Error('Recording cancelled.'); }
        return run.stream;
      }, {
        autoStop: run.settings.autoStopSilence !== false,
        onStop: reason => stop(reason),
        onActivity: activity => {
          if (run.cancelled || run.stopping) return;
          const now = performance.now();
          if (now - run.lastTelemetryAt >= 200) {
            run.lastTelemetryAt = now;
            bridge()?.recordingProgress?.(run.id, { elapsed: Math.floor(activity.elapsed / 1000), level: activity.level });
          }
          const next = activity.hasSpeech && activity.silenceMs < 350 ? 'recording' : 'listening';
          if (status.current !== next) publish(next, activity.speaking ? 'Recording your voice…' : 'Listening — pauses of 3 seconds finish your dictation');
          const speechEnd = activity.elapsed - activity.silenceMs;
          // Speculate during the silence grace period while the microphone stays
          // open. Resumed speech invalidates this candidate; it is never inserted.
          const endpoint = activity.silenceMs >= 600 && run.lastPreviewEnd !== speechEnd;
          const periodic = !run.transcription.busy && activity.speaking && activity.elapsed - run.lastPreviewAt >= 6000;
          if (!run.browser && activity.hasSpeech && !run.snapshotBusy && (endpoint || periodic) && activity.elapsed < 28000) {
            run.snapshotBusy = true; run.lastPreviewAt = activity.elapsed;
            if (endpoint) run.lastPreviewEnd = speechEnd;
            void (async () => {
              const audio = await run.capture.snapshot(true);
              run.snapshotBusy = false;
              if (run.cancelled || run.stopping) return;
              const text = await run.transcription.preview(audio);
              if (text && !run.stopping) preview(run, text);
            })().catch(() => { run.snapshotBusy = false; });
          }
        },
      });
      if (run.cancelled) { release(run); return; }
      if (run.settings.browserRecognition) run.browser = startBrowserRecognition(run.settings.language, id, text => preview(run, text));
      run.stream.getAudioTracks().forEach(track => { track.onended = () => { if (!run.cancelled && !run.stopping) stop('device-ended'); }; });
      run.limit = setTimeout(stop, 60000);
      publish('listening', 'Listening — speak naturally, then pause to finish', run.browser ? 'Browser speech' : `Whisper ${run.settings.speechModel || 'base'} · local`);
    } catch (error) {
      release(run);
      if (run.id) bridge()?.cancelDictation(run.id).catch(() => {});
      if (session.current === run) session.current = null;
      if (!run.cancelled) publish(['NotAllowedError', 'SecurityError'].includes(error.name) ? 'permission-required' : 'error', microphoneError(error));
    }
  };
  const preview = (run, text) => {
    if (!run.cancelled && session.current === run) bridge()?.recordingProgress?.(run.id, { interimTranscript: String(text).slice(0, 20000) });
  };
  const stop = (reason = 'manual') => {
    const run = session.current;
    if (run?.capture && !run.stopping && !run.cancelled) {
      run.stopping = true;
      publish('processing', reason === 'silence' ? 'Pause detected — finishing your transcript…' : 'Finishing your transcript…');
      void transcribe(run);
    }
  };
  action.current = () => { if (['listening', 'recording'].includes(status.current)) stop(); else if (!session.current) start(); };
  useEffect(() => {
    let active = true;
    bridge()?.getSettings().then(value => {
      if (!active) return;
      settings.current = value;
      if (!value.enabled) publish('paused', 'Paused');
      // Warm the selected model without acquiring microphone access.
      if (value.enabled) warmup.current = setTimeout(() => { if (!session.current) localRequest(null, value.language, undefined, { model: value.speechModel }).catch(() => {}); }, 1000);
    }).catch(() => {});
    const offState = bridge()?.onAppState(value => {
      settings.current = { ...settings.current, ...value };
      if (!value.enabled && status.current !== 'paused') { cancel(); publish('paused', 'Paused'); }
      else if (value.enabled && status.current === 'paused') publish('idle', 'Ready — click to dictate, drag to move');
    });
    const offToggle = bridge()?.onToggleRecording(() => action.current());
    return () => { active = false; offState?.(); offToggle?.(); cancel(); clearTimeout(reset.current); clearTimeout(warmup.current); clearTimeout(idleUnload.current); };
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
  const busy = ['processing', 'ai-processing', 'transcribing'].includes(state);
  return <div className="widget-shell" title={message}>
    <button className={`widget-button widget-${state}`} aria-label={message} aria-pressed={state === 'listening' || state === 'recording'}
      onPointerDown={down} onPointerMove={move} onPointerUp={up} onPointerCancel={up}
      onClick={event => { if (event.detail === 0) action.current(); }}>
      {busy ? <span className="widget-spinner" /> : state === 'success' ? <CheckIcon size={23} /> : ['error', 'permission-required'].includes(state) ? <AlertIcon size={23} /> : <MicIcon size={23} />}
      {['listening', 'recording'].includes(state) && <span className="widget-live-dot" />}
    </button>
  </div>;
}
