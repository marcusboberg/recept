'use client';

import Link from 'next/link';
import { useMemo, useState } from 'react';
import { matchQuery } from '@/lib/recipes';
import { DEFAULT_RECIPE_IMAGE } from '@/lib/images';
import { buildPublicCategories, recipeInPublicCategory, recipeInSweetnessCollection, toCategorySlug } from '@/lib/categories';
import { isVisibleBaseCategory } from '@/lib/recipeKind';
import { getCategoryPath, getHomePath } from '@/lib/routes';
import { type Recipe } from '@/schema/recipeSchema';
import { RecipeCard } from './RecipeCard';
import { SearchBar } from './SearchBar';
import { CategoryCard } from './CategoryCard';

interface Props {
  recipes: Recipe[];
  categorySlug?: string | null;
  showCategories?: boolean;
  categoryGroup?: 'place' | 'base';
  collection?: 'default' | 'sweetness';
  showCategoryChips?: boolean;
  searchQuery?: string;
  onSearchChange?: (value: string) => void;
  showSearchBar?: boolean;
  onNavigateToCategory?: (slug: string) => void;
  onNavigateHome?: () => void;
}

export function RecipesView({
  recipes,
  categorySlug = null,
  showCategories = false,
  categoryGroup = undefined,
  collection = 'default',
  showCategoryChips = false,
  searchQuery: searchQueryProp,
  onSearchChange,
  showSearchBar = true,
  onNavigateToCategory,
  onNavigateHome,
}: Props) {
  const isControlled = searchQueryProp !== undefined;
  const [internalSearch, setInternalSearch] = useState(searchQueryProp ?? '');
  const searchQuery = isControlled ? (searchQueryProp as string) : internalSearch;

  const collectionRecipes = useMemo(() => {
    if (collection === 'sweetness') {
      return recipes.filter((recipe) => recipeInSweetnessCollection(recipe));
    }

    return recipes.filter((recipe) => !recipeInSweetnessCollection(recipe));
  }, [collection, recipes]);

  const categories = useMemo(() => buildPublicCategories(collectionRecipes, DEFAULT_RECIPE_IMAGE), [collectionRecipes]);
  const categoryFiltered = useMemo(() => {
    if (categorySlug) {
      return collectionRecipes.filter((recipe) => recipeInPublicCategory(recipe, categorySlug));
    }

    if (collection === 'sweetness') {
      return collectionRecipes;
    }

    return collectionRecipes.filter((recipe) => !recipeInPublicCategory(recipe, 'drinkar'));
  }, [categorySlug, collection, collectionRecipes]);

  const handleSearchChange = (value: string) => {
    if (!isControlled) {
      setInternalSearch(value);
    }
    onSearchChange?.(value);
  };

  const filtered = useMemo(
    () => categoryFiltered.filter((recipe) => matchQuery(recipe, searchQuery, categorySlug ?? undefined)),
    [categoryFiltered, searchQuery, categorySlug],
  );

  const groupByField = useMemo(() => {
    const makeGroup = (field: 'categoryPlace' | 'categoryBase') => {
      const map = new Map<string, { name: string; slug: string; image: string; count: number }>();
      collectionRecipes.forEach((recipe) => {
        const value = recipe[field];
        if (!value) return;
        if (field === 'categoryBase' && !isVisibleBaseCategory(value)) return;
        const slug = toCategorySlug(value);
        if (!slug) return;
        const current = map.get(slug);
        if (current) {
          current.count += 1;
          if (!current.image && recipe.imageUrl) current.image = recipe.imageUrl;
        } else {
          map.set(slug, {
            name: value,
            slug,
            image: recipe.imageUrl ?? DEFAULT_RECIPE_IMAGE,
            count: 1,
          });
        }
      });
      return Array.from(map.values());
    };

    return {
      place: makeGroup('categoryPlace'),
      base: makeGroup('categoryBase'),
    };
  }, [collectionRecipes]);

  if (showCategories) {
    return (
      <div className="space-y-4">
        <div className="recipe-grid">
          {categories.map((category) => (
            <CategoryCard key={category.slug} category={category} onNavigate={onNavigateToCategory} />
          ))}
          {categories.length === 0 && <p className="text-muted">Inga kategorier hittades.</p>}
        </div>
      </div>
    );
  }

  if (categoryGroup) {
    const items = groupByField[categoryGroup].filter((item) =>
      item.name.toLowerCase().includes(searchQuery.toLowerCase()),
    );
    const label = categoryGroup === 'place' ? 'Region' : 'Basvara';
    return (
      <div className="space-y-4">
        {showSearchBar && (
          <div className="filters">
            <SearchBar value={searchQuery} onChange={handleSearchChange} />
          </div>
        )}
        <div className="category-grid">
          {items.map((category) => (
            <CategoryCard key={category.slug} category={category} onNavigate={onNavigateToCategory} />
          ))}
          {items.length === 0 && <p className="text-muted">Inga kategorier hittades för {label.toLowerCase()}.</p>}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {!categorySlug && showCategoryChips && categories.length > 0 && (
        <div className="category-chips">
          <Link
            className="chip-button chip-button--ghost"
            href={getHomePath()}
            onClick={(event) => {
              if (!onNavigateHome || event.defaultPrevented || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) {
                return;
              }

              event.preventDefault();
              onNavigateHome();
            }}
          >
            Alla
          </Link>
          {categories.map((category) => (
            <Link
              key={category.slug}
              className="chip-button"
              href={getCategoryPath(category.slug)}
              onClick={(event) => {
                if (!onNavigateToCategory || event.defaultPrevented || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) {
                  return;
                }

                event.preventDefault();
                onNavigateToCategory(category.slug);
              }}
            >
              {category.name}
            </Link>
          ))}
        </div>
      )}
      <div className={`recipe-grid${categorySlug && filtered.length < 4 ? ' recipe-grid--center' : ''}`}>
        {filtered.map((recipe) => (
          <RecipeCard key={recipe.slug} recipe={recipe} />
        ))}
        {filtered.length === 0 && <p className="text-muted">No recipes match your filters.</p>}
      </div>
    </div>
  );
}
