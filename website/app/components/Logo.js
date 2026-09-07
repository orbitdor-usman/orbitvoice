export default function Logo({ compact = false }) {
  return <a className="brand" href="/" aria-label="Orbitvoice home">
    <span className="brand-mark"><img src="/orbitvoice-logo.png" alt="" /></span>
    {!compact && <span><strong>Orbitvoice</strong><small>Voice, everywhere.</small></span>}
  </a>;
}
