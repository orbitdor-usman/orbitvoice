'use client';
import { useState } from 'react';

export default function DownloadButton({ secondary = false, header = false, windows = false, label = 'Download for Windows' }) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  function startFileDownload(url) {
    const frame = document.createElement('iframe');
    frame.setAttribute('title', 'Orbitvoice installer download');
    frame.setAttribute('aria-hidden', 'true');
    frame.style.position = 'fixed';
    frame.style.width = '1px';
    frame.style.height = '1px';
    frame.style.border = '0';
    frame.style.opacity = '0';
    frame.style.pointerEvents = 'none';
    frame.src = url;
    document.body.appendChild(frame);
    window.setTimeout(() => frame.remove(), 60_000);
  }
  async function download() {
    setLoading(true); setError('');
    const startedAt = Date.now();
    try {
      const response = await fetch('/api/download', { method: 'POST', headers: { Accept: 'application/json' } });
      if (!response.ok) throw new Error('Download service is temporarily unavailable.');
      const result = await response.json();
      window.dispatchEvent(new CustomEvent('orbitvoice:downloaded'));
      startFileDownload(result.url);
      const remaining = Math.max(0, 2000 - (Date.now() - startedAt));
      window.setTimeout(() => setLoading(false), remaining);
    } catch (reason) { setError(reason.message); setLoading(false); }
  }
  return <span className={`download-action ${header ? 'header-download' : ''}`}><button type="button" className={`button ${secondary ? 'button-secondary' : ''}`} onClick={download} disabled={loading}>
    {windows && <svg className="windows-icon" viewBox="0 0 24 24" aria-hidden="true"><path d="M3 5.4 10.3 4v7.1H3V5.4Zm8.6-1.7L21 2.2v8.9h-9.4V3.7ZM3 12.9h7.3V20L3 18.6v-5.7Zm8.6 0H21v8.9l-9.4-1.5v-7.4Z" fill="currentColor" /></svg>}{label} <span>↓</span>
  </button>{error && <small className="download-error" role="alert">{error}</small>}</span>;
}
