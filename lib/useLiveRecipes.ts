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
        }
      });
      setRecipes(next);
    });
    return unsubscribe;
  }, []);

  return recipes;
}
