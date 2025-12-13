import type { Metadata } from 'next';
import './globals.css';

const defaultSiteUrl = 'http://localhost:3000';
const rawSiteUrl = process.env.NEXT_PUBLIC_APP_URL ?? defaultSiteUrl;
const appUrl = rawSiteUrl.startsWith('http') ? rawSiteUrl : `https://${rawSiteUrl}`;
const siteTitle = 'Recept | Git-backed recipes';
const siteDescription = 'Recipes stored as JSON and rendered with Next.js';

export const metadata: Metadata = {
  metadataBase: new URL(appUrl),
  title: {
    default: siteTitle,
    template: '%s | Recept',
  },
  description: siteDescription,
  openGraph: {
    title: siteTitle,
    description: siteDescription,
    url: appUrl,
    siteName: 'Recept',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: siteTitle,
    description: siteDescription,
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className="bg-stone-50 text-stone-900">
        <div className="app-shell">
          <main className="site-main">{children}</main>
        </div>
      </body>
    </html>
  );
}
