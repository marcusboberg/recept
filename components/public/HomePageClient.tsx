'use client';

import dynamic from 'next/dynamic';
import { useEffect, useState } from 'react';
import { PublicRecipesView } from '@/components/public/PublicRecipesView';
import { recipeToJson } from '@/lib/recipes';
import { emptyRecipe } from '@/lib/templates';
import { type Recipe } from '@/schema/recipeSchema';

type HomeMode =
  | { type: 'public' }
  | { type: 'new' }
  | { type: 'edit'; slug: string };

const NewRecipeSection = dynamic(
  () => import('@/components/NewRecipeSection').then((module) => module.NewRecipeSection),
  { loading: () => <div className="studio-lazy-loading">Laddar studion…</div> },
);

const EditRecipeSection = dynamic(
  () => import('@/components/EditRecipeSection').then((module) => module.EditRecipeSection),
  { loading: () => <div className="studio-lazy-loading">Laddar studion…</div> },
);

function parseStudioHash(hash: string): HomeMode {
  const trimmed = hash.startsWith('#') ? hash.slice(1) : hash;
  const [segment, slug] = trimmed.split('/').filter(Boolean);

  if (segment === 'new') {
    return { type: 'new' };
  }

  if (segment === 'edit' && slug) {
    return { type: 'edit', slug };
  }

  return { type: 'public' };
}

interface Props {
  recipes: Recipe[];
}

export function HomePageClient({ recipes }: Props) {
  const [mode, setMode] = useState<HomeMode>({ type: 'public' });

  useEffect(() => {
    if (typeof window === 'undefined') {
      return;
    }

    const handleHashChange = () => {
      setMode(parseStudioHash(window.location.hash));
    };

    handleHashChange();
    window.addEventListener('hashchange', handleHashChange);
    return () => window.removeEventListener('hashchange', handleHashChange);
  }, []);

  if (mode.type === 'new') {
    return <NewRecipeSection initialJson={recipeToJson(emptyRecipe)} initialTitle={emptyRecipe.title} />;
  }

  if (mode.type === 'edit') {
    return <EditRecipeSection slug={mode.slug} />;
  }

  return <PublicRecipesView recipes={recipes} view={{ type: 'list' }} />;
}
