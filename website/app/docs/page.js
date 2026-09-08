import { pageMetadata } from '../../lib/site';
import release from '../../lib/release.json';
import Header from "../components/Header";
import Footer from "../components/Footer";
import Icon from "../components/Icon";
export const metadata = pageMetadata({
  "title": "Voice Typing Setup & User Guide",
  "description": "Learn to install Orbitvoice, use the floating microphone and keyboard shortcut, select spoken languages, and troubleshoot speech-to-text on Windows.",
  "path": "/docs",
  "keywords": [
    "Orbitvoice user guide",
    "how to use voice typing on Windows",
    "speech to text setup",
    "Ctrl Shift Space dictation",
    "Urdu voice typing",
    "Hindi speech to text"
  ]
});
export default function DocsPage() {
  return (
    <>
      <Header />
      <main id="main-content" tabIndex={-1} className="page-shell docs-page">
        <div className="docs-intro">
          <span className="feature-icon">
            <Icon name="book" />
          </span>
          <span className="eyebrow">Documentation / Orbitvoice</span>
          <h1>Start speaking.</h1>
          <p>
            Install the app, learn the floating GUI, and make voice typing part
            of your daily workflow.
          </p>
        </div>
        <div className="docs-layout">
          <nav className="docs-nav" aria-label="On this page">
            <span className="footer-label">On this page</span>
            <a href="#install">Install</a>
            <a href="#gui">GUI tour</a>
            <a href="#use">Use Orbitvoice</a>
            <a href="#speech">Speech & languages</a>
            <a href="#privacy">Privacy & AI</a>
            <a href="#troubleshoot">Troubleshooting</a>
          </nav>
          <article className="docs-content">
            <section id="install">
              <span className="step-number">01</span>
              <h2>Install once</h2>
              <p>
                Download the Windows installer, run it, and follow the setup
                steps. Orbitvoice includes its desktop service and local speech
                model; Node.js, npm, a terminal, and an API key are not
                required.
              </p>
              <div className="code-note">
                <code>{release.fileName}</code>
                <span>Windows 10/11 · x64</span>
              </div>
            </section>
            <section id="gui">
              <span className="step-number">02</span>
              <h2>Understand the GUI</h2>
              <p>
                Orbitvoice is intentionally small and stays out of your way. The
                floating widget has one main microphone control and a clear
                recording state:
              </p>
              <ol>
                <li>
                  <strong>Microphone button:</strong> click once to start
                  dictation; the active state shows that Orbitvoice is
                  listening.
                </li>
                <li>
                  <strong>Stop and insert:</strong> click the microphone again,
                  or use the keyboard shortcut, to finish. The transcript is
                  inserted at the focused cursor.
                </li>
                <li>
                  <strong>Move the widget:</strong> drag the widget by its body
                  to place it anywhere convenient. Dragging does not start
                  recording.
                </li>
                <li>
                  <strong>Overview window:</strong> use the app overview to see
                  the latest transcript, copy it manually, review settings, and
                  check the current language.
                </li>
              </ol>
              <div className="code-note">
                <code>Ctrl + Shift + Space</code>
                <span>Start / stop dictation</span>
              </div>
            </section>
            <section id="use">
              <span className="step-number">03</span>
              <h2>Use Orbitvoice</h2>
              <ol>
                <li>
                  Focus the input, document, PDF form or editor where you want
                  to write.
                </li>
                <li>
                  Click the floating mic, or press{" "}
                  <kbd>Ctrl + Shift + Space</kbd>.
                </li>
                <li>
                  Speak naturally, then click or press the shortcut again. Your
                  words are placed at the cursor.
                </li>
              </ol>
              <p>
                Keep the destination field focused while processing. If an app
                does not accept automatic insertion, copy the latest transcript
                from Overview.
              </p>
            </section>
            <section id="speech">
              <span className="step-number">04</span>
              <h2>Speech & languages</h2>
              <p>
                Auto-detect uses the bundled multilingual local model. You can
                also choose a language hint in Voice input. English, Urdu,
                Hindi, Arabic, Spanish, French, German, Portuguese, Chinese,
                Japanese, Korean, Russian, Turkish and Italian are available.
              </p>
            </section>
            <section id="privacy">
              <span className="step-number">05</span>
              <h2>Privacy & optional AI</h2>
              <p>
                Local recognition keeps audio on your computer. AI enhancement
                is off by default. If enabled, only transcript text is sent to
                OpenAI using your own encrypted API key. Missing keys, quota
                limits, timeouts, or network errors automatically keep the
                original transcript.
              </p>
            </section>
            <section id="troubleshoot">
              <span className="step-number">06</span>
              <h2>When something gets in the way</h2>
              <p>
                Protected fields, read-only documents, elevated apps, and
                editors without paste support may reject insertion. Make sure
                the target field is focused, try the shortcut again, and use the
                latest transcript in Overview if manual copy is needed.
              </p>
            </section>
          </article>
        </div>
      </main>
      <Footer />
    </>
  );
}
