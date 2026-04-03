'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { startTransition, useEffect, useMemo, useRef, useState, type CSSProperties, type MouseEvent } from 'react';
import { usePublicSite } from '@/components/public/PublicSiteContext';
import { RecipesView } from '@/components/RecipesView';
import { SearchBar } from '@/components/SearchBar';
import { derivePublicCategoriesArray, recipeInSweetnessCollection, SWEETNESS_CATEGORY_NAME, toCategorySlug } from '@/lib/categories';
import { shouldApplyRecipesRefresh } from '@/lib/publicRecipeRefresh';
import {
  getCategoriesPath,
  getCategoryGroupPath,
  getCategoryPath,
  getHomePath,
  getPublicPathForView,
  getStudioNewHash,
  getStudioNewHref,
  getSweetnessPath,
  parsePublicViewFromPath,
  type PublicView,
} from '@/lib/routes';
import { type Recipe } from '@/schema/recipeSchema';

interface Props {
  recipes: Recipe[];
  view: PublicView;
  embedded?: boolean;
}

export function PublicRecipesView({ recipes, view, embedded = false }: Props) {
  const router = useRouter();
  const pathname = usePathname();
  const { completePublicNavigation, rememberPublicView, seedRecipes } = usePublicSite();
  const [liveRecipes, setLiveRecipes] = useState(recipes);
  const [currentView, setCurrentView] = useState(view);
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
    setCurrentView(view);
  }, [view]);

  useEffect(() => {
    if (embedded) {
      return;
    }

    const parsed = parsePublicViewFromPath(pathname);
    if (!parsed) {
      return;
    }

    setCurrentView((prev) => {
      if (
        prev.type === parsed.type &&
        ('slug' in prev ? prev.slug : null) === ('slug' in parsed ? parsed.slug : null) &&
        ('group' in prev ? prev.group : null) === ('group' in parsed ? parsed.group : null)
      ) {
        return prev;
      }

      return parsed;
    });
  }, [embedded, pathname]);

  useEffect(() => {
    seedRecipes(liveRecipes);
  }, [liveRecipes, seedRecipes]);

  useEffect(() => {
    if (embedded || currentView.type === 'recipe') {
      return;
    }

    rememberPublicView(currentView);
    completePublicNavigation(currentView);
  }, [completePublicNavigation, currentView, embedded, rememberPublicView]);

  const navigatePublic = (nextView: PublicView) => {
    const nextPath = getPublicPathForView(nextView);

    startTransition(() => {
      setCurrentView(nextView);
      setSearchQuery('');
    });

    if (typeof window !== 'undefined') {
      window.history.pushState(null, '', nextPath);
    } else {
      router.push(nextPath);
    }
  };

  const openStudioNew = (event: MouseEvent<HTMLElement>) => {
    if (event.defaultPrevented || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) {
      return;
    }

    event.preventDefault();

    if (typeof window === 'undefined') {
      router.push(getStudioNewHref());
      return;
    }

    if (window.location.pathname === getHomePath()) {
      window.location.hash = getStudioNewHash();
      return;
    }

    window.location.assign(getStudioNewHref());
  };

  const handlePublicLink = (event: MouseEvent<HTMLElement>, nextView: PublicView) => {
    if (event.defaultPrevented || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) {
      return;
    }

    event.preventDefault();
    navigatePublic(nextView);
  };

  useEffect(() => {
    if (embedded) {
      return;
    }

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
  }, [embedded, liveRecipes]);

  const categoryGroups = [
    { key: 'place' as const, label: 'Region', href: getCategoryGroupPath('place'), accent: 'place' },
    { key: 'base' as const, label: 'Basvara', href: getCategoryGroupPath('base'), accent: 'base' },
    { key: 'sweetness' as const, label: 'Sötma', href: getSweetnessPath(), accent: 'type' },
  ];

  useEffect(() => {
    if (currentView.type !== 'list') {
      return;
    }

    router.prefetch(getCategoryGroupPath('place'));
    router.prefetch(getCategoryGroupPath('base'));
    router.prefetch(getSweetnessPath());
    router.prefetch(getCategoryPath('drinkar'));
  }, [currentView.type, router]);

  const { categoryParentLabel, categoryParentPath } = useMemo(() => {
    if (currentView.type !== 'category') {
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

    if (place.has(currentView.slug)) {
      return { categoryParentLabel: 'Alla Regioner', categoryParentPath: getCategoryGroupPath('place') };
    }

    if (base.has(currentView.slug)) {
      return { categoryParentLabel: 'Alla Basvaror', categoryParentPath: getCategoryGroupPath('base') };
    }

    return { categoryParentLabel: 'Alla Recept', categoryParentPath: getHomePath() };
  }, [currentView, liveRecipes]);

  const categoryDisplayName = useMemo(() => {
    if (currentView.type !== 'category') return null;

    for (const recipe of liveRecipes.filter((item) => !recipeInSweetnessCollection(item))) {
      for (const name of derivePublicCategoriesArray(recipe)) {
        if (toCategorySlug(name) === currentView.slug) {
          return name;
        }
      }
    }

    return null;
  }, [currentView, liveRecipes]);

  const headerTitle = (() => {
    if (currentView.type === 'categories') {
      return 'Kategorier';
    }
    if (currentView.type === 'categoryGroup') {
      return currentView.group === 'place' ? 'Alla Regioner' : 'Alla Basvaror';
    }
    if (currentView.type === 'sweetness') {
      return SWEETNESS_CATEGORY_NAME;
    }
    if (currentView.type === 'category') {
      return categoryDisplayName ?? formatTitle(currentView.slug);
    }
    return 'Alla Recept';
  })();

  const prevTitle = (() => {
    if (currentView.type === 'categories') return 'Alla Recept';
    if (currentView.type === 'categoryGroup' || currentView.type === 'sweetness') return 'Alla Recept';
    if (currentView.type === 'category') return categoryParentLabel;
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

    const isHome = currentView.type === 'list';
    shell.classList.toggle(homeClass, isHome);
    document.body.classList.toggle(homeClass, isHome);

    return () => {
      shell.classList.remove(homeClass);
      document.body.classList.remove(homeClass);
    };
  }, [currentView.type]);

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
    if (currentView.type === 'category') {
      navigatePublic(parsePublicViewFromPath(categoryParentPath) ?? { type: 'list' });
      return;
    }

    if (currentView.type === 'categoryGroup') {
      navigatePublic({ type: 'list' });
      return;
    }

    if (currentView.type === 'sweetness') {
      navigatePublic({ type: 'list' });
      return;
    }

    navigatePublic({ type: 'list' });
  };

  return (
    <div className={`page-shell space-y-6 home-landing ${currentView.type === 'list' ? 'is-home' : ''}`}>
      {(currentView.type === 'list' || currentView.type === 'categories' || currentView.type === 'categoryGroup' || currentView.type === 'category' || currentView.type === 'sweetness') && (
        <header className="home-hero">
          <div className="home-hero__title-row">
            {(currentView.type === 'categories' || currentView.type === 'categoryGroup' || currentView.type === 'category' || currentView.type === 'sweetness') && (
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
            <Link href={getStudioNewHref()} className="home-hero__cta" onClick={openStudioNew}>
              + nytt recept
            </Link>
          </div>
        </header>
      )}

      {currentView.type === 'list' && (
        <div className="category-search-row">
          <div className="category-group-row">
            {categoryGroups.map((group) => (
              <Link
                key={group.key}
                className={`category-group-card category-group-card--${group.accent}`}
                href={group.href}
                onClick={(event) =>
                  handlePublicLink(
                    event,
                    group.key === 'sweetness' ? { type: 'sweetness' } : { type: 'categoryGroup', group: group.key },
                  )
                }
              >
                <div className="category-group-card__label">{group.label}</div>
                <div className="category-group-card__cta" aria-hidden="true">
                  →
                </div>
              </Link>
            ))}
            <Link
              className="category-group-card category-group-card--drink"
              href={getCategoryPath('drinkar')}
              onClick={(event) => handlePublicLink(event, { type: 'category', slug: 'drinkar' })}
            >
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

      {currentView.type === 'categories' && (
        <RecipesView recipes={liveRecipes} showCategories onNavigateToCategory={(slug) => navigatePublic({ type: 'category', slug })} />
      )}
      {currentView.type === 'categoryGroup' && (
        <RecipesView
          recipes={liveRecipes}
          categoryGroup={currentView.group}
          searchQuery={searchQuery}
          onSearchChange={setSearchQuery}
          showSearchBar={false}
          onNavigateToCategory={(slug) => navigatePublic({ type: 'category', slug })}
        />
      )}
      {currentView.type === 'category' && (
        <RecipesView
          recipes={liveRecipes}
          categorySlug={currentView.slug}
          searchQuery={searchQuery}
          onSearchChange={setSearchQuery}
          showSearchBar={false}
          onNavigateToCategory={(slug) => navigatePublic({ type: 'category', slug })}
          onNavigateHome={() => navigatePublic({ type: 'list' })}
        />
      )}
      {currentView.type === 'sweetness' && (
        <RecipesView
          recipes={liveRecipes}
          collection="sweetness"
          searchQuery={searchQuery}
          onSearchChange={setSearchQuery}
          showSearchBar={false}
          onNavigateToCategory={(slug) => navigatePublic({ type: 'category', slug })}
          onNavigateHome={() => navigatePublic({ type: 'list' })}
        />
      )}
      {currentView.type === 'list' && (
        <RecipesView recipes={liveRecipes} searchQuery={searchQuery} onSearchChange={setSearchQuery} showSearchBar={false} />
      )}
    </div>
  );
}
