import type { Metadata, Viewport } from 'next';
import { Geist, Geist_Mono } from 'next/font/google';
import { IPhoneInstallPrompt } from './iphone-install-prompt';
import './globals.css';

const geistSans = Geist({
  variable: '--font-geist-sans',
  subsets: ['latin'],
});

const geistMono = Geist_Mono({
  variable: '--font-geist-mono',
  subsets: ['latin'],
});

const publicBasePath = process.env.GITHUB_PAGES === 'true' ? '/glp1concentration' : '';
const publicAsset = (path: string) => `${publicBasePath}${path}`;

export const metadata: Metadata = {
  metadataBase: new URL('https://dev1niscool.github.io/glp1concentration/'),
  title: 'GLP-1 Concentration Plotter',
  description: 'Plot modeled semaglutide and tirzepatide plasma concentration over time.',
  applicationName: 'GLP-1 Plotter',
  manifest: publicAsset('/manifest.webmanifest'),
  icons: {
    icon: [
      { url: publicAsset('/icon-192.png'), sizes: '192x192', type: 'image/png' },
      { url: publicAsset('/icon-512.png'), sizes: '512x512', type: 'image/png' },
    ],
    apple: [
      { url: publicAsset('/apple-touch-icon.png'), sizes: '180x180', type: 'image/png' },
    ],
  },
  appleWebApp: {
    capable: true,
    title: 'GLP-1 Plotter',
    statusBarStyle: 'default',
  },
  openGraph: {
    title: 'GLP-1 Concentration Plotter',
    description: 'Explore modeled weekly semaglutide and tirzepatide plasma concentration over time.',
    type: 'website',
    images: [{ url: 'og.png', width: 1731, height: 909, alt: 'GLP-1 concentration plotter' }],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'GLP-1 Concentration Plotter',
    description: 'Explore modeled weekly semaglutide and tirzepatide plasma concentration over time.',
    images: ['og.png'],
  },
};

export const viewport: Viewport = {
  themeColor: '#104c38',
};

const cloudflareAnalyticsToken = process.env.NEXT_PUBLIC_CLOUDFLARE_WEB_ANALYTICS_TOKEN?.trim();

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <head>
        <meta name="apple-mobile-web-app-capable" content="yes" />
      </head>
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        {children}
        <IPhoneInstallPrompt />
        {cloudflareAnalyticsToken && (
          <script
            type="module"
            defer
            src="https://static.cloudflareinsights.com/beacon.min.js"
            data-cf-beacon={JSON.stringify({ token: cloudflareAnalyticsToken })}
          />
        )}
      </body>
    </html>
  );
}
