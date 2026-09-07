import './globals.css';

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://www.orbitdor.com';

export const metadata = {
  title: { default: 'Orbitvoice — Voice typing, everywhere.', template: '%s — Orbitvoice' },
  description: 'Orbitvoice is a private, multilingual Windows voice typing app that turns speech into text at your cursor.',
  keywords: [
    'Orbitvoice', 'Orbitdor', 'Windows voice typing', 'speech to text Windows',
    'offline voice typing', 'voice to text app', 'multilingual dictation',
    'Windows dictation software', 'local speech recognition', 'AI writing assistant'
  ],
  authors: [{ name: 'Orbitdor', url: siteUrl }],
  creator: 'Orbitdor',
  publisher: 'Orbitdor',
  applicationName: 'Orbitvoice',
  category: 'technology',
  manifest: '/site.webmanifest',
  icons: {
    icon: '/icon.png',
    shortcut: '/icon.png',
    apple: '/icon.png'
  },
  metadataBase: new URL(siteUrl),
  alternates: { canonical: '/' },
  openGraph: {
    type: 'website',
    url: siteUrl,
    siteName: 'Orbitvoice',
    title: 'Orbitvoice — Voice typing, everywhere.',
    description: 'A private, multilingual Windows voice typing app that turns speech into text at your cursor.',
    images: [{ url: '/og-image.svg', width: 1200, height: 630, alt: 'Orbitvoice Windows voice typing app' }]
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Orbitvoice — Voice typing, everywhere.',
    description: 'Turn your voice into text anywhere on Windows.',
    images: ['/og-image.svg']
  },
  robots: {
    index: true,
    follow: true,
    googleBot: { index: true, follow: true, 'max-image-preview': 'large', 'max-snippet': -1, 'max-video-preview': -1 }
  }
};

export const viewport = { width: 'device-width', initialScale: 1, themeColor: '#07100d', colorScheme: 'dark' };

const structuredData = {
  '@context': 'https://schema.org',
  '@graph': [
    {
      '@type': 'SoftwareApplication',
      '@id': `${siteUrl}/#orbitvoice`,
      name: 'Orbitvoice',
      applicationCategory: 'ProductivityApplication',
      operatingSystem: 'Windows 10, Windows 11',
      description: 'A private Windows voice typing app with local multilingual speech recognition and optional AI transcript enhancement.',
      url: siteUrl,
      downloadUrl: `${siteUrl}/downloads/Orbitvoice-1.1.0-Setup.exe`,
      softwareVersion: '1.1.0',
      author: { '@id': `${siteUrl}/#orbitdor` }
    },
    {
      '@type': 'Organization',
      '@id': `${siteUrl}/#orbitdor`,
      name: 'Orbitdor',
      url: siteUrl,
      email: 'orbitdor@gmail.com'
    },
    { '@type': 'WebSite', '@id': `${siteUrl}/#website`, name: 'Orbitvoice', url: siteUrl, publisher: { '@id': `${siteUrl}/#orbitdor` } }
  ]
};

export default function RootLayout({ children }) {
  return <html lang="en"><body><script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(structuredData).replace(/</g, '\\u003c') }} />{children}</body></html>;
}
