const voiceWavePath = 'M101 244h22c6 0 8-47 14-47s8 72 15 72 9-52 16-52 9 38 16 38 9-88 16-88 10 112 17 112 10-69 17-69 10 38 17 38 9-58 16-58 10 54 17 54h34';

export function HeroVisual() {
  return <div className="hero-visual" aria-label="Orbitvoice voice input preview">
    <svg className="voice-visual" viewBox="0 0 620 500" role="img" aria-hidden="true">
      <defs>
        <linearGradient id="voice-panel" x1="0" x2="1" y1="0" y2="1"><stop offset="0" stopColor="#172d22" /><stop offset="1" stopColor="#0b1611" /></linearGradient>
        <linearGradient id="voice-green" x1="0" x2="1"><stop offset="0" stopColor="#b8f6d0" /><stop offset="1" stopColor="#4be996" /></linearGradient>
        <filter id="voice-shadow" x="-40%" y="-40%" width="180%" height="180%"><feDropShadow dx="0" dy="24" stdDeviation="22" floodColor="#000" floodOpacity=".5" /></filter>
      </defs>
      <path className="svg-trace trace-one" d="M35 371c61-99 94-185 217-250 99-52 213-28 332 39" />
      <path className="svg-trace trace-two" d="M23 431c121-56 206-112 285-245 46-77 133-100 272-68" />
      <g className="svg-bubble bubble-one"><rect x="391" y="29" width="170" height="58" rx="16" fill="#14251e" stroke="#355846" /><path d="m424 87-13 14 4-18" fill="#14251e" stroke="#355846" /><text x="414" y="64" fill="#d1e7d8" fontSize="12" fontFamily="DM Sans, sans-serif">Ideas become words.</text><path className="bubble-wave" d="M519 53v11m6-16v21m6-17v14m6-18v23" fill="none" stroke="#9ee8bb" strokeWidth="2" strokeLinecap="round" /></g>
      <g className="svg-bubble bubble-two"><rect x="451" y="153" width="145" height="58" rx="16" fill="#14251e" stroke="#355846" /><path d="m475 211-5 17 15-17" fill="#14251e" stroke="#355846" /><text x="469" y="187" fill="#d1e7d8" fontSize="12" fontFamily="DM Sans, sans-serif">Notes, instantly.</text><path className="bubble-wave" d="M565 176v11m6-16v21m6-17v14" fill="none" stroke="#9ee8bb" strokeWidth="2" strokeLinecap="round" /></g>
      <g className="svg-panel" filter="url(#voice-shadow)">
        <rect x="68" y="93" width="386" height="309" rx="24" fill="url(#voice-panel)" stroke="#3b664d" />
        <path d="M68 146h386" stroke="#2d4a39" />
        <rect x="94" y="118" width="10" height="10" rx="5" fill="#ff716d" /><rect x="112" y="118" width="10" height="10" rx="5" fill="#ffc24d" /><rect x="130" y="118" width="10" height="10" rx="5" fill="#54e78e" />
        <text x="420" y="128" textAnchor="end" fill="#9bb5a5" fontSize="11" fontFamily="DM Sans, sans-serif">ORBITVOICE</text>
        <g className="recording-wave" fill="none" stroke="url(#voice-green)" strokeLinecap="round" strokeLinejoin="round">
          <path className="voice-wave-bed" pathLength="1" d={voiceWavePath} stroke="#31533f" strokeWidth="4" />
          <path className="voice-wave-path" pathLength="1" d={voiceWavePath} strokeWidth="4" />
          <path className="voice-wave-glow" pathLength="1" d={voiceWavePath} strokeWidth="7" />
          <circle className="wave-listening-dot" cx="101" cy="244" r="4" fill="#b8f6d0" stroke="none" />
        </g>
        <path d="M101 301h235" stroke="#334e3e" strokeWidth="8" strokeLinecap="round" /><path className="record-progress" d="M101 301h130" stroke="#82e4ac" strokeWidth="8" strokeLinecap="round" />
        <rect className="record-button" x="342" y="272" width="52" height="52" rx="26" fill="#8ee9b6" /><rect x="363" y="282" width="10" height="20" rx="5" fill="none" stroke="#0c2418" strokeWidth="3" /><path d="M357 297a11 11 0 0 0 22 0m-11 11v7m-6 0h12" stroke="#0c2418" strokeWidth="3" strokeLinecap="round" fill="none" />
        <text x="101" y="355" fill="#9ab5a5" fontSize="12" fontFamily="DM Sans, sans-serif">Listening at your cursor</text>
      </g>
      <g className="svg-chip chip-one"><rect x="38" y="416" width="150" height="39" rx="12" fill="#13271d" stroke="#3c7051" /><path d="M62 435v-10m-6 7a6 6 0 0 0 12 0m-6 6v5m-4 0h8" fill="none" stroke="#9ee8bb" strokeWidth="2" strokeLinecap="round" /><text x="78" y="440" fill="#c8dfcf" fontSize="11" fontFamily="DM Sans, sans-serif">MIC READY</text></g>
    </svg>
  </div>;
}
