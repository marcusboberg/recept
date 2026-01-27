import { useEffect, useState } from 'react';
import { collection, onSnapshot, orderBy, query } from 'firebase/firestore';
import {
  collection as collectionLite,
  getDocs as getDocsLite,
  orderBy as orderByLite,
  query as queryLite,
} from 'firebase/firestore/lite';
import { getFirestoreClient, getFirestoreLiteClient } from '@/lib/firebaseClient';
import { getFirestorePollIntervalMs, shouldDisableFirestoreRealtime } from '@/lib/firestoreSupport';
import { recipeSchema, type Recipe } from '@/schema/recipeSchema';

export function useLiveRecipes(initialRecipes: Recipe[] = []) {
  const [recipes, setRecipes] = useState<Recipe[]>(initialRecipes);

  useEffect(() => {
    const db = getFirestoreClient();
    const dbLite = getFirestoreLiteClient();
    const recipesRef = collection(db, 'recipes');
    const recipesQuery = query(recipesRef, orderBy('title'));
    const recipesRefLite = collectionLite(dbLite, 'recipes');
    const recipesQueryLite = queryLite(recipesRefLite, orderByLite('title'));
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
          const snapshot = await getDocsLite(recipesQueryLite);
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
