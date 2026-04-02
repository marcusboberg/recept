import type { Recipe } from '@/schema/recipeSchema';

export function getRecipeRefreshSignature(recipe: Pick<Recipe, 'slug' | 'updatedAt'>) {
  return `${recipe.slug}:${recipe.updatedAt ?? ''}`;
}

export function getRecipesRefreshSignature(recipes: Array<Pick<Recipe, 'slug' | 'updatedAt'>>) {
  return recipes.map(getRecipeRefreshSignature).join('|');
}

export function shouldApplyRecipeRefresh(current: Recipe | null | undefined, next: Recipe | null | undefined) {
  if (!current || !next) {
    return Boolean(next);
  }

  return getRecipeRefreshSignature(current) !== getRecipeRefreshSignature(next);
}

export function shouldApplyRecipesRefresh(current: Recipe[], next: Recipe[]) {
  if (current.length !== next.length) {
    return true;
  }

  return getRecipesRefreshSignature(current) !== getRecipesRefreshSignature(next);
}
