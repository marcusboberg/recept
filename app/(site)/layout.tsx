import type { ReactNode } from 'react';
import { PublicInstantPublicLayer } from '@/components/public/PublicInstantPublicLayer';
import { PublicInstantRecipeLayer } from '@/components/public/PublicInstantRecipeLayer';
import { PublicSiteProvider } from '@/components/public/PublicSiteContext';

export default function SiteLayout({ children }: { children: ReactNode }) {
  return (
    <PublicSiteProvider>
      <div className="site-layout">
        <div className="site-layout__content">{children}</div>
        <PublicInstantPublicLayer />
        <PublicInstantRecipeLayer />
      </div>
    </PublicSiteProvider>
  );
}
