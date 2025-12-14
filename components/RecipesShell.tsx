'use client';

import { useEffect, useMemo, useState } from 'react';
import { collection, onSnapshot, orderBy, query } from 'firebase/firestore';
import { matchQuery } from '@/lib/recipes';
import { getFirestoreClient } from '@/lib/firebaseClient';
import { recipeSchema, type Recipe } from '@/schema/recipeSchema';
import { RecipeCard } from './RecipeCard';
import { SearchBar } from './SearchBar';
import { TagFilter } from './TagFilter';

interface Props {
  initialRecipes?: Recipe[];
}

export function RecipesShell({ initialRecipes = [] }: Props = {}) {
  const [liveRecipes, setLiveRecipes] = useState<Recipe[]>(initialRecipes);
  const [searchQuery, setSearchQuery] = useState('');
  const [activeTags, setActiveTags] = useState<string[]>([]);

  useEffect(() => {
    const db = getFirestoreClient();
    const recipesRef = collection(db, 'recipes');
    const recipesQuery = query(recipesRef, orderBy('title'));
    const unsubscribe = onSnapshot(recipesQuery, (snapshot) => {
      const next: Recipe[] = [];
      snapshot.forEach((docSnapshot) => {
        const parsed = recipeSchema.safeParse(docSnapshot.data());
        if (parsed.success) {
          next.push(parsed.data);
        }
      });
      setLiveRecipes(next);
    });
    return unsubscribe;
  }, []);

  const tags = useMemo(() => liveRecipes.flatMap((recipe) => recipe.tags), [liveRecipes]);
  const filtered = useMemo(
    () => liveRecipes.filter((recipe) => matchQuery(recipe, searchQuery, activeTags)),
    [liveRecipes, searchQuery, activeTags],
  );

  return (
    <div className="space-y-4">
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
