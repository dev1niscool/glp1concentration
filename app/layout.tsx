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
  metadataBase: new URL('https://dev1niscool.github.io/glp1concentration/'),
  title: 'GLP-1 Concentration Plotter',
  description: 'Plot modeled semaglutide and tirzepatide plasma concentration over time.',
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

const cloudflareAnalyticsToken = process.env.NEXT_PUBLIC_CLOUDFLARE_WEB_ANALYTICS_TOKEN?.trim();

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        {children}
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
