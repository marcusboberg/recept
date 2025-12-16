'use client';

import { useMemo, useState } from 'react';
import { matchQuery } from '@/lib/recipes';
import { DEFAULT_RECIPE_IMAGE } from '@/lib/images';
import { buildCategories, recipeInCategory } from '@/lib/categories';
import { useLiveRecipes } from '@/lib/useLiveRecipes';
import { type Recipe } from '@/schema/recipeSchema';
import { RecipeCard } from './RecipeCard';
import { SearchBar } from './SearchBar';
import { TagFilter } from './TagFilter';
import { CategoryCard } from './CategoryCard';

interface Props {
  initialRecipes?: Recipe[];
  categorySlug?: string | null;
  showCategories?: boolean;
}

export function RecipesShell({ initialRecipes = [], categorySlug = null, showCategories = false }: Props = {}) {
  const liveRecipes = useLiveRecipes(initialRecipes);
  const [searchQuery, setSearchQuery] = useState('');
  const [activeTags, setActiveTags] = useState<string[]>([]);

  const categories = useMemo(() => buildCategories(liveRecipes, DEFAULT_RECIPE_IMAGE), [liveRecipes]);
  const activeCategory = categorySlug ? categories.find((c) => c.slug === categorySlug) : null;
  const categoryFiltered = categorySlug ? liveRecipes.filter((recipe) => recipeInCategory(recipe, categorySlug)) : liveRecipes;

  const tags = useMemo(() => categoryFiltered.flatMap((recipe) => recipe.tags), [categoryFiltered]);
  const filtered = useMemo(
    () => categoryFiltered.filter((recipe) => matchQuery(recipe, searchQuery, activeTags, categorySlug ?? undefined)),
    [categoryFiltered, searchQuery, activeTags, categorySlug],
  );

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

  return (
    <div className="space-y-4">
      {activeCategory && (
        <div className="filters">
          <div className="pill ghost">Kategori: {activeCategory.name} ({activeCategory.count})</div>
          <a className="button-ghost" href="#/">
            ← Alla kategorier
          </a>
        </div>
      )}
      <div className="filters">
        <SearchBar value={searchQuery} onChange={setSearchQuery} />
        <TagFilter
          tags={tags}
          active={activeTags}
          onToggle={(tag) =>
            setActiveTags((current) => (current.includes(tag) ? current.filter((t) => t !== tag) : [...current, tag]))
          }
        />
      </div>
      <div className="recipe-grid">
        {filtered.map((recipe) => (
          <RecipeCard key={recipe.slug} recipe={recipe} />
        ))}
        {filtered.length === 0 && <p className="text-muted">No recipes match your filters.</p>}
      </div>
    </div>
  );
}
