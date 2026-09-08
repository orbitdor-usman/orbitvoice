Act as a senior desktop application developer and improve the OrbitVoice desktop app significantly in terms of UI/UX, performance, responsiveness, voice-to-text accuracy, and overall product quality.

### 1. Major Desktop App UI/UX Improvement

Redesign and improve the complete desktop application interface so it feels modern, professional, premium, clean, and production-ready.

* Significantly improve the overall layout and visual hierarchy.
* Use a Shadcn-inspired UI style throughout the desktop application.
* Keep the design minimal, clean, and consistent.
* Maintain the existing OrbitVoice branding, logo, typography, and brand colors.
* Improve spacing, padding, alignment, cards, buttons, inputs, dropdowns, settings, dialogs, and other UI elements.
* Reduce the size of the main voice/microphone icon. It is currently too large.
* Keep the microphone control clearly visible without dominating the whole interface.
* Improve hover, active, disabled, focus, recording, listening, and processing states.
* Use subtle animations and transitions.
* Avoid excessive effects and heavy animations.
* Use professional borders, border-radius, backgrounds, typography, and shadows.
* Keep shadows subtle and do not make the application visually heavy.

### 2. Improve Sidebar Design

Completely improve the sidebar UI.

* Make it look modern and similar to a premium Shadcn desktop dashboard.
* Improve icons, typography, spacing, active states, hover states, and separators.
* Clearly highlight the currently active page.
* Keep the sidebar compact and easy to navigate.
* Make sure it works properly on different desktop and laptop screen sizes.
* Add appropriate OrbitVoice branding inside the sidebar.

### 3. Improve App Responsiveness and Speed

Optimize the desktop application for faster interaction and response times.

* Reduce unnecessary re-renders.
* Optimize voice processing.
* Optimize animations and UI transitions.
* Make microphone start/stop actions respond immediately.
* Make transcription text appear as quickly as possible.
* Avoid UI freezing while speech is being processed.
* Keep recording, transcription, and UI processing asynchronous where appropriate.
* Optimize Electron, frontend, and backend communication.
* Remove unnecessary delays from the voice-to-text workflow.

### 4. Improve Free Voice-to-Text Accuracy

The current free voice-to-text implementation does not always write the correct words or spelling.

Improve its intelligence and transcription accuracy without depending entirely on a paid AI API.

Research and implement a better free/local approach where possible.

You may use suitable speech-recognition packages, local models, language-processing packages, dictionaries, spelling correction, contextual correction, or other free solutions.

The system should:

* Better understand spoken sentences.
* Improve spelling accuracy.
* Correct obvious transcription mistakes.
* Better detect words based on sentence context.
* Handle punctuation more intelligently.
* Support different speaking speeds.
* Improve recognition for English and other supported languages.
* Keep processing fast enough for real-time desktop use.

If an AI API key is available, it can optionally be used to further improve transcription or correction.

If no API key is available, the application must continue working with the free/local speech-to-text system.

Do not make the application's core voice-to-text functionality dependent on a paid API.

### 5. Automatic Silence Detection

Implement proper silence detection.

When the user starts voice recording:

1. Listen to the user's speech.
2. Continue recording while the user is speaking.
3. Detect when the user stops speaking.
4. If approximately **3 seconds of continuous silence** is detected, automatically stop the voice recorder.
5. Immediately process the final transcription.
6. Display the recognized text in the selected input field or transcription area as quickly as possible.

Do not make the user manually press Stop every time.

Make sure normal short pauses during speech do not stop the recording incorrectly.

### 6. Faster Text Output

Improve the transcription experience so recognized text appears much faster.

Where technically possible:

* Show partial/interim transcription while the user is speaking.
* Update the text progressively.
* Replace interim text with the final corrected transcription once processing finishes.
* Avoid duplicate words when interim and final results are combined.
* Keep cursor position and selected input behavior correct.

If the user selected an input field before starting voice recording, insert the transcription directly into that same field.

### 7. Recording Status UI

Clearly display the current voice state:

* Idle
* Listening
* Recording
* Processing
* Transcribing
* Completed
* Error

Use subtle visual feedback such as waveform animation, microphone state changes, status text, or a small timer.

Do not make these animations distracting.

### 8. Add Website and Contact Information

Add an appropriate section inside the OrbitVoice desktop application containing official website and contact information.

For example:

* Official website
* Support/contact information
* Help
* About OrbitVoice
* Version number
* Check for updates

Place this information professionally inside the Settings, About, or Help section instead of cluttering the main transcription interface.

### 9. Improve Settings UI

Improve the Settings page with a professional Shadcn-style layout.

Organize settings into logical sections such as:

* General
* Voice & Transcription
* Language
* Microphone
* AI/API
* Appearance
* Shortcuts
* Updates
* About
* Support

Make settings easy to understand and navigate.

### 10. Error Handling

Improve error handling for:

* Microphone permission denied
* No microphone detected
* Recording failure
* Speech recognition failure
* Unsupported language
* API unavailable
* API key missing
* Internet unavailable
* Local transcription failure

Show user-friendly messages instead of technical/raw errors.

The app should gracefully fall back to the free/local transcription system whenever possible.

### 11. Performance Optimization

Review the complete desktop application and optimize:

* Electron process usage
* Memory consumption
* CPU usage
* Voice recording
* Audio processing
* Speech recognition
* IPC communication
* React rendering
* Event listeners
* Background processes

Make sure listeners and recording resources are properly cleaned up when they are no longer needed.

The app should remain lightweight and responsive even after being open for a long time.

### 12. Create the Production Build

After completing all improvements:

* Test the complete application.
* Fix build errors and warnings.
* Create a proper production-ready Windows build.
* Generate the latest installable OrbitVoice application file.
* Use proper application name, version, logo, and metadata.
* Ensure the installer works correctly on Windows.
* Test installation and application startup.

### 13. Add Latest Build to the Website

After generating the latest desktop application build, add the installer to the website's public download location.

Organize the download structure properly, for example:

`/public/downloads/OrbitVoice-Setup.exe`

or another clean production-ready download structure already used by the project.

Update the website's **Download App** buttons so they download the latest OrbitVoice build.

Make sure:

* The download link works.
* The correct latest version is downloaded.
* Mobile users receive an appropriate message if the desktop application only supports Windows.
* Existing website functionality is not broken.

### Final Requirement

Review the entire OrbitVoice desktop application after implementation.

The finished product should feel like a professionally developed, premium desktop voice-to-text application—not a basic prototype.

Prioritize:

**Accuracy → Speed → Stability → User Experience → Modern UI → Performance**

Do not only make cosmetic changes. Improve the actual voice-to-text workflow, transcription accuracy, silence detection, response speed, desktop UI, sidebar, application performance, error handling, production build process, and website download integration.


and also api key div show in top front for use eassly after intall user can see this 