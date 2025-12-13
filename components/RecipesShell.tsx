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
      <div className="space-y-4 card">
        <SearchBar value={query} onChange={setQuery} />
        <div className="flex" style={{ alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
          <span className="text-sm text-muted">Tags</span>
          <TagFilter
            tags={tags}
            active={activeTags}
            onToggle={(tag) =>
              setActiveTags((current) =>
                current.includes(tag) ? current.filter((t) => t !== tag) : [...current, tag],
              )
            }
          />
        </div>
      </div>
      <div className="grid grid-3">
        {filtered.map((recipe) => (
          <RecipeCard key={recipe.slug} recipe={recipe} />
        ))}
        {filtered.length === 0 && <p className="text-muted">No recipes match your filters.</p>}
      </div>
    </div>
  );
}
