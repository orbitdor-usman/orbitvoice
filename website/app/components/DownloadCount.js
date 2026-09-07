'use client';

import { useEffect, useState } from 'react';

function compactCount(value) {
  if (!Number.isFinite(value)) return '—';
  return new Intl.NumberFormat('en', { notation: 'compact', maximumFractionDigits: 1 }).format(value).toLowerCase();
}

export default function DownloadCount() {
  const [count, setCount] = useState(null);

  useEffect(() => {
    let active = true;
    fetch('/api/download-count', { cache: 'no-store' })
      .then(response => response.ok ? response.json() : null)
      .then(result => { if (active && result) setCount(Number(result.total) || 0); })
      .catch(() => {});

    function handleDownload() {
      setCount(current => (Number(current) || 0) + 1);
    }
    window.addEventListener('orbitvoice:downloaded', handleDownload);
    return () => { active = false; window.removeEventListener('orbitvoice:downloaded', handleDownload); };
  }, []);

  return <span className="download-count" aria-label={`${count ?? 0} downloads`}><svg className="download-count-icon" viewBox="0 0 24 24" aria-hidden="true"><path d="M12 3v11m0 0 4-4m-4 4-4-4M4 17v3h16v-3" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" /></svg><b>{compactCount(count)}</b><small>Downloads</small></span>;
}
