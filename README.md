# Orbitvoice 1.2.1

Windows voice typing with a floating microphone, multilingual offline recognition, and optional AI text cleanup.

## Install and use

Open `release/1.2.1/Orbitvoice-1.2.1-Setup.exe`. The installer includes Electron, the local service, both local speech models, and the recognition runtime. It creates shortcuts and an uninstaller. Users do not need Node.js, npm, a terminal, an API key, or a first-run model download.

1. Focus an editable field in your application, or the test area in Orbitvoice Overview.
2. Click the floating microphone or press `Ctrl + Shift + Space`.
3. Speak, then pause for three seconds to finish automatically. Click/press again to finish sooner. Each recording is limited to 60 seconds; an empty session stops after 12 seconds. Automatic silence completion can be disabled under Voice input.
4. Keep the destination field focused while speech is processed. Text is inserted at its cursor using Windows paste. Existing text stays in place; selected text is replaced as with normal typing.

Drag the microphone more than six pixels to move it. Dragging does not start recording. Its position is saved and adjusted if a monitor is disconnected. Pause stops recording and cancels pending recognition.

The latest transcript remains in Overview until the app exits. Copy it if the destination rejects paste. Read-only PDFs, protected documents, password fields, applications running at higher privilege, and editors without standard text-input support may reject insertion. Editable PDF form fields and document editors can accept it if they support ordinary paste. The app checks captured native/UI Automation focus before insertion; it does not switch applications to force a paste. Windows input dispatch cannot prove every editor accepted the text.

## Speech and languages

Recognition defaults to the bundled multilingual [`Xenova/whisper-base`](https://huggingface.co/Xenova/whisper-base) model. Voice input also offers the faster, smaller [`Xenova/whisper-tiny`](https://huggingface.co/Xenova/whisper-tiny). Model revisions and SHA-256 hashes are pinned separately in `frontend/public/models/*-manifest.json`. Both models work offline.

The optional [`speech-to-text`](https://github.com/magician11/speech-to-text) integration uses the browser Web Speech API. Enable it explicitly under Voice input; browser recognition may need internet and may fail in Electron. A complete PCM recording is retained in memory so incomplete browser results fall back to the local model.

Choose **Auto-detect** for local language detection, or select a spoken language under Voice input. Custom microphone selection uses the local recorder because browser recognition cannot reliably select a device. Supported choices include English, Urdu, Hindi, Arabic, Spanish, French, German, Portuguese, Chinese, Japanese, Korean, Russian, Turkish and Italian. Accuracy varies by language, accent, microphone and background noise; explicit language selection can help with short clips. The model is small to keep CPU and installer requirements practical.

Offline recognition runs in a Web Worker with bundled WebAssembly files. PCM audio is captured in an AudioWorklet, avoiding an encode/decode round-trip. A noise-adaptive energy detector monitors 100ms audio blocks and keeps a 400ms tail when trimming final silence. No audio is uploaded for local recognition. Local inference may take longer on older CPUs; the UI remains responsive. A quiet/empty recording is reported instead of being inserted.

The dashboard previews partial recognition. Local previews are limited to one active inference and are snapshots of the recording, not text appended to your target. During short recordings, a 600ms pause starts speculative decoding while the microphone stays open for the full three-second silence interval. Only a completed result over exactly identical final audio can be reused; resumed speech invalidates an older preview. Stale decoders stop at token boundaries without unloading the model. The worker warms while the microphone starts, and only the final result is inserted once. Cleanup normalizes whitespace and English pronoun casing without guessing names or numbers. Ambient noise can affect silence detection; disable auto-stop for noisy environments.

## Optional AI

AI enhancement is off by default. Save your own OpenAI API key and enable it in Overview to improve transcript punctuation, grammar and readability. Only the text is sent to the [OpenAI Responses API](https://developers.openai.com/api/reference/resources/responses/methods/create), with response storage disabled. Keys are encrypted using Windows secure storage.

Missing/invalid keys, expired access, quota errors, connection failures, timeouts and incomplete responses all return the original transcript. AI never gates basic dictation. `OPENAI_ENHANCEMENT_MODEL` can override the default enhancement model. The old audio transcription endpoint is retained for compatibility, but desktop dictation no longer depends on it.

## Development

```powershell
npm install
npm install-scripts approve electron
npm rebuild electron
npm run dev
```

`npm run dev` prepares the pinned offline model assets, starts Next.js and the development API, then opens Electron. Asset preparation needs internet on the first developer build. Each model revision and SHA-256 hashes are recorded in `frontend/public/models/*-manifest.json`; subsequent runs validate/reuse these assets. `speech-to-text` and the renderer libraries are build dependencies because their compiled code is included in the static export.

Production runs its own service on an available loopback port, avoiding an old installed app or another program on port 3847. Development uses port 3000 for the renderer and 3847 for the API. The production export is `frontend/out`; dev uses a separate `.next-dev` cache. An existing dev server should be restarted after updating this version.

## Verification and build

```powershell
npm test
npm run build:windows
```

Build output is versioned under `release/<version>/` to avoid conflicts with running older builds. The installer is unsigned. Code signing requires a publisher certificate and is not included in this local build. This desktop update does not modify or deploy the `website/` directory or its download links.

The x64 NSIS installer uses solid maximum compression for full downloads. The existing update checker still opens GitHub releases; the app has no differential auto-updater, so unused differential packaging is disabled. Both offline models, all Electron locales, native input support and license notices remain bundled. The renderer uses the CPU/WASM ONNX build with one runtime pair, not unused GPU variants or duplicate runtime assets. Production source maps/debug files and duplicated native-helper files are excluded.

Run `node scripts/analyze-build.cjs 1.2.0 1.2.1` to compare installer and installed sizes. `node scripts/verify-installer.cjs` checks the compressed payload, hashes every extracted file against the build, verifies both models against their pinned hashes, and checks that development packages/debug files are absent. Payload extraction does not test the installer wizard, registry entries, shortcuts or uninstallation.

`scripts/verify-desktop.cjs` provides a synthetic-audio Electron test using Playwright, with an isolated profile and no API key. Generate the fixture with `scripts/create-test-audio.ps1`, set `PLAYWRIGHT_MODULE` to your Playwright installation, and pass an unpacked or installed `Orbitvoice.exe` path. It verifies speech recognition, cursor insertion, surrounding-text preservation and paused state. Native microphone quality still needs a spoken check on the target PC. See `VERIFICATION-1.2.1.md` for this build's results and practical limits; `VERIFICATION.md` retains the 1.2.0 baseline.

## Project layout

- `frontend/`: dashboard, floating microphone, recording lifecycle and recognition worker.
- `electron/`: windows, secure IPC, optional enhancement, key storage, native input helper and tray.
- `backend/`: loopback static service, persisted settings and compatibility speech endpoints.
- `scripts/`: model preparation, icon generation, build verification and test audio.
- `tests/`: fallback and settings regressions, plus native insertion service tests.
