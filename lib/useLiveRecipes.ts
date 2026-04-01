import { useEffect, useState } from 'react';
import { collection, onSnapshot, orderBy, query } from 'firebase/firestore';
import { getFirestoreClient } from '@/lib/firebaseClient';
import { normalizeLegacyRecipeForRead } from '@/lib/legacyRecipes';
import { recipeSchema, type Recipe } from '@/schema/recipeSchema';

interface UseLiveRecipesOptions {
  enabled?: boolean;
}

export function useLiveRecipes(initialRecipes: Recipe[] = [], options: UseLiveRecipesOptions = {}) {
  const { enabled = true } = options;
  const [recipes, setRecipes] = useState<Recipe[]>(initialRecipes);

  useEffect(() => {
    if (!enabled) {
      return;
    }
    const db = getFirestoreClient();
    const recipesRef = collection(db, 'recipes');
    const recipesQuery = query(recipesRef, orderBy('title'));
    const unsubscribe = onSnapshot(recipesQuery, (snapshot) => {
      const next: Recipe[] = [];
      snapshot.forEach((docSnapshot) => {
        const parsed = recipeSchema.safeParse(normalizeLegacyRecipeForRead(docSnapshot.data()));
        if (parsed.success) {
          next.push(parsed.data);
        } else if (process.env.NODE_ENV !== 'production') {
          const firstIssue = parsed.error.issues[0];
          const issuePath = firstIssue?.path?.join('.') || '(root)';
          const issueMessage = firstIssue?.message || 'Unknown schema error';
          console.warn(`[useLiveRecipes] Ignoring invalid recipe "${docSnapshot.id}" at ${issuePath}: ${issueMessage}`);
        }
      });
      setRecipes(next);
    });
    return unsubscribe;
  }, [enabled]);

  return enabled ? recipes : initialRecipes;
}
