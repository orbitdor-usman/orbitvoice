import './globals.css';
import { siteUrl, companyUrl, googleVerification, socialImage } from '../lib/site';

export const metadata = {
  title: { default: 'Orbitvoice — Voice Typing & Speech to Text for Windows', template: '%s — Orbitvoice' },
  description: 'Turn speech into text at your cursor with Orbitvoice for Windows 10 and 11. Multilingual dictation, local recognition, a floating microphone and optional AI cleanup.',
  keywords: [
    'Orbitvoice', 'Orbitdor', 'Windows voice typing', 'speech to text Windows',
    'offline voice typing', 'voice to text app', 'multilingual dictation',
    'Windows dictation software', 'local speech recognition', 'AI writing assistant'
  ],
  authors: [{ name: 'Orbitdor', url: companyUrl }],
  verification: { google: googleVerification },
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
    images: [socialImage]
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Orbitvoice — Voice typing, everywhere.',
    description: 'Turn your voice into text anywhere on Windows.',
    images: [socialImage]
  },
  robots: {
    index: true,
    follow: true,
    googleBot: { index: true, follow: true, 'max-image-preview': 'large', 'max-snippet': -1, 'max-video-preview': -1 }
  }
};

export const viewport = { width: 'device-width', initialScale: 1, themeColor: '#0a1210', colorScheme: 'dark' };

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
      image: `${siteUrl}/opengraph-image`,
      inLanguage: 'en',
      featureList: [
        'Voice typing at the active cursor in supported Windows applications',
        'Floating microphone and Ctrl + Shift + Space shortcut',
        'Bundled multilingual local speech recognition',
        'Optional AI transcript cleanup using your own API key',
        'Manual copying of the latest transcript'
      ],
      softwareRequirements: 'Windows 10 or Windows 11, 64-bit; microphone for voice input',
      author: { '@id': `${siteUrl}/#orbitdor` }
    },
    {
      '@type': 'Organization',
      '@id': `${siteUrl}/#orbitdor`,
      name: 'Orbitdor',
      url: companyUrl,
      email: 'orbitdor@gmail.com'
    },
    { '@type': 'WebSite', '@id': `${siteUrl}/#website`, name: 'Orbitvoice', url: siteUrl, inLanguage: 'en', publisher: { '@id': `${siteUrl}/#orbitdor` } }
  ]
};

export default function RootLayout({ children }) {
  return <html lang="en"><body><script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(structuredData).replace(/</g, '\\u003c') }} />{children}</body></html>;
}
