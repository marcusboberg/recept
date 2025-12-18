'use client';

import { useMemo, useState } from 'react';
import { matchQuery } from '@/lib/recipes';
import { DEFAULT_RECIPE_IMAGE } from '@/lib/images';
import { buildCategories, recipeInCategory, toCategorySlug } from '@/lib/categories';
import { useLiveRecipes } from '@/lib/useLiveRecipes';
import { type Recipe } from '@/schema/recipeSchema';
import { RecipeCard } from './RecipeCard';
import { SearchBar } from './SearchBar';
import { CategoryCard } from './CategoryCard';

interface Props {
  initialRecipes?: Recipe[];
  categorySlug?: string | null;
  showCategories?: boolean;
  categoryGroup?: 'place' | 'base' | 'type';
  showCategoryChips?: boolean;
}

export function RecipesShell({
  initialRecipes = [],
  categorySlug = null,
  showCategories = false,
  categoryGroup = undefined,
  showCategoryChips = false,
}: Props = {}) {
  const liveRecipes = useLiveRecipes(initialRecipes);
  const [searchQuery, setSearchQuery] = useState('');

  const categories = useMemo(() => buildCategories(liveRecipes, DEFAULT_RECIPE_IMAGE), [liveRecipes]);
  const activeCategory = categorySlug ? categories.find((c) => c.slug === categorySlug) : null;
  const categoryFiltered = categorySlug ? liveRecipes.filter((recipe) => recipeInCategory(recipe, categorySlug)) : liveRecipes;

  const filtered = useMemo(
    () => categoryFiltered.filter((recipe) => matchQuery(recipe, searchQuery, [], categorySlug ?? undefined)),
    [categoryFiltered, searchQuery, categorySlug],
  );

  const groupByField = useMemo(() => {
    const makeGroup = (field: 'categoryPlace' | 'categoryBase' | 'categoryType') => {
      const map = new Map<string, { name: string; slug: string; image: string; count: number }>();
      liveRecipes.forEach((recipe) => {
        const value = recipe[field];
        if (!value) return;
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
      type: makeGroup('categoryType'),
    };
  }, [liveRecipes]);

  if (showCategories) {
    return (
      <div className="space-y-4">
        <div className="recipe-grid">
          {categories.map((category) => (
            <CategoryCard key={category.slug} category={category} />
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
    const label =
      categoryGroup === 'place' ? 'Geografi' : categoryGroup === 'base' ? 'Basvara' : 'Tillagning';
    return (
      <div className="space-y-4">
        <div className="category-chips category-chips--nav">
          <a className="chip-button chip-button--ghost" href="#/recipes">
            Alla recept
          </a>
          <a className={categoryGroup === 'place' ? 'chip-button is-active' : 'chip-button'} href="#/categories/place">
            Geografi
          </a>
          <a className={categoryGroup === 'base' ? 'chip-button is-active' : 'chip-button'} href="#/categories/base">
            Basvara
          </a>
          <a className={categoryGroup === 'type' ? 'chip-button is-active' : 'chip-button'} href="#/categories/type">
            Tillagning
          </a>
        </div>
        <div className="filters">
          <SearchBar value={searchQuery} onChange={setSearchQuery} />
        </div>
        <div className="category-grid">
          {items.map((category) => (
            <CategoryCard key={category.slug} category={category} />
          ))}
          {items.length === 0 && <p className="text-muted">Inga kategorier hittades för {label.toLowerCase()}.</p>}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {activeCategory && (
        <div className="filters">
          <div className="pill ghost">Kategori: {activeCategory.name} ({activeCategory.count})</div>
          <a className="button-ghost" href="#/">
            <i className="fa-solid fa-arrow-left" aria-hidden="true" /> Alla kategorier
          </a>
        </div>
      )}
      <div className="filters">
        <SearchBar value={searchQuery} onChange={setSearchQuery} />
      </div>
      {!categorySlug && showCategoryChips && categories.length > 0 && (
        <div className="category-chips">
          <a className="chip-button chip-button--ghost" href="#/recipes">
            Alla
          </a>
          {categories.map((category) => (
            <a key={category.slug} className="chip-button" href={`#/category/${category.slug}`}>
              {category.name}
            </a>
          ))}
        </div>
      )}
      <div className="recipe-grid">
        {filtered.map((recipe) => (
          <RecipeCard key={recipe.slug} recipe={recipe} />
        ))}
        {filtered.length === 0 && <p className="text-muted">No recipes match your filters.</p>}
      </div>
    </div>
  );
}
