import './globals.css';

export const metadata = {
  title: 'Orbitvoice',
  description: 'Your voice, everywhere.'
};

export default function RootLayout({ children }) {
  return <html lang="en"><body cz-shortcut-listen="true">{children}</body></html>;
}
