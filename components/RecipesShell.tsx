'use client';

import { useMemo, useState } from 'react';
import { matchQuery } from '@/lib/recipes';
import type { Recipe } from '@/schema/recipeSchema';
import { RecipeCard } from './RecipeCard';
import { SearchBar } from './SearchBar';
import { TagFilter } from './TagFilter';

interface Props {
  recipes: Recipe[];
}

export function RecipesShell({ recipes }: Props) {
  const [query, setQuery] = useState('');
  const [activeTags, setActiveTags] = useState<string[]>([]);

  const tags = useMemo(() => recipes.flatMap((recipe) => recipe.tags), [recipes]);
  const filtered = useMemo(
    () => recipes.filter((recipe) => matchQuery(recipe, query, activeTags)),
    [recipes, query, activeTags],
  );

  return (
    <div className="space-y-4">
      <div className="filters">
        <SearchBar value={query} onChange={setQuery} />
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
