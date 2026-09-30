import { GeistSans } from 'geist/font/sans';
import './globals.css';

export const metadata = {
  title: 'Tanmay HQ',
  description: 'Personal command center for goals, study, career, money and health.',
  robots: { index: false, follow: false },
};

export const viewport = {
  themeColor: '#000000',
  colorScheme: 'dark',
};

export default function RootLayout({ children }) {
  return (
    <html lang="en" className={GeistSans.className}>
      <body>{children}</body>
    </html>
  );
}
