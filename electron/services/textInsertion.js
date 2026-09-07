const { app, clipboard } = require('electron');
const { spawn } = require('child_process');
const { randomUUID } = require('crypto');
const path = require('path');

// Main-process API: capture BEFORE recording (and before focusing recording UI).
// Keep the token with that recording. Retain the transcript on errors; do not
// retry automatically, since timeout/partial SendInput errors may deliver input.
const RESTORE_DELAY_MS = 1500;
const REQUEST_TIMEOUT_MS = 8000;
const START_TIMEOUT_MS = 20000;
const MAX_TEXT_BYTES = 2 * 1024 * 1024;
const MAX_PROTOCOL_BYTES = 96 * 1024 * 1024;
let helper;
let nextId = 0;
let pasteQueue = Promise.resolve();
let stopping = false;
let shutdownPromise;

function inputError(code, message, details = {}) {
  return Object.assign(new Error(message), { code, ...details });
}

function stopHelper(state, error) {
  if (state.dead) return;
  state.dead = true;
  clearTimeout(state.startTimer);
  state.rejectReady(error);
  for (const pending of state.pending.values()) {
    clearTimeout(pending.timer);
    pending.cleanup();
    pending.reject(inputError(error.code, error.message, {
      ...error, mayHaveInserted: pending.op === 'paste' || Boolean(error.mayHaveInserted)
    }));
  }
  state.pending.clear();
  if (helper === state) helper = undefined;
  state.child.kill();
}

function getHelper() {
  if (process.platform !== 'win32') {
    throw inputError('UNSUPPORTED_PLATFORM', 'Automatic text insertion is only supported on Windows. Copy the saved transcript manually.');
  }
  if (helper) return helper;
  const script = app.isPackaged
    ? path.join(process.resourcesPath, 'native', 'input.ps1')
    : path.join(__dirname, '..', 'native', 'input.ps1');
  const executable = path.join(process.env.SystemRoot || 'C:\\Windows', 'System32', 'WindowsPowerShell', 'v1.0', 'powershell.exe');
  const child = spawn(executable, [
    '-NoLogo', '-NoProfile', '-NonInteractive', '-STA', '-WindowStyle', 'Hidden',
    '-ExecutionPolicy', 'Bypass', '-File', script
  ], { windowsHide: true, shell: false, stdio: ['pipe', 'pipe', 'pipe'] });
  const state = { child, pending: new Map(), output: '', stderr: '', dead: false };
  state.ready = new Promise((resolve, reject) => {
    state.resolveReady = resolve;
    state.rejectReady = reject;
  });
  state.ready.catch(() => {});
  helper = state;
  state.startTimer = setTimeout(() => stopHelper(state, inputError('HELPER_TIMEOUT',
    'The Windows input helper did not start in time. Retry recording; the transcript is retained.')), START_TIMEOUT_MS);
  child.stdout.setEncoding('utf8');
  child.stderr.setEncoding('utf8');
  child.stderr.on('data', (chunk) => { state.stderr = (state.stderr + chunk).slice(-4096); });
  child.stdout.on('data', (chunk) => {
    state.output += chunk;
    if (Buffer.byteLength(state.output, 'utf8') > MAX_PROTOCOL_BYTES) {
      stopHelper(state, inputError('HELPER_PROTOCOL', 'The Windows input helper exceeded its response limit.'));
      return;
    }
    let end;
    while ((end = state.output.indexOf('\n')) !== -1) {
      const line = state.output.slice(0, end).trim();
      state.output = state.output.slice(end + 1);
      if (!line) continue;
      let response;
      try { response = JSON.parse(line); } catch {
        stopHelper(state, inputError('HELPER_PROTOCOL', 'The Windows input helper returned an invalid response.'));
        return;
      }
      if (!response || typeof response !== 'object' || Array.isArray(response)) {
        stopHelper(state, inputError('HELPER_PROTOCOL', 'The Windows input helper returned an invalid response.'));
        return;
      }
      if (response.ready === true) {
        clearTimeout(state.startTimer);
        state.resolveReady();
        continue;
      }
      const pending = state.pending.get(response.id);
      if (!pending) continue;
      clearTimeout(pending.timer);
      pending.cleanup();
      state.pending.delete(response.id);
      if (response.ok === true) pending.resolve(response.result);
      else pending.reject(inputError(response.error?.code || 'INPUT_FAILED',
        response.error?.message || 'Windows could not insert the text. Copy the saved transcript manually.',
        response.error?.details || {}));
    }
  });
  child.on('error', (error) => stopHelper(state, inputError('HELPER_START_FAILED',
    `The Windows input helper could not start: ${error.message}. Check that native/input.ps1 is installed.`)));
  child.stdin.on('error', () => stopHelper(state, inputError('HELPER_DISCONNECTED',
    'The Windows input helper disconnected. Check the field before retrying the saved transcript.', { mayHaveInserted: true })));
  child.on('close', () => stopHelper(state, inputError('HELPER_EXITED',
    'The Windows input helper stopped. Check the field before retrying the saved transcript.',
    { mayHaveInserted: true, diagnostic: state.stderr })));
  return state;
}

function checkCancellation(signal) {
  if (signal?.aborted) throw inputError('ABORT_ERR', 'Text insertion was canceled. The transcript is retained.', { mayHaveInserted: false });
}

async function request(op, payload = {}, allowStopping = false, signal) {
  checkCancellation(signal);
  if (stopping && !allowStopping) throw inputError('INPUT_SHUTDOWN', 'Windows text insertion is shutting down.');
  const state = getHelper();
  await state.ready;
  checkCancellation(signal);
  if (state.dead) throw inputError('HELPER_EXITED', 'The Windows input helper stopped.');
  const id = ++nextId;
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => stopHelper(state, inputError('HELPER_TIMEOUT',
      'Windows text insertion timed out. Check the field before retrying the saved transcript.',
      { mayHaveInserted: op === 'paste' })), REQUEST_TIMEOUT_MS);
    const abort = () => stopHelper(state, inputError('ABORT_ERR',
      'Text insertion was canceled. Check the field before retrying the saved transcript.',
      { mayHaveInserted: op === 'paste' }));
    const cleanup = () => signal?.removeEventListener('abort', abort);
    state.pending.set(id, { resolve, reject, timer, op, cleanup });
    signal?.addEventListener('abort', abort, { once: true });
    if (signal?.aborted) { abort(); return; }
    // JSON is data on stdin, never part of a command or PowerShell source.
    state.child.stdin.write(`${JSON.stringify({ id, op, ...payload })}\n`, 'utf8', (error) => {
      if (error) stopHelper(state, inputError('HELPER_DISCONNECTED', 'The Windows input helper disconnected.',
        { mayHaveInserted: op === 'paste' }));
    });
  });
}

async function captureTarget() {
  return request('capture');
}

function validTarget(target) {
  return target && ['window', 'focus', 'processStart'].every((key) =>
    typeof target[key] === 'string' && /^\d+$/.test(target[key]) && target[key] !== '0') &&
    ['pid', 'thread', 'focusPid'].every((key) => Number.isInteger(target[key]) && target[key] > 0) &&
    (target.uia === null || typeof target.uia === 'string');
}

async function snapshotClipboard() {
  // Native enumeration includes formats Electron does not expose (DIB, HDROP,
  // locale, custom formats). It rejects unsafe opaque handles before any write.
  const snapshot = await request('snapshot');
  // Prefer Electron buffers where they exactly match the native representation.
  // Never mistake a MIME alias or conversion for the native format's bytes.
  const electronBuffers = new Map();
  let bytesRead = 0;
  try {
    for (const format of clipboard.availableFormats('clipboard')) {
      try {
        const buffer = Buffer.from(clipboard.readBuffer(format));
        bytesRead += buffer.length;
        if (bytesRead > 32 * 1024 * 1024) break;
        electronBuffers.set(format, buffer);
      } catch { /* Native copy retained. */ }
    }
  } catch { /* Native copy retained when Electron cannot enumerate a format. */ }
  return {
    sequence: snapshot.sequence,
    formats: snapshot.formats.map(({ data, ...format }) => {
      const nativeBuffer = Buffer.from(data, 'base64');
      const electronBuffer = electronBuffers.get(format.name);
      return { ...format, buffer: electronBuffer?.equals(nativeBuffer) ? electronBuffer : nativeBuffer };
    })
  };
}

async function restoreClipboard(job) {
  // Compare marker, text AND sequence under OpenClipboard; restore all formats
  // atomically. Electron writeBuffer in a loop can clear other formats and race.
  try {
    return await request('restore', {
      marker: job.marker, text: job.text, sequence: job.sequence || 0,
      formats: job.snapshot.formats.map(({ buffer, ...format }) => ({ ...format, data: buffer.toString('base64') }))
    }, true);
  } finally {
    job.snapshot.formats = [];
  }
}

async function insert(text, target, signal) {
  checkCancellation(signal);
  await request('validate', { target });
  checkCancellation(signal);
  const snapshot = await snapshotClipboard();
  const job = { marker: randomUUID(), text, snapshot, sequence: 0 };
  let result;
  let failure;
  try {
    checkCancellation(signal);
    const prepared = await request('prepare', { target, text, marker: job.marker, sequence: snapshot.sequence });
    job.sequence = prepared.sequence;
    checkCancellation(signal);
    result = await request('paste', { target, text, marker: job.marker, sequence: job.sequence }, false, signal);
  } catch (error) {
    failure = error;
  } finally {
    // Editors can consume the clipboard after SendInput returns. Serializing
    // through this delay prevents overlapping clipboard snapshots as well.
    await new Promise((resolve) => setTimeout(resolve, RESTORE_DELAY_MS));
    try {
      const restored = await restoreClipboard(job);
      if (result) result.clipboardRestored = restored.restored;
    } catch (error) {
      if (failure) failure.clipboardRestoreError = error.message;
      else if (result) {
        result.clipboardRestored = false;
        result.clipboardWarning = 'Text input was dispatched, but the previous clipboard could not be restored.';
      }
    }
  }
  if (failure) throw failure;
  return result;
}

// Optional third argument is an AbortSignal (not an options object). Aborting
// during prepare lets its reply settle so the clipboard sequence is retained;
// no paste is then requested. Aborting an in-flight paste kills that helper and
// reports uncertainty; input already delivered to Windows cannot be withdrawn.
function pasteIntoFocusedField(text, target, signal) {
  if (stopping) return Promise.reject(inputError('INPUT_SHUTDOWN', 'Windows text insertion is shutting down.'));
  if (typeof text !== 'string' || !text.trim()) {
    return Promise.reject(inputError('EMPTY_TEXT', 'There is no text to insert.'));
  }
  if (text.includes('\0') || Buffer.byteLength(text, 'utf8') > MAX_TEXT_BYTES) {
    return Promise.reject(inputError('INVALID_TEXT', 'The transcript is too large or contains a null character. Copy it manually.'));
  }
  if (!validTarget(target)) {
    return Promise.reject(inputError('TARGET_REQUIRED', 'Focus an editable field and start a new recording to capture its target. The transcript is retained.'));
  }
  if (signal && (typeof signal.aborted !== 'boolean' || typeof signal.addEventListener !== 'function' || typeof signal.removeEventListener !== 'function')) {
    return Promise.reject(inputError('INVALID_SIGNAL', 'The insertion cancellation argument must be an AbortSignal.'));
  }
  // Snapshot the token so a caller cannot retarget an operation while queued.
  const captured = { ...target };
  const task = pasteQueue.then(() => insert(text, captured, signal));
  pasteQueue = task.catch(() => {});
  return task;
}

function shutdownInputHelper() {
  if (shutdownPromise) return shutdownPromise;
  stopping = true;
  shutdownPromise = (async () => {
    // In-flight requests settle and conditionally restore before termination.
    // Queued operations fail with INPUT_SHUTDOWN without dispatching keys.
    await pasteQueue;
    if (helper) {
      const state = helper;
      try { await request('shutdown', {}, true); } catch { /* stopHelper handles failure. */ }
      stopHelper(state, inputError('INPUT_SHUTDOWN', 'Windows text insertion has shut down.'));
    }
  })();
  return shutdownPromise;
}

// Normal quit must await shutdownInputHelper(); emergency exit cannot restore.
process.once('exit', () => { if (helper) helper.child.kill(); });

module.exports = { captureTarget, pasteIntoFocusedField, shutdownInputHelper };
