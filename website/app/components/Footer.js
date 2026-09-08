import Link from "next/link";
import Logo from "./Logo";
import Icon from "./Icon";
export default function Footer() {
  return (
    <footer className="site-footer">
      <div className="page-shell">
        <div className="footer-main">
          <div className="footer-brand">
            <Logo />
            <p>
              A little less typing.
              <br />A little more room for your ideas.
            </p>
          </div>
          <nav aria-label="Product links">
            <span className="footer-label">Explore</span>
            <Link href="/">Home</Link>
            <Link href="/docs">Documentation</Link>
            <Link href="/#download">Download for Windows</Link>
          </nav>
          <nav aria-label="Company links">
            <span className="footer-label">Orbitdor</span>
            <Link href="/about">About us</Link>
            <Link href="/contact">Contact</Link>
            <Link href="/privacy">Privacy policy</Link>
          </nav>
          <div className="footer-studio">
            <span className="footer-label">Made for everyday flow</span>
            <p>
              Thoughtful software.
              <br />
              Built by Orbitdor.
            </p>
            <a href="https://www.orbitdor.com" target="_blank" rel="noreferrer">
              Visit our studio <Icon name="arrow" />
            </a>
          </div>
        </div>
        <div className="footer-bottom">
          <small>
            © {new Date().getFullYear()} Orbitdor. All rights reserved.
          </small>
          <span>
            <Icon name="desktop" /> Designed for Windows
          </span>
        </div>
      </div>
    </footer>
  );
}
