// Run from the repository root: node --test tests/textInsertion.test.js
// Service regression tests only: PowerShell, Win32, Electron's clipboard, and
// process lifecycle are mocked. These do NOT establish native UIA correctness
// or actual editor acceptance. No applications or OS clipboard are touched.
const { test } = require('node:test');
const assert = require('node:assert/strict');
const { EventEmitter, getEventListeners } = require('node:events');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const { randomUUID } = require('node:crypto');

const servicePath = path.resolve(__dirname, '../electron/services/textInsertion.js');
const source = fs.readFileSync(servicePath, 'utf8');
const TARGET = {
  window: '100', focus: '101', processStart: '638928001234567890',
  pid: 77, focusPid: 77, thread: 88, uia: '77:42.3', capturedAt: '2026-09-07T12:00:00.000Z'
};
const format = (id, name, bytes) => ({ id, name, kind: 'global', data: bytes.toString('base64') });
const ORIGINAL = [
  format(13, '', Buffer.from('original text\0', 'utf16le')),
  format(50001, 'HTML Format', Buffer.from('<b>original text</b>\0')),
  format(50002, 'application/example-private', Buffer.from([0, 255, 17, 128, 0])),
  format(8, '', Buffer.from([40, 0, 0, 0, 255, 0, 127, 255]))
];
const clone = value => JSON.parse(JSON.stringify(value));
const failure = (code, details = {}) => ({ error: {
  code, message: 'Focus the intended field and retry the saved transcript.', details
} });
const HOLD = Symbol('hold helper response');
const flush = () => new Promise(resolve => setImmediate(resolve));

function harness(t, options = {}) {
  // A fresh VM isolates module state without mutating require.cache, global
  // process.platform, real timers, or other concurrently running test files.
  const timers = new Map();
  const requests = [];
  const children = [];
  const spawns = [];
  const electronReads = [];
  let clock = 0;
  let timerId = 0;
  let board = { sequence: 10, formats: clone(ORIGINAL), marker: null, text: 'original text' };
  const fakeProcess = Object.assign(new EventEmitter(), {
    platform: options.platform || 'win32', pid: TARGET.pid,
    env: { SystemRoot: 'C:\\Windows' }, resourcesPath: 'C:\\Orbitvoice\\resources'
  });
  const h = {
    requests, children, spawns, electronReads,
    get clipboard() { return clone(board); },
    copyByUser(formats, preserveMarker = false) {
      board = { sequence: board.sequence + 1, formats: clone(formats),
        marker: preserveMarker ? board.marker : null, text: preserveMarker ? board.text : 'new user copy' };
    },
    count(op) { return requests.filter(request => request.op === op).length; },
    async reach(op, count = 1) {
      for (let i = 0; i < 20; i++) {
        await flush();
        if (h.count(op) >= count) return;
      }
      assert.fail(`Helper never received ${op}; received: ${requests.map(request => request.op)}`);
    },
    async advance(ms) {
      const end = clock + ms;
      await flush();
      while (true) {
        const next = [...timers.entries()].filter(([, timer]) => timer.at <= end)
          .sort((a, b) => a[1].at - b[1].at)[0];
        if (!next) break;
        clock = next[1].at;
        timers.delete(next[0]);
        next[1].callback();
        await flush();
      }
      clock = end;
      await flush();
    },
    async complete(promise) {
      // Observe rejection immediately; drive only this service's virtual timers.
      let settled = false;
      let outcome;
      promise.then(value => { settled = true; outcome = { value }; }, error => { settled = true; outcome = { error }; });
      for (let i = 0; i < 100 && !settled; i++) {
        await flush();
        if (settled) break;
        const next = Math.min(...[...timers.values()].map(timer => timer.at));
        assert(Number.isFinite(next), 'Service is pending without a timer or native response');
        await h.advance(next - clock);
      }
      assert(settled, 'Service failed to settle within 100 virtual timer advances');
      if (outcome.error) throw outcome.error;
      return outcome.value;
    },
    reply(child, request, result) {
      if (child.killed) return;
      const response = result?.error
        ? { id: request.id, ok: false, error: result.error }
        : { id: request.id, ok: true, result };
      const line = JSON.stringify(response) + '\r\n';
      // Native stdout may split a JSON line across chunks.
      child.stdout.emit('data', line.slice(0, 3));
      child.stdout.emit('data', line.slice(3));
    }
  };

  function nativeOperation(request) {
    // Model only the native protocol boundary. Native target rejections are
    // explicitly injected by tests, rather than pretending to exercise UIA.
    switch (request.op) {
      case 'capture': return clone(TARGET);
      case 'validate': return { valid: true };
      case 'snapshot': return { sequence: board.sequence, formats: clone(board.formats) };
      case 'prepare':
        if (request.sequence !== board.sequence) return failure('CLIPBOARD_CHANGED');
        board = { sequence: board.sequence + 2, marker: request.marker, text: request.text,
          formats: [format(13, '', Buffer.from(request.text + '\0', 'utf16le'))] };
        return { sequence: board.sequence };
      case 'paste': return { inserted: true, verified: false };
      case 'restore': {
        const owned = request.sequence === board.sequence && request.marker === board.marker && request.text === board.text;
        if (!owned) return { restored: false, reason: 'clipboard_changed' };
        board = { sequence: board.sequence + 1, formats: clone(request.formats), marker: null, text: 'original text' };
        return { restored: true };
      }
      case 'shutdown': return { stopped: true };
      default: assert.fail(`Unexpected native operation: ${request.op}`);
    }
  }

  function spawn(executable, args, spawnOptions) {
    spawns.push({ executable, args: [...args], options: clone(spawnOptions) });
    const child = new EventEmitter();
    children.push(child);
    child.stdout = new EventEmitter();
    child.stderr = new EventEmitter();
    child.stdin = new EventEmitter();
    child.stdout.setEncoding = child.stderr.setEncoding = encoding => assert.equal(encoding, 'utf8');
    child.kill = () => {
      if (child.killed) return;
      child.killed = true;
      queueMicrotask(() => child.emit('close', 0));
    };
    child.stdin.write = (line, encoding, callback) => {
      assert.equal(encoding, 'utf8');
      assert.equal(line.split('\n').length, 2, 'Each request must be exactly one JSON line');
      const request = JSON.parse(line);
      assert(!requests.some(previous => previous.id === request.id), 'Request IDs must remain unique across helper restarts');
      requests.push(request);
      queueMicrotask(() => {
        if (child.killed) return;
        const override = options.before?.(request, h, child);
        const result = override === undefined ? nativeOperation(request) : override;
        options.after?.(request, result, h, child);
        callback();
        if (result !== HOLD) h.reply(child, request, result);
      });
    };
    queueMicrotask(() => {
      if (options.spawnError) child.emit('error', new Error('Helper script missing'));
      else if (!options.startHang) child.stdout.emit('data', '{"ready":true}\n');
    });
    return child;
  }

  const dependencies = {
    electron: { app: { isPackaged: Boolean(options.packaged) }, clipboard: {
      availableFormats() {
        if (options.electronReadError) throw new Error('Clipboard temporarily unavailable to Electron');
        return ['HTML Format', 'application/example-private', 'text/plain'];
      },
      readBuffer(name) {
        electronReads.push(name);
        // The private representation deliberately disagrees with native bytes;
        // the authoritative native snapshot must win over conversions/aliases.
        return Buffer.from(name === 'HTML Format' ? '<b>original text</b>\0' : 'converted Electron data');
      },
      writeText() { assert.fail('The real clipboard must only be written by the native protocol'); },
      writeBuffer() { assert.fail('Do not restore multi-format clipboard data with separate Electron writes'); }
    } },
    child_process: { spawn }, crypto: { randomUUID }, path: path.win32
  };
  const context = {
    module: { exports: {} }, Buffer, process: fakeProcess,
    __dirname: 'C:\\Orbitvoice\\electron\\services',
    setTimeout(callback, ms) { const id = ++timerId; timers.set(id, { at: clock + ms, callback }); return id; },
    clearTimeout(id) { timers.delete(id); },
    require(name) {
      assert(Object.hasOwn(dependencies, name), `Unmocked service dependency: ${name}`);
      return dependencies[name];
    }
  };
  vm.runInNewContext(source, context, { filename: servicePath });
  h.api = context.module.exports;
  t.after(async () => {
    try {
      await h.complete(h.api.shutdownInputHelper());
      assert.equal(timers.size, 0, 'Shutdown must clear all service timers');
      assert(children.every(child => child.killed), 'Shutdown must terminate every mocked helper');
    } finally {
      fakeProcess.emit('exit');
      timers.clear();
    }
  });
  return h;
}

test('capture preserves the native token, including the app itself; concurrent replies correlate by ID', async t => {
  const held = [];
  const h = harness(t, { before(request, _h, child) {
    if (request.op === 'capture') { held.push({ request, child }); return HOLD; }
  } });
  const first = h.api.captureTarget();
  const second = h.api.captureTarget();
  await h.reach('capture', 2);
  h.reply(held[1].child, held[1].request, { ...TARGET, uia: '77:second' });
  h.reply(held[0].child, held[0].request, TARGET);
  assert.deepEqual(clone(await first), TARGET);
  assert.equal((await second).uia, '77:second');
  assert.equal(h.spawns.length, 1, 'Captures reuse the persistent helper');
});

test('Unicode and command-like transcript stay in JSON stdin; dispatch remains unverified', async t => {
  const h = harness(t);
  const target = await h.api.captureTarget();
  const text = 'اردو 中文 🙂\n$(Get-Secret); `literal` "quoted" \\path';
  const result = await h.complete(h.api.pasteIntoFocusedField(text, target));
  assert.deepEqual(clone(result), { inserted: true, verified: false, clipboardRestored: true });
  assert.equal(h.requests.find(request => request.op === 'prepare').text, text);
  assert.deepEqual(h.requests.find(request => request.op === 'paste').target, TARGET);
  const child = h.spawns[0];
  assert.equal(child.options.windowsHide, true);
  assert.equal(child.options.shell, false);
  assert(child.args.includes('-File'));
  assert(!child.args.includes('-Command'));
  assert(!child.args.join(' ').includes(text));
  assert.equal(child.args.at(-1), 'C:\\Orbitvoice\\electron\\native\\input.ps1');
  assert.equal(h.spawns.length, 1);
});

test('packaged helper resolves outside app.asar in resources/native', async t => {
  const h = harness(t, { packaged: true });
  await h.api.captureTarget();
  assert.equal(h.spawns[0].args.at(-1), 'C:\\Orbitvoice\\resources\\native\\input.ps1');
});

test('invalid text, targets, and signals reject before spawning or clipboard access', async t => {
  const h = harness(t);
  for (const [text, target, signal, code] of [
    [' ', TARGET, undefined, 'EMPTY_TEXT'], ['text', undefined, undefined, 'TARGET_REQUIRED'],
    ['text', { ...TARGET, focus: 101 }, undefined, 'TARGET_REQUIRED'],
    ['text', { ...TARGET, processStart: '0' }, undefined, 'TARGET_REQUIRED'],
    ['a\0b', TARGET, undefined, 'INVALID_TEXT'], ['x'.repeat(2 * 1024 * 1024 + 1), TARGET, undefined, 'INVALID_TEXT'],
    ['text', TARGET, {}, 'INVALID_SIGNAL']
  ]) await assert.rejects(h.api.pasteIntoFocusedField(text, target, signal), error => error.code === code);
  assert.equal(h.spawns.length, 0);
});

for (const phase of ['validate', 'prepare', 'paste']) {
  test(`native changed-target rejection at ${phase} never recaptures or retries`, async t => {
    const h = harness(t, { before: request => request.op === phase ? failure('TARGET_CHANGED') : undefined });
    await h.complete(assert.rejects(h.api.pasteIntoFocusedField('saved transcript', TARGET), error => error.code === 'TARGET_CHANGED'));
    assert.equal(h.count('capture'), 0, 'The service must not silently capture a newly focused field');
    assert.equal(h.count('paste'), phase === 'paste' ? 1 : 0);
    assert.deepEqual(h.clipboard.formats, ORIGINAL);
    for (const request of h.requests.filter(request => request.target)) assert.deepEqual(request.target, TARGET);
  });
}

for (const code of ['TARGET_READ_ONLY', 'TARGET_UNSUPPORTED', 'MODIFIER_HELD', 'CLIPBOARD_UNSUPPORTED']) {
  test(`${code} propagates without requesting input dispatch`, async t => {
    const phase = code === 'CLIPBOARD_UNSUPPORTED' ? 'snapshot' : 'validate';
    const h = harness(t, { before: request => request.op === phase ? failure(code) : undefined });
    await h.complete(assert.rejects(h.api.pasteIntoFocusedField('saved transcript', TARGET), error => error.code === code));
    assert.equal(h.count('paste'), 0);
    assert.equal(h.count('prepare'), 0);
    assert.deepEqual(h.clipboard.formats, ORIGINAL);
  });
}

test('restoration waits for editor consumption and preserves every native format byte', async t => {
  const h = harness(t);
  const paste = h.api.pasteIntoFocusedField('new text', TARGET);
  await h.reach('paste');
  assert.equal(h.count('restore'), 0);
  await h.advance(1499);
  assert.equal(h.count('restore'), 0, 'Clipboard must remain available during the consumption delay');
  await h.advance(1);
  assert.equal((await paste).clipboardRestored, true);
  assert.deepEqual(h.clipboard.formats, ORIGINAL);
  assert.deepEqual(h.requests.find(request => request.op === 'restore').formats, ORIGINAL);
  assert(h.electronReads.includes('HTML Format'));
});

test('native clipboard backup survives Electron enumeration failure', async t => {
  const h = harness(t, { electronReadError: true });
  assert.equal((await h.complete(h.api.pasteIntoFocusedField('new text', TARGET))).clipboardRestored, true);
  assert.deepEqual(h.clipboard.formats, ORIGINAL);
});

test('concurrent copy before prepare prevents paste and retains the new clipboard', async t => {
  const userFormats = [format(13, '', Buffer.from('new user copy\0', 'utf16le'))];
  const h = harness(t, { before(request, state) { if (request.op === 'prepare') state.copyByUser(userFormats); } });
  await h.complete(assert.rejects(h.api.pasteIntoFocusedField('text', TARGET), error => error.code === 'CLIPBOARD_CHANGED'));
  assert.equal(h.count('paste'), 0);
  assert.deepEqual(h.clipboard.formats, userFormats);
});

for (const preserveMarker of [false, true]) {
  test(`concurrent copy after dispatch is retained (${preserveMarker ? 'same marker/text, newer sequence' : 'new content'})`, async t => {
    const h = harness(t);
    const paste = h.api.pasteIntoFocusedField('new text', TARGET);
    await h.reach('paste');
    const userFormats = preserveMarker ? h.clipboard.formats : [format(50003, 'user-data', Buffer.from([8, 9, 0]))];
    const preparedSequence = h.clipboard.sequence;
    h.copyByUser(userFormats, preserveMarker);
    const result = await h.complete(paste);
    assert.equal(result.inserted, true);
    assert.equal(result.clipboardRestored, false);
    assert.deepEqual(h.clipboard.formats, userFormats);
    const restore = h.requests.find(request => request.op === 'restore');
    assert.equal(restore.sequence, preparedSequence, 'Restore must carry the original ownership sequence');
    assert.notEqual(restore.sequence, h.clipboard.sequence);
  });
}

test('already-aborted signal performs no capture, clipboard access, or dispatch', async t => {
  const h = harness(t);
  const controller = new AbortController();
  controller.abort();
  await h.complete(assert.rejects(h.api.pasteIntoFocusedField('text', TARGET, controller.signal), error => error.code === 'ABORT_ERR' && !error.mayHaveInserted));
  assert.equal(h.spawns.length, 0);
});

for (const phase of ['validate', 'snapshot', 'prepare']) {
  test(`cancellation after ${phase} prevents paste and restores any staged clipboard`, async t => {
    const controller = new AbortController();
    const h = harness(t, { after(request) { if (request.op === phase) controller.abort(); } });
    await h.complete(assert.rejects(h.api.pasteIntoFocusedField('text', TARGET, controller.signal), error => error.code === 'ABORT_ERR' && !error.mayHaveInserted));
    assert.equal(h.count('paste'), 0);
    assert.deepEqual(h.clipboard.formats, ORIGINAL);
    if (phase === 'prepare') assert.equal(h.count('restore'), 1);
    assert.equal(getEventListeners(controller.signal, 'abort').length, 0);
  });
}

test('aborting a pending paste terminates its helper, reports uncertainty, and restores without retry', async t => {
  const controller = new AbortController();
  const h = harness(t, { before: request => request.op === 'paste' ? HOLD : undefined });
  const rejected = assert.rejects(h.api.pasteIntoFocusedField('text', TARGET, controller.signal), error => error.code === 'ABORT_ERR' && error.mayHaveInserted);
  await h.reach('paste');
  controller.abort();
  await h.complete(rejected);
  assert(h.children[0].killed);
  assert.equal(h.spawns.length, 2, 'A replacement helper performs conditional restoration');
  assert.equal(h.count('paste'), 1);
  assert.deepEqual(h.clipboard.formats, ORIGINAL);
  assert.equal(getEventListeners(controller.signal, 'abort').length, 0);
});

test('abort after dispatch acknowledgement does not misreport the completed input as canceled', async t => {
  const controller = new AbortController();
  const h = harness(t);
  const paste = h.api.pasteIntoFocusedField('text', TARGET, controller.signal);
  await h.reach('paste');
  controller.abort();
  const result = await h.complete(paste);
  assert.equal(result.inserted, true);
  assert.equal(result.verified, false);
  assert.equal(h.spawns.length, 1);
  assert.equal(getEventListeners(controller.signal, 'abort').length, 0);
});

test('queued insertions snapshot targets immediately and restore before the next snapshot', async t => {
  const h = harness(t);
  const mutableTarget = { ...TARGET };
  const first = h.api.pasteIntoFocusedField('first', mutableTarget);
  mutableTarget.uia = '77:different-field';
  const second = h.api.pasteIntoFocusedField('second', TARGET);
  await h.complete(Promise.all([first, second]));
  assert.deepEqual(h.requests[0].target, TARGET);
  const snapshots = h.requests.map((request, index) => request.op === 'snapshot' ? index : -1).filter(index => index >= 0);
  const restores = h.requests.map((request, index) => request.op === 'restore' ? index : -1).filter(index => index >= 0);
  assert.equal(snapshots.length, 2);
  assert(restores[0] < snapshots[1], 'Never capture the previous insertion as the next clipboard backup');
  assert.deepEqual(h.clipboard.formats, ORIGINAL);
});

test('partial SendInput counts and uncertainty survive rejection; no automatic retry occurs', async t => {
  const details = { sent: 2, expected: 4, win32Error: 0, cleanupSent: 2, mayHaveInserted: true };
  const h = harness(t, { before: request => request.op === 'paste' ? failure('SEND_INPUT_FAILED', details) : undefined });
  await h.complete(assert.rejects(h.api.pasteIntoFocusedField('text', TARGET), error => {
    assert.equal(error.code, 'SEND_INPUT_FAILED');
    for (const [key, value] of Object.entries(details)) assert.equal(error[key], value);
    return true;
  }));
  assert.equal(h.count('paste'), 1);
  assert.deepEqual(h.clipboard.formats, ORIGINAL);
});

test('hung paste times out, terminates the helper, and restores via a fresh helper', async t => {
  const h = harness(t, { before: request => request.op === 'paste' ? HOLD : undefined });
  await h.complete(assert.rejects(h.api.pasteIntoFocusedField('text', TARGET), error => error.code === 'HELPER_TIMEOUT' && error.mayHaveInserted));
  assert(h.children[0].killed);
  assert.equal(h.spawns.length, 2);
  assert.equal(h.count('paste'), 1);
  assert.deepEqual(h.clipboard.formats, ORIGINAL);
});

for (const raw of ['not-json\n', 'null\n']) {
  test(`invalid native response ${raw.trim()} rejects without crashing the stdout handler`, async t => {
    const h = harness(t, { before(request, _h, child) {
      if (request.op === 'capture') { child.stdout.emit('data', raw); return HOLD; }
    } });
    await h.complete(assert.rejects(h.api.captureTarget(), error => error.code === 'HELPER_PROTOCOL'));
    assert(h.children[0].killed);
  });
}

for (const [options, code] of [[{ spawnError: true }, 'HELPER_START_FAILED'], [{ startHang: true }, 'HELPER_TIMEOUT']]) {
  test(`helper startup failure reports ${code}`, async t => {
    const h = harness(t, options);
    await h.complete(assert.rejects(h.api.captureTarget(), error => error.code === code));
    assert(h.children[0].killed);
  });
}

test('restore failure becomes a clipboard warning after successful dispatch', async t => {
  const h = harness(t, { before: request => request.op === 'restore' ? failure('CLIPBOARD_BUSY') : undefined });
  const result = await h.complete(h.api.pasteIntoFocusedField('text', TARGET));
  assert.equal(result.inserted, true);
  assert.equal(result.verified, false);
  assert.equal(result.clipboardRestored, false);
  assert.match(result.clipboardWarning, /could not be restored/i);
  assert.equal(h.count('paste'), 1);
});

test('awaited shutdown waits for restoration, cancels queued paste, and is idempotent', async t => {
  const h = harness(t);
  const first = h.api.pasteIntoFocusedField('first', TARGET);
  await h.reach('paste');
  const queued = assert.rejects(h.api.pasteIntoFocusedField('second', TARGET), error => error.code === 'INPUT_SHUTDOWN');
  let finished = false;
  const shutdown = h.api.shutdownInputHelper();
  shutdown.then(() => { finished = true; });
  assert.equal(shutdown, h.api.shutdownInputHelper());
  await flush();
  assert.equal(finished, false);
  assert.equal(h.count('shutdown'), 0);
  await h.complete(Promise.all([first, queued, shutdown]));
  assert.equal(h.count('paste'), 1);
  assert.equal(h.count('shutdown'), 1);
  assert.deepEqual(h.clipboard.formats, ORIGINAL);
  assert(h.children.every(child => child.killed));
  await assert.rejects(h.api.captureTarget(), error => error.code === 'INPUT_SHUTDOWN');
});

test('non-Windows rejection never spawns the Windows helper', async t => {
  const h = harness(t, { platform: 'linux' });
  await assert.rejects(h.api.captureTarget(), error => error.code === 'UNSUPPORTED_PLATFORM');
  assert.equal(h.spawns.length, 0);
});
