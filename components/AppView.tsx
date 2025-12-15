'use client';

import { useEffect, useMemo, useState } from 'react';
import { AuthGate } from '@/components/AuthGate';
import { RecipesShell } from '@/components/RecipesShell';
import { RecipeMobile } from '@/components/RecipeMobile';
import { EditRecipeSection } from '@/components/EditRecipeSection';
import { NewRecipeSection } from '@/components/NewRecipeSection';
import { emptyRecipe } from '@/lib/templates';
import { recipeToJson } from '@/lib/recipes';

type View =
  | { type: 'list' }
  | { type: 'recipe'; slug: string }
  | { type: 'edit'; slug: string }
  | { type: 'new' };

function parseHash(hash: string): View {
  const trimmed = hash.startsWith('#') ? hash.slice(1) : hash;
  const [segment, slug] = trimmed.split('/').filter(Boolean);
  if (!segment) {
    return { type: 'list' };
  }
  switch (segment) {
    case 'recipe':
      return slug ? { type: 'recipe', slug } : { type: 'list' };
    case 'edit':
      return slug ? { type: 'edit', slug } : { type: 'list' };
    case 'new':
      return { type: 'new' };
    default:
      return { type: 'list' };
  }
}

export function AppView() {
  const [view, setView] = useState<View>(() => (typeof window === 'undefined' ? { type: 'list' } : parseHash(window.location.hash)));

  useEffect(() => {
    const handleHashChange = () => {
      setView(parseHash(window.location.hash));
    };
    window.addEventListener('hashchange', handleHashChange);
    return () => {
      window.removeEventListener('hashchange', handleHashChange);
    };
  }, []);

  const hero = useMemo(
    () => (
      <section className="hero">
        <div className="hero__copy">
          <p className="eyebrow">Minimal recipes</p>
          <h2 className="hero__title">Cook beautiful food with simple guidance.</h2>
          <p className="hero__subtitle">Browse, search, and open any dish in one tap.</p>
        </div>
        <div className="hero__cta">
          <a href="#/new" className="button-primary">
            + Nytt recept
          </a>
        </div>
      </section>
    ),
    [],
  );

  if (view.type === 'recipe') {
    return <RecipeMobile slug={view.slug} />;
  }

  if (view.type === 'edit') {
    return <EditRecipeSection slug={view.slug} />;
  }

  if (view.type === 'new') {
    return <NewRecipeSection initialJson={recipeToJson(emptyRecipe)} initialTitle={emptyRecipe.title} />;
  }

  return (
    <div className="page-shell space-y-6">
      {hero}
      <RecipesShell />
    </div>
  );
}
