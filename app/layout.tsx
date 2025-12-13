import React from 'react';
import Link from 'next/link';
import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'Recept | Git-backed recipes',
  description: 'Recipes stored as JSON and rendered with Next.js',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className="bg-stone-50 text-stone-900">
        <main className="min-h-screen flex flex-col">
          <div className="max-w-5xl w-full mx-auto px-4 py-6 space-y-8">
            <header className="site-header">
              <Link href="/" className="brand">Recept</Link>
              <Link className="text-link" href="/new">
                New recipe
              </Link>
            </header>
            {children}
          </div>
        </main>
      </body>
    </html>
  );
}
