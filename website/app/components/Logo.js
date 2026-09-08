import release from '../../lib/release.json';

export default function Logo({ compact = false, showVersion = false }) {
  return <a className="brand" href="/" aria-label="Orbitvoice home">
    <span className="brand-mark"><img src="/orbitvoice-logo.png" alt="" /></span>
    {!compact && <span className="brand-copy"><strong>Orbitvoice</strong>
      {showVersion && <span className="brand-version" aria-label={`Latest version ${release.version}`}>v{release.version}</span>}
    </span>}
  </a>;
}
