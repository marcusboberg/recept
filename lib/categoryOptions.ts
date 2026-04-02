import type { Recipe } from '../schema/recipeSchema.ts';

export function buildCategoryOptions(recipes: Recipe[]) {
  const place = new Set<string>();
  const base = new Set<string>();

  recipes.forEach((recipe) => {
    const nextPlace = recipe.categoryPlace?.trim();
    const nextBase = recipe.categoryBase?.trim();

    if (nextPlace) place.add(nextPlace);
    if (nextBase) base.add(nextBase);
  });

  const sortFn = (a: string, b: string) => a.localeCompare(b, 'sv');

  return {
    place: Array.from(place).sort(sortFn),
    base: Array.from(base).sort(sortFn),
  };
}
