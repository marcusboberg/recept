import { useEffect, useState } from 'react';
import { collection, getDocs, onSnapshot, orderBy, query } from 'firebase/firestore';
import { getFirestoreClient } from '@/lib/firebaseClient';
import { getFirestorePollIntervalMs, shouldDisableFirestoreRealtime } from '@/lib/firestoreSupport';
import { recipeSchema, type Recipe } from '@/schema/recipeSchema';

export function useLiveRecipes(initialRecipes: Recipe[] = []) {
  const [recipes, setRecipes] = useState<Recipe[]>(initialRecipes);

  useEffect(() => {
    const db = getFirestoreClient();
    const recipesRef = collection(db, 'recipes');
    const recipesQuery = query(recipesRef, orderBy('title'));
    let cancelled = false;
    let pollTimer: ReturnType<typeof setInterval> | null = null;

    const applySnapshot = (snapshot: { forEach: (cb: (docSnapshot: any) => void) => void }) => {
      const next: Recipe[] = [];
      snapshot.forEach((docSnapshot) => {
        const parsed = recipeSchema.safeParse(docSnapshot.data());
        if (parsed.success) {
          next.push(parsed.data);
        }
      });
      setRecipes(next);
    };

    const startPolling = () => {
      if (pollTimer) return;
      const pollOnce = async () => {
        try {
          const snapshot = await getDocs(recipesQuery);
          if (!cancelled) {
            applySnapshot(snapshot);
          }
        } catch {
          // Ignore transient polling errors.
        }
      };
      pollOnce();
      pollTimer = setInterval(pollOnce, getFirestorePollIntervalMs());
    };

    if (shouldDisableFirestoreRealtime()) {
      startPolling();
      return () => {
        cancelled = true;
        if (pollTimer) {
          clearInterval(pollTimer);
        }
      };
    }

    let unsubscribe: (() => void) | null = null;
    unsubscribe = onSnapshot(
      recipesQuery,
      (snapshot) => applySnapshot(snapshot),
      () => {
        if (cancelled) return;
        unsubscribe?.();
        unsubscribe = null;
        startPolling();
      },
    );

    return () => {
      cancelled = true;
      if (pollTimer) {
        clearInterval(pollTimer);
      }
      unsubscribe?.();
    };
  }, []);

  return recipes;
}
