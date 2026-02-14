import { useEffect, useState } from 'react';
import { collection, onSnapshot, orderBy, query } from 'firebase/firestore';
import { getFirestoreClient } from '@/lib/firebaseClient';
import { recipeSchema, type Recipe } from '@/schema/recipeSchema';

export function useLiveRecipes(initialRecipes: Recipe[] = []) {
  const [recipes, setRecipes] = useState<Recipe[]>(initialRecipes);

  useEffect(() => {
    const db = getFirestoreClient();
    const recipesRef = collection(db, 'recipes');
    const recipesQuery = query(recipesRef, orderBy('title'));
    const unsubscribe = onSnapshot(recipesQuery, (snapshot) => {
      const next: Recipe[] = [];
      snapshot.forEach((docSnapshot) => {
        const parsed = recipeSchema.safeParse(docSnapshot.data());
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
  }, []);

  return recipes;
}
