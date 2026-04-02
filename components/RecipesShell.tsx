'use client';

import { useLiveRecipes } from '@/lib/useLiveRecipes';
import { type Recipe } from '@/schema/recipeSchema';
import { RecipesView } from './RecipesView';

interface Props {
  recipes?: Recipe[];
  initialRecipes?: Recipe[];
  categorySlug?: string | null;
  showCategories?: boolean;
  categoryGroup?: 'place' | 'base';
  collection?: 'default' | 'sweetness';
  showCategoryChips?: boolean;
  searchQuery?: string;
  onSearchChange?: (value: string) => void;
  showSearchBar?: boolean;
}

export function RecipesShell({ recipes, initialRecipes = [], ...props }: Props = {}) {
  const subscribedRecipes = useLiveRecipes(initialRecipes, { enabled: !recipes });
  const liveRecipes = recipes ?? subscribedRecipes;

  return <RecipesView recipes={liveRecipes} {...props} />;
}
