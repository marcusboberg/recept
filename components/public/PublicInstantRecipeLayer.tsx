'use client';

import { RecipeMobile } from '@/components/RecipeMobile';
import { usePublicSite } from '@/components/public/PublicSiteContext';

export function PublicInstantRecipeLayer() {
  const { pendingRecipe, pendingRecipeSlug } = usePublicSite();

  if (!pendingRecipe || !pendingRecipeSlug || pendingRecipe.slug !== pendingRecipeSlug) {
    return null;
  }

  return (
    <div className="public-instant-recipe-layer" aria-live="polite">
      <RecipeMobile slug={pendingRecipe.slug} initialRecipe={pendingRecipe} source="instant" />
    </div>
  );
}
