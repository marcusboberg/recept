import Link from 'next/link';
import type { ReactNode } from 'react';

export default function SiteLayout({ children }: { children: ReactNode }) {
  return (
    <div className="site-layout">
      <header className="site-header">
        <div className="site-header__inner">
          <Link href="/" className="brand">Recept</Link>
          <Link className="text-link" href="/new">
            New recipe
          </Link>
        </div>
      </header>
      <div className="site-layout__content">{children}</div>
    </div>
  );
}
