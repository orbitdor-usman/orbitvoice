Use the `speech-to-text` package:

```bash
npm i speech-to-text
```

Update and fix the Voice-to-Text desktop application with the following requirements:

### 1. Speech-to-Text Integration

* Integrate the `speech-to-text` package properly into the application.
* The basic voice-to-text functionality should work without requiring an AI API key.
* If an AI API key is available, AI features can be used for advanced processing such as:

  * Improving grammar
  * Correcting sentences
  * Cleaning up transcribed text
  * Understanding and processing speech in different languages
  * Converting spoken content into more readable text
* If the AI API key is unavailable, expired, or reaches its usage limit, the application must automatically fall back to the normal `speech-to-text` package instead of stopping or showing an error.
* The core voice typing feature must always remain usable without AI.

### 2. Multi-Language Voice Input

* Users should be able to speak in different languages.
* Detect the spoken language where possible and convert the speech into text correctly.
* AI processing should only be used when required and when a valid API key is available.
* Otherwise, use the normal speech-to-text system.

### 3. Voice Typing Inside Any Input Field

Voice typing should work wherever text can be entered, including input fields, textareas, search boxes, forms, documents, PDFs, notes, chat boxes, and other supported editable areas.

The expected workflow should be:

1. The user clicks or focuses on any field or area where text can be written.
2. The user activates the microphone.
3. The user speaks.
4. The application converts the speech into text and inserts it into the currently selected field or document.
5. Existing text must not be removed unless the user intentionally replaces it.
6. New voice-generated text should be inserted at the current cursor position.
7. The feature should work reliably in supported applications and editable areas, including documents and PDFs where text entry is possible.
8. If the selected application or field does not support direct text insertion, the application should use the appropriate system-level text input method where available or clearly notify the user.

Make sure focus detection, cursor position, text insertion, microphone state, and voice recognition are handled properly.

The expected workflow should be:

1. The user clicks or focuses on any text input, textarea, search box, form field, or supported editable field.
2. The user activates the microphone.
3. The user starts speaking.
4. The converted speech should automatically be inserted into the currently selected/focused input field.
5. Existing text inside the field must not be removed unless the user intentionally replaces it.
6. New voice-generated text should be inserted at the current cursor position.
7. This should work reliably across supported applications and input fields.

Make sure focus detection, cursor position, text insertion, microphone state, and voice recognition are handled properly.

### 4. Draggable Floating Microphone

Make the microphone button a floating desktop control.

* The microphone icon should be draggable.
* Users should be able to drag and place it anywhere on the screen.
* It should remain visible above other supported windows when required.
* Remember its last position so that when the application is reopened, the microphone appears in the same location.
* Make sure dragging the microphone does not accidentally start voice recording.
* Clicking the microphone should start/stop recording, while dragging should only move the floating button.

### 5. Improve the UI

Redesign the application with a professional, modern dark-mode interface.

Use:

* Clean dark backgrounds
* Professional typography
* Modern cards and controls
* Clear active/inactive microphone states
* Smooth but lightweight animations
* Proper hover and focus states
* Good spacing and alignment
* Consistent icons
* Responsive layouts
* Clear recording, processing, success, and error states

Avoid an outdated or overly colorful interface. The design should look like a polished modern desktop productivity application.

### 6. Microphone Status

Add clear microphone states such as:

* Ready
* Listening
* Processing
* AI Processing
* Paused
* Microphone Permission Required
* API Unavailable — Using Local/Fallback Speech Recognition
* Error

The microphone icon should visually change when recording is active.

### 7. AI Must Be Optional

The application must not depend completely on an AI API.

Architecture should work like:

**Voice Input → Speech-to-Text → Text Output**

When AI is available:

**Voice Input → Speech-to-Text → Optional AI Enhancement → Text Output**

When AI is unavailable:

**Voice Input → Speech-to-Text → Text Output**

This ensures the software remains functional even without an API key.

### 8. Error Handling

Properly handle:

* Missing API keys
* Invalid API keys
* API quota limits
* Internet connection problems
* Microphone permission issues
* No microphone detected
* Speech recognition failures
* Unsupported languages
* Empty recordings
* AI service failures

AI-related errors must never break the normal voice-to-text feature.

### 9. Desktop Software Build

After completing and testing all features, create a proper production build of the Electron desktop application.

Generate an installable Windows build so the software can be installed and used locally on a PC.

The final build should:

* Install like normal Windows software
* Create the required application files automatically
* Launch without requiring development commands
* Run the backend/services automatically when the application starts
* Work without requiring the user to run `npm`, Node.js commands, or a terminal
* Include the required production dependencies
* Provide a clean installer/uninstaller
* Use the application's proper name, logo, and icon

Make sure the production version is tested after installation and that voice typing, draggable microphone controls, speech recognition, AI fallback, and input-field text insertion all work correctly.
