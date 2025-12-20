'use client';

import { useEffect, useMemo, useState } from 'react';
import { AuthGate } from '@/components/AuthGate';
import { RecipesShell } from '@/components/RecipesShell';
import { RecipeMobile } from '@/components/RecipeMobile';
import { EditRecipeSection } from '@/components/EditRecipeSection';
import { NewRecipeSection } from '@/components/NewRecipeSection';
import { emptyRecipe } from '@/lib/templates';
import { recipeToJson } from '@/lib/recipes';
import { SearchBar } from './SearchBar';

type View =
  | { type: 'categories' }
  | { type: 'category'; slug: string }
  | { type: 'list' }
  | { type: 'recipe'; slug: string }
  | { type: 'edit'; slug: string }
  | { type: 'new' }
  | { type: 'categoryGroup'; group: 'place' | 'base' | 'type' };

function parseHash(hash: string): View {
  const trimmed = hash.startsWith('#') ? hash.slice(1) : hash;
  const [segment, slug] = trimmed.split('/').filter(Boolean);
  if (!segment) {
    return { type: 'list' };
  }
  switch (segment) {
    case 'categories':
      if (slug === 'place' || slug === 'base' || slug === 'type') {
        return { type: 'categoryGroup', group: slug };
      }
      return { type: 'categories' };
    case 'category':
      return slug ? { type: 'category', slug } : { type: 'categories' };
    case 'recipes':
      return { type: 'list' };
    case 'recipe':
      return slug ? { type: 'recipe', slug } : { type: 'categories' };
    case 'edit':
      return slug ? { type: 'edit', slug } : { type: 'categories' };
    case 'new':
      return { type: 'new' };
    default:
      return { type: 'categories' };
  }
}

export function AppView() {
  // Start with a deterministic view for SSR; hydrate with the real hash once the client is available.
  const [view, setView] = useState<View>(() => (typeof window === 'undefined' ? { type: 'list' } : parseHash(window.location.hash)));

  useEffect(() => {
    const handleHashChange = () => setView(parseHash(window.location.hash));
    window.addEventListener('hashchange', handleHashChange);
    return () => {
      window.removeEventListener('hashchange', handleHashChange);
    };
  }, []);

  useEffect(() => {
    if (typeof document === 'undefined') {
      return;
    }
    const recipeClass = 'is-recipe-view';
    const homeClass = 'is-home-view';
    const shell = document.querySelector('.app-shell');
    if (!shell) {
      return;
    }
    const isRecipe = view.type === 'recipe';
    const isHome = view.type === 'list';

    shell.classList.toggle(recipeClass, isRecipe);
    shell.classList.toggle(homeClass, isHome);
    document.body.classList.toggle(homeClass, isHome);

    return () => {
      shell.classList.remove(recipeClass);
      shell.classList.remove(homeClass);
      document.body.classList.remove(homeClass);
    };
  }, [view.type]);

  const categoryGroups = [
    { key: 'place' as const, label: 'Region', href: '#/categories/place', accent: 'place' },
    { key: 'base' as const, label: 'Basvara', href: '#/categories/base', accent: 'base' },
    { key: 'type' as const, label: 'Tillagning', href: '#/categories/type', accent: 'type' },
  ];

  const [searchQuery, setSearchQuery] = useState('');

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
    <div className="page-shell space-y-6 home-landing">
      <header className="page-header">
        <div>
          <p className="eyebrow">Alla recept</p>
          <h1 className="page-title">Recept</h1>
        </div>
        <div className="page-actions">
          <a href="#/new" className="button-primary button-compact">
            + Nytt recept
          </a>
        </div>
      </header>
      {view.type === 'list' && (
        <div className="category-search-row">
          <div className="category-group-row">
            {categoryGroups.map((group) => (
              <a key={group.key} className={`category-group-card category-group-card--${group.accent}`} href={group.href}>
                <div className="category-group-card__label">{group.label}</div>
                <div className="category-group-card__cta">
                  Visa kategorier <span aria-hidden="true">→</span>
                </div>
              </a>
            ))}
          </div>
          <div className="category-search">
            <SearchBar value={searchQuery} onChange={setSearchQuery} />
          </div>
        </div>
      )}
      {view.type === 'categories' && <RecipesShell showCategories />}
      {view.type === 'categoryGroup' && <RecipesShell categoryGroup={view.group} />}
      {view.type === 'category' && <RecipesShell categorySlug={view.slug} />}
      {view.type === 'list' && (
        <RecipesShell searchQuery={searchQuery} onSearchChange={setSearchQuery} showSearchBar={false} />
      )}
    </div>
  );
}
