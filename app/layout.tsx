import type { Metadata } from 'next';
import { Geist, Geist_Mono } from 'next/font/google';
import './globals.css';

const geistSans = Geist({
  variable: '--font-geist-sans',
  subsets: ['latin'],
});

const geistMono = Geist_Mono({
  variable: '--font-geist-mono',
  subsets: ['latin'],
});

export const metadata: Metadata = {
  title: 'NEXO | Ergonomia inteligente',
  description: 'Gestão ergonômica de casos, empresas, doenças e lesões.',
  metadataBase: new URL('http://localhost:3000'),
  openGraph: {
    title: 'NEXO | Ergonomia inteligente',
    description: 'Gestão ergonômica de casos, empresas, doenças e lesões.',
    images: [{ url: '/og.png', width: 1200, height: 630, alt: 'NEXO - Ergonomia inteligente' }],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'NEXO | Ergonomia inteligente',
    description: 'Gestão ergonômica de casos, empresas, doenças e lesões.',
    images: ['/og.png'],
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="pt-BR">
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        {children}
      </body>
    </html>
  );
}
