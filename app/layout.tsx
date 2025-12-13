import React from 'react';
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
          <div className="max-w-5xl w-full mx-auto px-4 py-6 space-y-6">
            <header className="flex items-center justify-between">
              <div>
                <h1 className="text-2xl font-semibold tracking-tight">Recept</h1>
                <p className="text-sm text-stone-600">Git is the CMS. JSON is canonical.</p>
              </div>
              <div className="text-xs text-stone-500">
                <p>Editing = paste, validate, commit.</p>
                <p>Only GitHub auth users can edit.</p>
              </div>
            </header>
            {children}
          </div>
        </main>
      </body>
    </html>
  );
}
