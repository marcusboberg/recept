'use client';

import { startTransition, useEffect, useMemo, useRef, useState } from 'react';
import type { User } from 'firebase/auth';
import { useRecipeChecklistState } from '@/components/useRecipeChecklistState';
import { DEFAULT_RECIPE_IMAGE } from '@/lib/images';
import { normalizeLegacyRecipeForRead } from '@/lib/legacyRecipes';
import { shouldApplyRecipeRefresh } from '@/lib/publicRecipeRefresh';
import {
  applyEditableIngredientGroups,
  cloneRecipe,
  getEditableIngredientGroups,
  getEditableTitleSegments,
  getRecipeHeroImage,
  getTitleSegments,
  toIngredientGroups,
  type IngredientGroup,
} from '@/lib/recipePresentation';
import { getHomePath, getRecipePath, getStudioEditHref } from '@/lib/routes';
import { buildQuickEditPayload } from '@/lib/recipeWorkflows';
import { recipeSchema, type Recipe } from '@/schema/recipeSchema';

interface Options {
  slug: string;
  initialRecipe?: Recipe;
}

export function useRecipeMobileState({ slug, initialRecipe }: Options) {
  const [liveRecipe, setLiveRecipe] = useState<Recipe | null>(initialRecipe ?? null);
  const [error, setError] = useState<string | null>(null);
  const [isQuickEditing, setIsQuickEditing] = useState(false);
  const [draftRecipe, setDraftRecipe] = useState<Recipe | null>(null);
  const [authStatus, setAuthStatus] = useState<'loading' | 'authenticated' | 'unauthenticated'>('loading');
  const [authUser, setAuthUser] = useState<User | null>(null);
  const [editStatus, setEditStatus] = useState<string | null>(null);
  const [isSavingEdit, setIsSavingEdit] = useState(false);
  const [shareStatus, setShareStatus] = useState<string | null>(null);
  const wakeLockRef = useRef<WakeLockSentinel | null>(null);
  const shareStatusTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const editStatusTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const redirectAttemptedRef = useRef(false);

  useEffect(() => {
    redirectAttemptedRef.current = false;
  }, [slug]);

  useEffect(() => {
    let cancelled = false;
    if (!slug) return undefined;

    if (initialRecipe?.slug === slug) {
      setLiveRecipe(initialRecipe);
      setError(null);
      return undefined;
    }

    const loadRecipe = async () => {
      const [{ doc, getDoc }, { getFirestoreClient }, { resolveRecipeSlugByHistory }] = await Promise.all([
        import('firebase/firestore'),
        import('@/lib/firebaseClient'),
        import('@/lib/slugHistory'),
      ]);

      const db = getFirestoreClient();
      const snapshot = await getDoc(doc(db, 'recipes', slug));

      if (!snapshot.exists()) {
        if (!redirectAttemptedRef.current) {
          redirectAttemptedRef.current = true;
          try {
            const resolved = await resolveRecipeSlugByHistory(db, slug);
            if (resolved && resolved !== slug && typeof window !== 'undefined') {
              window.location.replace(getRecipePath(resolved));
              return;
            }
          } catch {
            // fall through to error state
          }
        }

        if (!cancelled) {
          setError('Receptet hittades inte.');
          setLiveRecipe(null);
        }
        return;
      }

      const parsed = recipeSchema.safeParse(normalizeLegacyRecipeForRead(snapshot.data()));
      if (!cancelled && parsed.success) {
        setLiveRecipe(parsed.data);
        setError(null);
      } else if (!cancelled) {
        setError('Receptet kunde inte läsas.');
        setLiveRecipe(null);
      }
    };

    loadRecipe().catch(() => {
      if (!cancelled) {
        setError('Receptet kunde inte läsas.');
        setLiveRecipe(null);
      }
    });

    return () => {
      cancelled = true;
    };
  }, [initialRecipe, slug]);

  useEffect(() => {
    if (!slug || !liveRecipe || isQuickEditing) {
      return;
    }

    let cancelled = false;
    const timeoutId = window.setTimeout(async () => {
      try {
        const [{ doc, getDoc }, { getFirestoreClient }] = await Promise.all([
          import('firebase/firestore'),
          import('@/lib/firebaseClient'),
        ]);

        const db = getFirestoreClient();
        const snapshot = await getDoc(doc(db, 'recipes', slug));
        if (!snapshot.exists() || cancelled) {
          return;
        }

        const parsed = recipeSchema.safeParse(normalizeLegacyRecipeForRead(snapshot.data()));
        if (!parsed.success || cancelled) {
          return;
        }

        if (!shouldApplyRecipeRefresh(liveRecipe, parsed.data)) {
          return;
        }

        startTransition(() => {
          setLiveRecipe(parsed.data);
          setError(null);
        });
      } catch {
        // Silent refresh should never disturb the visible page.
      }
    }, 3000);

    return () => {
      cancelled = true;
      window.clearTimeout(timeoutId);
    };
  }, [isQuickEditing, liveRecipe, slug]);

  useEffect(() => {
    let cancelled = false;
    let unsubscribe: () => void = () => {};

    const bindAuth = async () => {
      const [{ onAuthStateChanged }, { getFirebaseAuth }] = await Promise.all([
        import('firebase/auth'),
        import('@/lib/firebaseClient'),
      ]);

      if (cancelled) {
        return;
      }

      const auth = getFirebaseAuth();
      unsubscribe = onAuthStateChanged(auth, (current) => {
        if (current) {
          setAuthUser(current);
          setAuthStatus('authenticated');
        } else {
          setAuthUser(null);
          setAuthStatus('unauthenticated');
        }
      });
    };

    bindAuth().catch(() => {
      if (!cancelled) {
        setAuthUser(null);
        setAuthStatus('unauthenticated');
      }
    });

    return () => {
      cancelled = true;
      unsubscribe();
    };
  }, []);

  useEffect(() => {
    if (!isQuickEditing) {
      setDraftRecipe(null);
    }
  }, [isQuickEditing]);

  useEffect(() => {
    if (editStatus !== 'Sparat.') {
      return undefined;
    }
    editStatusTimerRef.current = setTimeout(() => setEditStatus(null), 2200);
    return () => {
      if (editStatusTimerRef.current) {
        clearTimeout(editStatusTimerRef.current);
      }
    };
  }, [editStatus]);

  const displayRecipe = isQuickEditing && draftRecipe ? draftRecipe : liveRecipe;
  const ingredientGroups = useMemo(() => (displayRecipe ? toIngredientGroups(displayRecipe) : []), [displayRecipe]);
  const heroImage = displayRecipe ? getRecipeHeroImage(displayRecipe) : DEFAULT_RECIPE_IMAGE;
  const titleSegments = displayRecipe
    ? isQuickEditing
      ? getEditableTitleSegments(displayRecipe)
      : getTitleSegments(displayRecipe)
    : [];

  const checklistState = useRecipeChecklistState({
    ingredientGroupCount: ingredientGroups.length,
    stepCount: displayRecipe?.steps.length ?? 0,
  });

  useEffect(() => {
    if (!heroImage || typeof document === 'undefined') {
      return;
    }
    document.documentElement.style.setProperty('--recipe-blur-image', `url(${heroImage})`);
    return () => {
      document.documentElement.style.removeProperty('--recipe-blur-image');
    };
  }, [heroImage]);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const isStandalone =
      window.matchMedia?.('(display-mode: standalone)')?.matches ||
      window.matchMedia?.('(display-mode: fullscreen)')?.matches ||
      (typeof (window.navigator as any).standalone !== 'undefined' && (window.navigator as any).standalone);

    if (isStandalone) {
      document.documentElement.classList.add('pwa-mode');
      return () => {
        document.documentElement.classList.remove('pwa-mode');
      };
    }
    return undefined;
  }, []);

  useEffect(() => {
    return () => {
      if (shareStatusTimerRef.current) {
        clearTimeout(shareStatusTimerRef.current);
      }
      if (editStatusTimerRef.current) {
        clearTimeout(editStatusTimerRef.current);
      }
    };
  }, []);

  useEffect(() => {
    if (typeof document === 'undefined' || typeof navigator === 'undefined' || !('wakeLock' in navigator)) {
      return;
    }

    let cancelled = false;
    const requestLock = async () => {
      try {
        const sentinel = await (navigator as Navigator & { wakeLock: WakeLock }).wakeLock.request('screen');
        if (cancelled) {
          await sentinel.release();
          return;
        }
        wakeLockRef.current = sentinel;
      } catch {
        // Wake lock can fail due to permissions or unsupported contexts.
      }
    };

    const handleVisibility = () => {
      if (document.visibilityState === 'visible') {
        requestLock();
      }
    };

    requestLock();
    document.addEventListener('visibilitychange', handleVisibility);
    return () => {
      cancelled = true;
      document.removeEventListener('visibilitychange', handleVisibility);
      if (wakeLockRef.current) {
        wakeLockRef.current.release().catch(() => undefined);
        wakeLockRef.current = null;
      }
    };
  }, []);

  const updateDraftRecipe = (updater: (prev: Recipe) => Recipe) => {
    setDraftRecipe((prev) => (prev ? updater(prev) : prev));
  };

  const updateDraftIngredientGroups = (updater: (prev: IngredientGroup[]) => IngredientGroup[]) => {
    updateDraftRecipe((prev) => applyEditableIngredientGroups(prev, updater(getEditableIngredientGroups(prev))));
  };

  const handleBack = () => {
    if (typeof window === 'undefined') return;
    if (window.history.length > 1) {
      window.history.back();
    } else {
      window.location.href = getHomePath();
    }
  };

  const handleStartQuickEdit = () => {
    if (!liveRecipe) return;

    if (authStatus !== 'authenticated') {
      if (typeof window !== 'undefined') {
        window.location.assign(getStudioEditHref(liveRecipe.slug));
      }
      return;
    }

    setDraftRecipe(cloneRecipe(liveRecipe));
    setEditStatus(null);
    setIsQuickEditing(true);
  };

  const handleCancelQuickEdit = () => {
    setEditStatus(null);
    setIsQuickEditing(false);
  };

  const handleSaveQuickEdit = async () => {
    if (!draftRecipe || !liveRecipe) return;

    if (authStatus !== 'authenticated' || !authUser) {
      setEditStatus('Logga in för att spara ändringar.');
      return;
    }

    setIsSavingEdit(true);
    setEditStatus(null);

    try {
      const [{ doc, setDoc }, { getFirestoreClient }] = await Promise.all([
        import('firebase/firestore'),
        import('@/lib/firebaseClient'),
      ]);
      const db = getFirestoreClient();
      const payload = buildQuickEditPayload({
        draftRecipe,
        liveRecipe,
      });

      await setDoc(doc(db, 'recipes', liveRecipe.slug), payload);
      setLiveRecipe(payload);
      setEditStatus('Sparat.');
      setIsQuickEditing(false);
    } catch (saveError) {
      setEditStatus((saveError as Error).message || 'Kunde inte spara ändringarna.');
    } finally {
      setIsSavingEdit(false);
    }
  };

  const setShareFeedback = (value: string) => {
    setShareStatus(value);
    if (shareStatusTimerRef.current) {
      clearTimeout(shareStatusTimerRef.current);
    }
    shareStatusTimerRef.current = setTimeout(() => setShareStatus(null), 2200);
  };

  const handleShare = async () => {
    if (!liveRecipe || typeof window === 'undefined') return;
    const shareUrl = `${window.location.origin}/share/${liveRecipe.slug}`;
    const nav = window.navigator as Navigator & {
      share?: (data?: ShareData) => Promise<void>;
      clipboard?: { writeText?: (value: string) => Promise<void> };
    };
    try {
      if (typeof nav.share === 'function') {
        await nav.share({
          title: liveRecipe.title,
          text: `Kolla receptet: ${liveRecipe.title}`,
          url: shareUrl,
        });
        return;
      }
      if (typeof nav.clipboard?.writeText === 'function') {
        await nav.clipboard.writeText(shareUrl);
        setShareFeedback('Delningslank kopierad.');
        return;
      }
      setShareFeedback(`Kopiera denna lank: ${shareUrl}`);
    } catch {
      // User cancelled share or clipboard failed.
    }
  };

  return {
    ...checklistState,
    authStatus,
    currentRecipe: displayRecipe ?? liveRecipe,
    draftRecipe,
    editStatus,
    error,
    handleBack,
    handleCancelQuickEdit,
    handleSaveQuickEdit,
    handleShare,
    handleStartQuickEdit,
    heroImage,
    ingredientGroups,
    isQuickEditing,
    isSavingEdit,
    liveRecipe,
    shareStatus,
    titleSegments,
    updateDraftIngredientGroups,
    updateDraftRecipe,
  };
}
