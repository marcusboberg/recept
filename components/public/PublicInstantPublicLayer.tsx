'use client';

import { PublicRecipesView } from '@/components/public/PublicRecipesView';
import { usePublicSite } from '@/components/public/PublicSiteContext';

export function PublicInstantPublicLayer() {
  const { cachedRecipes, pendingPublicView, pendingRecipeSlug } = usePublicSite();

  if (!pendingPublicView || pendingRecipeSlug || cachedRecipes.length === 0) {
    return null;
  }

  return (
    <div className="public-instant-public-layer" aria-live="polite">
      <PublicRecipesView recipes={cachedRecipes} view={pendingPublicView} embedded />
    </div>
  );
}
