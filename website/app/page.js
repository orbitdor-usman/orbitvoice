import { pageMetadata } from '../lib/site';
import Header from "./components/Header";
import DownloadButton from "./components/DownloadButton";
import { HeroVisual } from "./components/AnimatedVisual";
import Footer from "./components/Footer";
import Icon from "./components/Icon";
import VoiceMotif from "./components/VoiceMotif";

export const metadata = pageMetadata({
  "title": "Orbitvoice — Voice Typing & Speech to Text for Windows",
  "description": "Speak instead of typing with Orbitvoice for Windows 10 and 11. Dictate at your cursor with local multilingual recognition, a floating mic and optional AI cleanup.",
  "path": "/",
  "keywords": [
    "Orbitvoice",
    "voice typing for Windows",
    "speech to text Windows 11",
    "Windows dictation app",
    "offline speech recognition",
    "floating microphone",
    "multilingual voice typing"
  ]
});

const features = [
  [
    "01",
    "shield",
    "Local by default",
    "Your everyday voice typing stays available with the bundled speech model on your computer.",
  ],
  [
    "02",
    "cursor",
    "At the cursor",
    "Speak into search boxes, notes, chats, forms and supported document fields without context switching.",
  ],
  [
    "03",
    "sparkle",
    "Polish when ready",
    "Optional AI cleanup improves punctuation and grammar while preserving your original words.",
  ],
];

export default function HomePage() {
  return (
    <>
      <Header />
      <main id="main-content" tabIndex={-1}>
        <section className="hero page-shell">
          <div className="hero-copy">
            <div className="hero-kicker">
              <span className="eyebrow">Voice to text / Without friction</span>
            </div>
            <h1>
              Your voice,
              <br />
              <em>everywhere.</em>
            </h1>
            <p className="hero-lede">
              Orbitvoice is a Windows voice typing and speech-to-text app that turns your words into text wherever your cursor is waiting.
            </p>
            <div className="hero-actions">
              <DownloadButton windows label="Download for Windows" />
              <a className="text-link" href="/docs">
                Explore the workflow <Icon name="arrow" />
              </a>
            </div>
            <div className="microcopy">
              <span>
                <Icon name="desktop" /> Windows 10/11 · 64-bit
              </span>
              <span>
                <Icon name="check" /> No API key required
              </span>
            </div>
          </div>
          <HeroVisual />
        </section>
        <div className="trust-strip">
          <div className="page-shell trust-inner">
            <span className="trust-label">Designed for your daily flow</span>
            <div className="trust-items">
              <span>
                <Icon name="shield" /> Private by default
              </span>
              <span>
                <Icon name="wave" /> Multilingual
              </span>
              <span>
                <Icon name="desktop" /> Lightweight
              </span>
            </div>
          </div>
        </div>
        <section className="section page-shell">
          <div className="section-heading">
            <div>
              <span className="eyebrow">Small tool. Big relief.</span>
              <h2>
                Less typing.
                <br />
                <em>More flow.</em>
              </h2>
            </div>
            <p>
              Thoughts move fast. Orbitvoice keeps the distance between your
              idea and the screen beautifully short.
            </p>
          </div>
          <div className="feature-grid">
            {features.map(([number, icon, title, text]) => (
              <article className="feature-card" key={title}>
                <div className="card-topline">
                  <span className="feature-icon">
                    <Icon name={icon} />
                  </span>
                  <span className="feature-number">{number}</span>
                </div>
                <h3>{title}</h3>
                <p>{text}</p>
                <a href="/docs">
                  Learn more <Icon name="arrow" />
                </a>
              </article>
            ))}
          </div>
        </section>
        <section className="workflow-section page-shell">
          <div className="workflow-intro">
            <span className="eyebrow">A simple rhythm</span>
            <h2>
              Speak. Refine.
              <br />
              <em>Keep moving.</em>
            </h2>
            <p>Designed to disappear into the way you already work.</p>
            <VoiceMotif />
          </div>
          <div className="workflow-steps">
            {[
              ["01", "Focus", "Place your cursor in any supported field."],
              [
                "02",
                "Speak",
                "Use the mic or keyboard shortcut to dictate naturally.",
              ],
              ["03", "Flow", "Your words land at the cursor, ready to use."],
            ].map(([n, title, text]) => (
              <div className="workflow-step" key={n}>
                <span>{n}</span>
                <div>
                  <h3>{title}</h3>
                  <p>{text}</p>
                </div>
                <Icon
                  name={n === "01" ? "cursor" : n === "02" ? "mic" : "check"}
                />
              </div>
            ))}
          </div>
        </section>
        <section className="split-section page-shell">
          <div className="split-copy">
            <span className="eyebrow">Built around you</span>
            <h2>
              Ready when
              <br />
              <em>you are.</em>
            </h2>
            <p>
              Keep the microphone close, place it where it feels natural, and
              keep working in the app already open. The widget remembers its
              position and stays above supported windows.
            </p>
            <a className="text-link" href="/about">
              Meet Orbitvoice <Icon name="arrow" />
            </a>
          </div>
          <div className="quote-card">
            <Icon name="wave" />
            <span className="quote-mark" aria-hidden="true">
              “
            </span>
            <p>
              It feels like a tiny shortcut between a thought and the screen.
            </p>
            <span className="quote-by">Orbitvoice design principle</span>
          </div>
        </section>
        <section className="faq-section page-shell" aria-labelledby="faq-title"><div><span className="eyebrow">A few helpful answers</span><h2 id="faq-title">Before you<br /><em>start speaking.</em></h2><p>Get to know voice typing with Orbitvoice.</p><a className="text-link" href="/docs">Read the user guide <Icon name="arrow" /></a></div><div className="faq-list">
 <details><summary>How do I start voice typing on Windows?<Icon name="arrow" /></summary><p>Install Orbitvoice, focus a supported text field, and click the floating microphone or press <kbd>Ctrl + Shift + Space</kbd>. Speak, then use the same control to stop and insert the transcript.</p></details>
 <details><summary>Can I use speech recognition offline?<Icon name="arrow" /></summary><p>Orbitvoice includes a local speech model for offline recognition. Browser-based recognition may need internet, and optional AI text cleanup requires a connection. The local model keeps basic dictation available.</p></details>
 <details><summary>Which languages can I speak?<Icon name="arrow" /></summary><p>Choose auto-detect or a language such as English, Urdu, Hindi, Arabic, Spanish, French or German. Accuracy varies with language, accent and recording conditions. See the <a href="/docs#speech">language guide</a> for the full list.</p></details>
 <details><summary>Do I need an API key?<Icon name="arrow" /></summary><p>No API key is needed for local dictation. AI enhancement is optional. If you enable it with your own key, it can refine transcript grammar and punctuation.</p></details>
 </div></section>
<section className="download-band page-shell" id="download">
          <div className="download-inner">
            <div>
              <span className="eyebrow">Your next idea is waiting</span>
              <h2>
                Give your keyboard
                <br />a break.
              </h2>
              <p>
                Install Orbitvoice once. It runs quietly in the background and
                is ready when you need it.
              </p>
            </div>
            <div className="download-right">
              <span className="download-illustration" aria-hidden="true">
                <Icon name="desktop" />
                <Icon name="mic" />
              </span>
              <DownloadButton windows label="Download for Windows" />
              <small>Orbitvoice 1.1.0 · Windows installer · ~129 MB</small>
            </div>
          </div>
        </section>
      </main>
      <Footer />
    </>
  );
}
