import 'server-only';

import { unstable_cache } from 'next/cache';
import { collection, getDocs, orderBy, query } from 'firebase/firestore';
import { getFirestoreServer } from '@/lib/firebaseServer';
import { normalizeLegacyRecipeForRead } from '@/lib/legacyRecipes';
import { recipeSchema, type Recipe } from '@/schema/recipeSchema';

async function fetchPublicRecipesUncached() {
  const db = getFirestoreServer();
  const snapshot = await getDocs(query(collection(db, 'recipes'), orderBy('title')));
  const recipes: Recipe[] = [];

  snapshot.forEach((docSnapshot) => {
    const parsed = recipeSchema.safeParse(normalizeLegacyRecipeForRead(docSnapshot.data()));
    if (parsed.success) {
      recipes.push(parsed.data);
      return;
    }

    if (process.env.NODE_ENV !== 'production') {
      const firstIssue = parsed.error.issues[0];
      const issuePath = firstIssue?.path?.join('.') || '(root)';
      const issueMessage = firstIssue?.message || 'Unknown schema error';
      console.warn(`[publicRecipes] Ignoring invalid recipe "${docSnapshot.id}" at ${issuePath}: ${issueMessage}`);
    }
  });

  recipes.sort((a, b) => a.title.localeCompare(b.title, 'sv'));
  return recipes;
}

export async function getPublicRecipesFresh() {
  return fetchPublicRecipesUncached();
}

export const getPublicRecipesSnapshot = unstable_cache(fetchPublicRecipesUncached, ['public-recipes-snapshot'], {
  revalidate: 300,
});

export async function getPublicRecipeBySlug(slug: string) {
  const recipes = await getPublicRecipesSnapshot();
  const direct = recipes.find((recipe) => recipe.slug === slug);
  if (direct) {
    return { recipe: direct, canonicalSlug: direct.slug };
  }

  const resolved = recipes.find((recipe) => (recipe.slugHistory ?? []).includes(slug));
  if (resolved) {
    return { recipe: resolved, canonicalSlug: resolved.slug };
  }

  return { recipe: null, canonicalSlug: null };
}
