import type { ReactNode } from 'react';

export default function SiteLayout({ children }: { children: ReactNode }) {
  return (
    <div className="site-layout">
      <div className="site-layout__content">{children}</div>
    </div>
  );
}
