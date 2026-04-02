'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { startTransition, useEffect, useMemo, useRef, useState, type CSSProperties } from 'react';
import { RecipesView } from '@/components/RecipesView';
import { SearchBar } from '@/components/SearchBar';
import { derivePublicCategoriesArray, recipeInSweetnessCollection, SWEETNESS_CATEGORY_NAME, toCategorySlug } from '@/lib/categories';
import { shouldApplyRecipesRefresh } from '@/lib/publicRecipeRefresh';
import {
  getCategoriesPath,
  getCategoryGroupPath,
  getCategoryPath,
  getHomePath,
  getStudioNewHref,
  getSweetnessPath,
} from '@/lib/routes';
import { type Recipe } from '@/schema/recipeSchema';

type PublicView =
  | { type: 'categories' }
  | { type: 'category'; slug: string }
  | { type: 'sweetness' }
  | { type: 'list' }
  | { type: 'categoryGroup'; group: 'place' | 'base' };

interface Props {
  recipes: Recipe[];
  view: PublicView;
}

export function PublicRecipesView({ recipes, view }: Props) {
  const router = useRouter();
  const [liveRecipes, setLiveRecipes] = useState(recipes);
  const [searchQuery, setSearchQuery] = useState('');
  const [parentWidth, setParentWidth] = useState(0);
  const parentRef = useRef<HTMLSpanElement | null>(null);
  const searchInputId = 'home-search-input';
  const formatTitle = (slug: string) =>
    slug
      .split('-')
      .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
      .join(' ');

  useEffect(() => {
    setLiveRecipes(recipes);
  }, [recipes]);

  useEffect(() => {
    let cancelled = false;
    const controller = new AbortController();
    const timeoutId = window.setTimeout(async () => {
      try {
        const response = await fetch('/api/public-recipes', {
          cache: 'no-store',
          signal: controller.signal,
        });
        if (!response.ok) {
          return;
        }

        const payload = (await response.json()) as { recipes?: unknown };
        const { recipeSchema } = await import('@/schema/recipeSchema');
        const parsed = recipeSchema.array().safeParse(payload.recipes);
        if (!parsed.success || cancelled) {
          return;
        }

        if (!shouldApplyRecipesRefresh(liveRecipes, parsed.data)) {
          return;
        }

        startTransition(() => {
          setLiveRecipes(parsed.data);
        });
      } catch (error) {
        if ((error as Error).name === 'AbortError') {
          return;
        }
      }
    }, 2000);

    return () => {
      cancelled = true;
      controller.abort();
      window.clearTimeout(timeoutId);
    };
  }, [liveRecipes]);

  const categoryGroups = [
    { key: 'place' as const, label: 'Region', href: getCategoryGroupPath('place'), accent: 'place' },
    { key: 'base' as const, label: 'Basvara', href: getCategoryGroupPath('base'), accent: 'base' },
    { key: 'sweetness' as const, label: 'Sötma', href: getSweetnessPath(), accent: 'type' },
  ];

  const { categoryParentLabel, categoryParentPath } = useMemo(() => {
    if (view.type !== 'category') {
      return {
        categoryParentLabel: null,
        categoryParentPath: getHomePath(),
      };
    }

    const place = new Set<string>();
    const base = new Set<string>();
    liveRecipes
      .filter((recipe) => !recipeInSweetnessCollection(recipe))
      .forEach((recipe) => {
        if (recipe.categoryPlace) place.add(toCategorySlug(recipe.categoryPlace));
        if (recipe.categoryBase) base.add(toCategorySlug(recipe.categoryBase));
      });

    if (place.has(view.slug)) {
      return { categoryParentLabel: 'Alla Regioner', categoryParentPath: getCategoryGroupPath('place') };
    }

    if (base.has(view.slug)) {
      return { categoryParentLabel: 'Alla Basvaror', categoryParentPath: getCategoryGroupPath('base') };
    }

    return { categoryParentLabel: 'Alla Recept', categoryParentPath: getHomePath() };
  }, [liveRecipes, view]);

  const categoryDisplayName = useMemo(() => {
    if (view.type !== 'category') return null;

    for (const recipe of liveRecipes.filter((item) => !recipeInSweetnessCollection(item))) {
      for (const name of derivePublicCategoriesArray(recipe)) {
        if (toCategorySlug(name) === view.slug) {
          return name;
        }
      }
    }

    return null;
  }, [liveRecipes, view]);

  const headerTitle = (() => {
    if (view.type === 'categoryGroup') {
      return view.group === 'place' ? 'Alla Regioner' : 'Alla Basvaror';
    }
    if (view.type === 'sweetness') {
      return SWEETNESS_CATEGORY_NAME;
    }
    if (view.type === 'category') {
      return categoryDisplayName ?? formatTitle(view.slug);
    }
    return 'Alla Recept';
  })();

  const prevTitle = (() => {
    if (view.type === 'categoryGroup' || view.type === 'sweetness') return 'Alla Recept';
    if (view.type === 'category') return categoryParentLabel;
    return null;
  })();
  const hasParent = Boolean(prevTitle);

  useEffect(() => {
    if (typeof document === 'undefined') {
      return;
    }
    const homeClass = 'is-home-view';
    const shell = document.querySelector('.app-shell');
    if (!shell) {
      return;
    }

    const isHome = view.type === 'list';
    shell.classList.toggle(homeClass, isHome);
    document.body.classList.toggle(homeClass, isHome);

    return () => {
      shell.classList.remove(homeClass);
      document.body.classList.remove(homeClass);
    };
  }, [view.type]);

  useEffect(() => {
    if (!prevTitle) {
      return;
    }
    const measure = () => {
      const width = parentRef.current?.getBoundingClientRect().width ?? 0;
      const gap = 12;
      setParentWidth(width + gap);
    };
    const raf = requestAnimationFrame(measure);
    return () => cancelAnimationFrame(raf);
  }, [prevTitle, headerTitle]);

  const goBack = () => {
    if (typeof window === 'undefined') return;
    if (window.history.length > 1) {
      window.history.back();
      return;
    }

    if (view.type === 'category') {
      router.push(categoryParentPath);
      return;
    }

    if (view.type === 'categoryGroup') {
      router.push(getCategoriesPath());
      return;
    }

    router.push(getHomePath());
  };

  return (
    <div className={`page-shell space-y-6 home-landing ${view.type === 'list' ? 'is-home' : ''}`}>
      {(view.type === 'list' || view.type === 'categoryGroup' || view.type === 'category' || view.type === 'sweetness') && (
        <header className="home-hero">
          <div className="home-hero__title-row">
            {(view.type === 'categoryGroup' || view.type === 'category' || view.type === 'sweetness') && (
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
            <Link href={getStudioNewHref()} className="home-hero__cta">
              + nytt recept
            </Link>
          </div>
        </header>
      )}

      {view.type === 'list' && (
        <div className="category-search-row">
          <div className="category-group-row">
            {categoryGroups.map((group) => (
              <Link key={group.key} className={`category-group-card category-group-card--${group.accent}`} href={group.href}>
                <div className="category-group-card__label">{group.label}</div>
                <div className="category-group-card__cta" aria-hidden="true">
                  →
                </div>
              </Link>
            ))}
            <Link className="category-group-card category-group-card--drink" href={getCategoryPath('drinkar')}>
              <div className="category-group-card__label">Drinkar</div>
              <div className="category-group-card__cta" aria-hidden="true">
                →
              </div>
            </Link>
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

      {view.type === 'categories' && <RecipesView recipes={liveRecipes} showCategories />}
      {view.type === 'categoryGroup' && (
        <RecipesView
          recipes={liveRecipes}
          categoryGroup={view.group}
          searchQuery={searchQuery}
          onSearchChange={setSearchQuery}
          showSearchBar={false}
        />
      )}
      {view.type === 'category' && (
        <RecipesView
          recipes={liveRecipes}
          categorySlug={view.slug}
          searchQuery={searchQuery}
          onSearchChange={setSearchQuery}
          showSearchBar={false}
        />
      )}
      {view.type === 'sweetness' && (
        <RecipesView
          recipes={liveRecipes}
          collection="sweetness"
          searchQuery={searchQuery}
          onSearchChange={setSearchQuery}
          showSearchBar={false}
        />
      )}
      {view.type === 'list' && (
        <RecipesView recipes={liveRecipes} searchQuery={searchQuery} onSearchChange={setSearchQuery} showSearchBar={false} />
      )}
    </div>
  );
}
