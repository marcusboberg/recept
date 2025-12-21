'use client';

import { useEffect, useMemo, useRef, useState, type CSSProperties } from 'react';
import { AuthGate } from '@/components/AuthGate';
import { RecipesShell } from '@/components/RecipesShell';
import { RecipeMobile } from '@/components/RecipeMobile';
import { EditRecipeSection } from '@/components/EditRecipeSection';
import { NewRecipeSection } from '@/components/NewRecipeSection';
import { emptyRecipe } from '@/lib/templates';
import { recipeToJson } from '@/lib/recipes';
import { useLiveRecipes } from '@/lib/useLiveRecipes';
import { toCategorySlug } from '@/lib/categories';
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
  const searchInputId = 'home-search-input';
  const liveRecipes = useLiveRecipes();
  const [parentWidth, setParentWidth] = useState(0);

  const goBack = () => {
    if (typeof window === 'undefined') return;
    if (window.history.length > 1) {
      window.history.back();
    } else if (view.type === 'categoryGroup') {
      window.location.hash = '#/categories';
    } else {
      window.location.hash = '#/';
    }
  };

  const formatTitle = (slug: string) =>
    slug
      .split('-')
      .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
      .join(' ');

  const categoryParentLabel = useMemo(() => {
    if (view.type !== 'category') return null;
    const place = new Set<string>();
    const base = new Set<string>();
    const type = new Set<string>();
    liveRecipes.forEach((recipe) => {
      if (recipe.categoryPlace) place.add(toCategorySlug(recipe.categoryPlace));
      if (recipe.categoryBase) base.add(toCategorySlug(recipe.categoryBase));
      if (recipe.categoryType) type.add(toCategorySlug(recipe.categoryType));
    });
    if (place.has(view.slug)) return 'Alla Regioner';
    if (base.has(view.slug)) return 'Alla Basvaror';
    if (type.has(view.slug)) return 'Alla Tillagningar';
    return 'Alla Recept';
  }, [liveRecipes, view]);

  const headerTitle = (() => {
    if (view.type === 'categoryGroup') {
      if (view.group === 'place') return 'Alla Regioner';
      if (view.group === 'base') return 'Alla Basvaror';
      return 'Alla Tillagningar';
    }
    if (view.type === 'category') {
      return formatTitle(view.slug);
    }
    return 'Alla Recept';
  })();

  const prevTitle = (() => {
    if (view.type === 'categoryGroup') return 'Alla Recept';
    if (view.type === 'category') return categoryParentLabel;
    return null;
  })();
  const hasParent = Boolean(prevTitle);

  // Measure parent width for hover animation
  const parentRef = useRef<HTMLSpanElement | null>(null);

  useEffect(() => {
    if (!prevTitle) {
      return;
    }
    const measure = () => {
      const width = parentRef.current?.getBoundingClientRect().width ?? 0;
      const gap = 12; // px
      setParentWidth(width + gap);
    };
    const raf = requestAnimationFrame(measure);
    return () => cancelAnimationFrame(raf);
  }, [prevTitle, headerTitle]);

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
    <div className={`page-shell space-y-6 home-landing ${view.type === 'list' ? 'is-home' : ''}`}>
      {(view.type === 'list' || view.type === 'categoryGroup' || view.type === 'category') && (
        <header className="home-hero">
          <div className="home-hero__title-row">
            {(view.type === 'categoryGroup' || view.type === 'category') && (
              <button type="button" className="home-hero__back" onClick={goBack} aria-label="Tillbaka">
                <i className="fa-solid fa-arrow-left" aria-hidden="true" />
              </button>
            )}
            <div
              className={`home-hero__titles ${hasParent ? 'has-parent' : ''}`}
              style={{ '--home-parent-width': `${parentWidth}px` } as CSSProperties}
            >
              {prevTitle && (
                <span className="home-hero__parent" aria-hidden="true" ref={parentRef}>
                  {prevTitle}
                </span>
              )}
              <h1 className="home-hero__title">{headerTitle}</h1>
            </div>
          </div>
          <div className="home-hero__nav">
            <div className="home-hero__links">
              <div className="home-hero__search">
                <SearchBar
                  id={searchInputId}
                  value={searchQuery}
                  onChange={setSearchQuery}
                  placeholder="sök..."
                  inputClassName="home-hero__search-input"
                />
              </div>
            </div>
            <a href="#/new" className="home-hero__cta">
              + nytt recept
            </a>
          </div>
        </header>
      )}
      {view.type === 'list' && (
        <div className="category-search-row">
          <div className="category-group-row">
            {categoryGroups.map((group) => (
              <a key={group.key} className={`category-group-card category-group-card--${group.accent}`} href={group.href}>
                <div className="category-group-card__label">{group.label}</div>
                <div className="category-group-card__cta" aria-hidden="true">
                  →
                </div>
              </a>
            ))}
            <button
              type="button"
              className="category-group-card category-group-card--search home-search-card"
              onClick={() => {
                const el = document.getElementById(searchInputId) as HTMLInputElement | null;
                if (el) {
                  el.focus();
                  el.select?.();
                }
              }}
            >
              <div className="category-group-card__label">Sök</div>
              <div className="category-group-card__cta">
                Skriv för att filtrera <span aria-hidden="true">→</span>
              </div>
            </button>
          </div>
        </div>
      )}
      {view.type === 'categories' && <RecipesShell showCategories />}
      {view.type === 'categoryGroup' && <RecipesShell categoryGroup={view.group} showSearchBar={false} />}
      {view.type === 'category' && <RecipesShell categorySlug={view.slug} showSearchBar={false} />}
      {view.type === 'list' && (
        <RecipesShell searchQuery={searchQuery} onSearchChange={setSearchQuery} showSearchBar={false} />
      )}
    </div>
  );
}
