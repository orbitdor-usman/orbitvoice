# Orbitvoice 1.2.0 verification — 2026-09-08

## Scope

Implemented the desktop work requested in `improve.md`. The user's explicit instruction to leave the website unchanged overrides that document's website integration section. No `website/` files or website download URLs were changed. The installer has not been uploaded or published.

## Completed checks

- `npm test`: 48 passing tests. Covers three-second silence timing, normal pauses, initial silence, conservative multilingual text cleanup, settings validation, version comparison, optional AI failure behavior, and native insertion/clipboard service regressions.
- `npm run build:frontend`: successful Next.js static export with no compilation warnings.
- `electron-builder --win`: successful assisted Windows x64 NSIS installer, product version 1.2.0. Output directory now uses `release/${version}` to avoid overwriting a running older build.
- Packaged application startup: real Electron executable, isolated profile, no API key, all non-loopback renderer network traffic blocked.
- Real synthetic microphone input, PCM AudioWorklet capture, three-second silence stop, local Whisper inference, streamed preview, one final insertion, surrounding text preservation, and paused state passed with both bundled Base and Tiny models. OS cursor capture/paste was simulated for these two integration runs, as detailed below.
- Five desktop sections (Overview, Voice input, Behavior, AI enhancement, About) checked at 640, 900 and 1180 pixel window widths: no horizontal document overflow, one main heading per section, functional navigation. Final Tiny run also checks that practice text survives section changes.
- Application archive contains both quantized model encoders, the audio worklet, version 1.2.0 metadata, and no `.env` file.
- Installer process launched successfully, then was stopped before installing. Product metadata is 1.2.0.
- `git diff --check` passes. Website diff is empty.

## Speech fixture and timing

Windows speech synthesis generated: “The quick brown fox jumps over the lazy dog. Voice typing works without an API key.” The fixture includes one second before speech and five seconds of silence afterward. The first-word capture issue discovered during testing was corrected by initializing the audio worklet before acquiring the microphone.

Both models produced the exact fixture sentence on the successful tests. With the warmed local worker, final processing after the detected silence took about 8.5 seconds for Base and 2.4 seconds for Tiny on this machine. Base also completed an in-flight preview before final inference. These are single synthetic English samples, not an accent/language accuracy benchmark or a real-time performance guarantee. Real microphone quality and multilingual accuracy need representative user recordings.

## Limits requiring an interactive Windows check

The host would not grant foreground focus to the QA application's editable field; Windows kept reporting a Windows Settings button as foreground. The normal native adapter correctly rejected it as `TARGET_UNSUPPORTED`. A direct attempt to activate the isolated QA window also failed. The packaged audio tests therefore replaced only the target/clipboard IPC adapter with a simulated destination. Actual OS paste was not validated end-to-end in this session, and the production safeguards were not relaxed.

Full installation/upgrading over the user's running installed copy was not performed. The installer is unsigned; no publisher certificate was supplied. The NSIS build's signing-skipped messages are expected.

For a real input check, leave the QA window foreground while running:

```powershell
$env:PLAYWRIGHT_MODULE = 'path\to\playwright'
node scripts/verify-desktop.cjs release/1.2.0/win-unpacked/Orbitvoice.exe
```

Add `--tiny` to exercise the smaller model. `--simulate-input` runs the audio/UI tests without requiring real Windows target focus and explicitly labels simulated insertion. Install `release/1.2.0/Orbitvoice-1.2.0-Setup.exe` on a test PC to validate installation, shortcuts and uninstallation.

## Artifacts

- Installer: `release/1.2.0/Orbitvoice-1.2.0-Setup.exe` (177,408,072 bytes).
- SHA-256: `736F4F7693A2600347E77A05602C78085EE4D8DE7EFD644C920B29A13A3176FD`.
- Base screenshots: `.runtime-data/desktop-qa-a3hthi/`.
- Final Tiny/UI screenshots: `.runtime-data/desktop-qa-UJdmUr/`.

Model selection and streaming follow the upstream [Whisper model comparison](https://github.com/openai/whisper#available-models-and-languages), [Transformers.js pipelines](https://huggingface.co/docs/transformers.js/en/pipelines), and the installed Transformers.js streaming API. Both models' exact revisions and hashes are recorded in the model manifests.
