'use client';

import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import type { PublicView } from '@/lib/routes';
import type { Recipe } from '@/schema/recipeSchema';

interface PublicSiteContextValue {
  cachedRecipes: Recipe[];
  cachedRecipesBySlug: Record<string, Recipe>;
  lastPublicView: Exclude<PublicView, { type: 'recipe' }> | null;
  pendingRecipeSlug: string | null;
  pendingRecipe: Recipe | null;
  pendingPublicView: Exclude<PublicView, { type: 'recipe' }> | null;
  seedRecipes: (recipes: Recipe[]) => void;
  seedRecipe: (recipe: Recipe) => void;
  rememberPublicView: (view: Exclude<PublicView, { type: 'recipe' }>) => void;
  openRecipeInstant: (recipe: Recipe) => void;
  openPublicInstant: (view: Exclude<PublicView, { type: 'recipe' }>) => void;
  completePublicNavigation: (view: Exclude<PublicView, { type: 'recipe' }>) => void;
  completeRecipeNavigation: (slug: string) => void;
}

const PublicSiteContext = createContext<PublicSiteContextValue | null>(null);

function toRecipeRecord(recipes: Recipe[]) {
  const next: Record<string, Recipe> = {};
  for (const recipe of recipes) {
    next[recipe.slug] = recipe;
    for (const legacySlug of recipe.slugHistory ?? []) {
      next[legacySlug] = recipe;
    }
  }
  return next;
}

function isSameRecipeList(current: Recipe[], incoming: Recipe[]) {
  if (current === incoming) {
    return true;
  }

  if (current.length !== incoming.length) {
    return false;
  }

  return current.every((recipe, index) => {
    const other = incoming[index];
    return recipe.slug === other.slug && recipe.updatedAt === other.updatedAt;
  });
}

function isSameRecipe(current: Recipe | undefined, incoming: Recipe) {
  if (!current) {
    return false;
  }

  return current.slug === incoming.slug && current.updatedAt === incoming.updatedAt;
}

export function PublicSiteProvider({ children }: { children: ReactNode }) {
  const [cachedRecipes, setCachedRecipes] = useState<Recipe[]>([]);
  const [cachedRecipesBySlug, setCachedRecipesBySlug] = useState<Record<string, Recipe>>({});
  const [lastPublicView, setLastPublicView] = useState<Exclude<PublicView, { type: 'recipe' }> | null>(null);
  const [pendingRecipeSlug, setPendingRecipeSlug] = useState<string | null>(null);
  const [pendingRecipe, setPendingRecipe] = useState<Recipe | null>(null);
  const [pendingPublicView, setPendingPublicView] = useState<Exclude<PublicView, { type: 'recipe' }> | null>(null);

  const seedRecipes = useCallback((recipes: Recipe[]) => {
    setCachedRecipes((prev) => (isSameRecipeList(prev, recipes) ? prev : recipes));
    setCachedRecipesBySlug((prev) => {
      const nextEntries = toRecipeRecord(recipes);
      let changed = false;
      for (const [slug, recipe] of Object.entries(nextEntries)) {
        if (!isSameRecipe(prev[slug], recipe)) {
          changed = true;
          break;
        }
      }

      if (!changed) {
        return prev;
      }

      return {
        ...prev,
        ...nextEntries,
      };
    });
  }, []);

  const seedRecipe = useCallback((recipe: Recipe) => {
    setCachedRecipesBySlug((prev) => {
      const nextEntries = toRecipeRecord([recipe]);
      const nextPrimary = nextEntries[recipe.slug];
      if (isSameRecipe(prev[recipe.slug], nextPrimary)) {
        return prev;
      }

      return {
        ...prev,
        ...nextEntries,
      };
    });
    setCachedRecipes((prev) => {
      const existingIndex = prev.findIndex((item) => item.slug === recipe.slug);
      if (existingIndex === -1) {
        return [...prev, recipe];
      }

      if (isSameRecipe(prev[existingIndex], recipe)) {
        return prev;
      }

      const next = [...prev];
      next[existingIndex] = recipe;
      return next;
    });
  }, []);

  const rememberPublicView = useCallback((view: Exclude<PublicView, { type: 'recipe' }>) => {
    setLastPublicView((prev) => {
      if (!prev) {
        return view;
      }

      if (
        prev.type === view.type &&
        ('slug' in prev ? prev.slug : null) === ('slug' in view ? view.slug : null) &&
        ('group' in prev ? prev.group : null) === ('group' in view ? view.group : null)
      ) {
        return prev;
      }

      return view;
    });
  }, []);

  const openRecipeInstant = useCallback((recipe: Recipe) => {
    seedRecipe(recipe);
    setPendingPublicView(null);
    setPendingRecipeSlug(recipe.slug);
    setPendingRecipe((prev) => (isSameRecipe(prev ?? undefined, recipe) ? prev : recipe));
  }, [seedRecipe]);

  const openPublicInstant = useCallback((view: Exclude<PublicView, { type: 'recipe' }>) => {
    setPendingRecipeSlug(null);
    setPendingRecipe(null);
    setPendingPublicView(view);
  }, []);

  const completePublicNavigation = useCallback((view: Exclude<PublicView, { type: 'recipe' }>) => {
    setLastPublicView((prev) => {
      if (!prev) {
        return view;
      }

      if (
        prev.type === view.type &&
        ('slug' in prev ? prev.slug : null) === ('slug' in view ? view.slug : null) &&
        ('group' in prev ? prev.group : null) === ('group' in view ? view.group : null)
      ) {
        return prev;
      }

      return view;
    });
    setPendingPublicView((prev) => {
      if (!prev) {
        return prev;
      }

      if (
        prev.type === view.type &&
        ('slug' in prev ? prev.slug : null) === ('slug' in view ? view.slug : null) &&
        ('group' in prev ? prev.group : null) === ('group' in view ? view.group : null)
      ) {
        return null;
      }

      return prev;
    });
  }, []);

  const completeRecipeNavigation = useCallback((slug: string) => {
    setPendingRecipeSlug((prev) => (prev === slug ? null : prev));
    setPendingRecipe((prev) => (prev?.slug === slug ? null : prev));
  }, []);

  useEffect(() => {
    if ((!pendingRecipeSlug && !pendingPublicView) || typeof document === 'undefined') {
      return;
    }

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = previousOverflow;
    };
  }, [pendingPublicView, pendingRecipeSlug]);

  const value = useMemo<PublicSiteContextValue>(
    () => ({
      cachedRecipes,
      cachedRecipesBySlug,
      lastPublicView,
      pendingRecipeSlug,
      pendingRecipe,
      pendingPublicView,
      seedRecipes,
      seedRecipe,
      rememberPublicView,
      openRecipeInstant,
      openPublicInstant,
      completePublicNavigation,
      completeRecipeNavigation,
    }),
    [
      cachedRecipes,
      cachedRecipesBySlug,
      completePublicNavigation,
      completeRecipeNavigation,
      lastPublicView,
      openPublicInstant,
      openRecipeInstant,
      pendingPublicView,
      pendingRecipe,
      pendingRecipeSlug,
      rememberPublicView,
      seedRecipe,
      seedRecipes,
    ],
  );

  return <PublicSiteContext.Provider value={value}>{children}</PublicSiteContext.Provider>;
}

export function usePublicSite() {
  const context = useContext(PublicSiteContext);
  if (!context) {
    throw new Error('usePublicSite must be used within PublicSiteProvider');
  }
  return context;
}
