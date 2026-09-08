import { pageMetadata } from '../../lib/site';
import Header from "../components/Header";
import Footer from "../components/Footer";
import Icon from "../components/Icon";
import VoiceMotif from "../components/VoiceMotif";
export const metadata = pageMetadata({
  "title": "Contact & Support",
  "description": "Contact Orbitdor for Orbitvoice support, Windows dictation questions, product feedback or partnerships. Email orbitdor@gmail.com.",
  "path": "/contact",
  "keywords": [
    "Orbitvoice support",
    "Orbitdor contact",
    "Windows voice typing help"
  ]
});
export default function ContactPage() {
  return (
    <>
      <Header />
      <main id="main-content" tabIndex={-1} className="page-shell contact-page">
        <div className="contact-intro">
          <span className="eyebrow">Contact / Orbitdor</span>
          <h1>
            We’d like to
            <br />
            <em>hear from you.</em>
          </h1>
          <p className="inner-lede">
            Found a rough edge, have an idea, or need help getting started? Send
            a note and we’ll get back to you.
          </p>
          <VoiceMotif compact />
        </div>
        <div className="contact-card">
          <div>
            <span className="feature-icon">
              <Icon name="mail" />
            </span>
            <h2>Say hello</h2>
            <p>For support, product feedback, or partnership questions:</p>
            <a className="email-link" href="mailto:orbitdor@gmail.com">
              orbitdor@gmail.com
            </a>
          </div>
          <div className="contact-meta">
            <span>Company</span>
            <b>Orbitdor</b>
            <a href="https://www.orbitdor.com" target="_blank" rel="noreferrer">
              www.orbitdor.com <span>↗</span>
            </a>
            <small>We usually reply within two business days.</small>
          </div>
        </div>
      </main>
      <Footer />
    </>
  );
}
