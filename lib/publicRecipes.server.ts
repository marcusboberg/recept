import 'server-only';

import { collection, doc, getDoc, getDocs, orderBy, query } from 'firebase/firestore';
import { getFirestoreServer } from '@/lib/firebaseServer';
import { resolveRecipeSlugByHistory } from '@/lib/slugHistory';
import { parsePublicRecipeData, sortPublicRecipes, type PublicRecipeParseResult } from '@/lib/publicRecipeData';

function warnInvalidPublicRecipe(docId: string, result: PublicRecipeParseResult) {
  if (process.env.NODE_ENV === 'production' || result.issues.length === 0) {
    return;
  }

  console.warn(`[publicRecipes] Ignoring invalid recipe "${docId}": ${result.issues[0]}`);
}

async function fetchPublicRecipesUncached() {
  const db = getFirestoreServer();
  const snapshot = await getDocs(query(collection(db, 'recipes'), orderBy('title')));
  const recipes = snapshot.docs.flatMap((docSnapshot) => {
    const result = parsePublicRecipeData(docSnapshot.data());
    if (result.recipe) {
      return [result.recipe];
    }

    warnInvalidPublicRecipe(docSnapshot.id, result);
    return [];
  });

  return sortPublicRecipes(recipes);
}

export async function getPublicRecipesFresh() {
  return fetchPublicRecipesUncached();
}

export async function getPublicRecipesSnapshot() {
  return getPublicRecipesFresh();
}

export async function getPublicRecipeBySlug(slug: string) {
  if (!slug) {
    return { recipe: null, canonicalSlug: null };
  }

  const db = getFirestoreServer();
  const directSnapshot = await getDoc(doc(db, 'recipes', slug));
  if (directSnapshot.exists()) {
    const result = parsePublicRecipeData(directSnapshot.data());
    if (result.recipe) {
      return { recipe: result.recipe, canonicalSlug: result.recipe.slug };
    }

    warnInvalidPublicRecipe(slug, result);
    return { recipe: null, canonicalSlug: null };
  }

  const resolvedSlug = await resolveRecipeSlugByHistory(db, slug);
  if (!resolvedSlug || resolvedSlug === slug) {
    return { recipe: null, canonicalSlug: null };
  }

  const resolvedSnapshot = await getDoc(doc(db, 'recipes', resolvedSlug));
  if (!resolvedSnapshot.exists()) {
    return { recipe: null, canonicalSlug: null };
  }

  const resolvedResult = parsePublicRecipeData(resolvedSnapshot.data());
  if (resolvedResult.recipe) {
    return { recipe: resolvedResult.recipe, canonicalSlug: resolvedSlug };
  }

  warnInvalidPublicRecipe(resolvedSlug, resolvedResult);
  return { recipe: null, canonicalSlug: null };
}
