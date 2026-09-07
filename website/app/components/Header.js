import Logo from './Logo';
import DownloadCount from './DownloadCount';
import DownloadButton from './DownloadButton';

export default function Header() {
  return <header className="site-header"><div className="header-inner"><Logo /><div className="header-tools"><DownloadCount /><nav aria-label="Main navigation">
    <a href="/about">About</a><a href="/docs">Docs</a><a href="/contact">Contact</a>
  </nav><DownloadButton header windows label="Download Windows" /></div></div></header>;
}
