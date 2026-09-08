import { pageMetadata } from '../../lib/site';
import Header from "../components/Header";
import Footer from "../components/Footer";
import Icon from "../components/Icon";
import VoiceMotif from "../components/VoiceMotif";
export const metadata = pageMetadata({
  "title": "About Orbitvoice & Orbitdor",
  "description": "Meet Orbitvoice, the Windows voice typing app by Orbitdor. Built for cursor dictation, local speech recognition and optional AI transcript cleanup.",
  "path": "/about",
  "keywords": [
    "about Orbitvoice",
    "Orbitdor software",
    "Windows productivity app"
  ]
});
export default function AboutPage() {
  return (
    <>
      <Header />
      <main id="main-content" tabIndex={-1} className="page-shell inner-page">
        <div className="inner-hero">
          <div>
            <span className="eyebrow">About Orbitvoice</span>
            <h1>
              A small tool for
              <br />
              <em>big thoughts.</em>
            </h1>
            <p className="inner-lede">
              Orbitvoice was built for the moment when your idea is moving
              faster than your fingers.
            </p>
          </div>
          <VoiceMotif />
        </div>
        <div className="story-grid">
          <section>
            <span className="section-index">01 / THE IDEA</span>
            <h2>Voice, without the ceremony.</h2>
            <p>
              Focus a field, tap the microphone, and speak naturally. Orbitvoice
              turns the recording into text and places it at your cursor, so you
              can keep your attention where the work is.
            </p>
            <p>
              It lives in the background, remembers your floating mic position,
              and keeps the basic experience available without an AI
              subscription or API key.
            </p>
          </section>
          <aside className="note-card company-card">
            <span className="feature-icon">
              <Icon name="desktop" />
            </span>
            <h3>Made by Orbitdor</h3>
            <p>
              Orbitdor builds focused digital tools that make everyday work feel
              lighter, clearer, and more human.
            </p>
            <a
              className="company-link"
              href="https://www.orbitdor.com"
              target="_blank"
              rel="noreferrer"
            >
              www.orbitdor.com <span>↗</span>
            </a>
          </aside>
        </div>
        <section className="values">
          <div>
            <b>01</b>
            <h3>Useful by default</h3>
            <p>Every feature should remove a little friction.</p>
          </div>
          <div>
            <b>02</b>
            <h3>Quietly reliable</h3>
            <p>Clear states, safe fallbacks, and recoverable transcripts.</p>
          </div>
          <div>
            <b>03</b>
            <h3>Respectfully optional</h3>
            <p>AI adds polish. It never holds your words hostage.</p>
          </div>
        </section>
        <section className="company-banner">
          <div>
            <span className="eyebrow">The studio behind the app</span>
            <h2>Orbitdor</h2>
            <p>For partnerships, feedback, or a hello from the team.</p>
          </div>
          <a className="email-link" href="mailto:orbitdor@gmail.com">
            orbitdor@gmail.com <span>↗</span>
          </a>
        </section>
      </main>
      <Footer />
    </>
  );
}
