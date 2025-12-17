import { recipeSchema, type Recipe } from '@/schema/recipeSchema';
import { deriveCategoriesArray, toCategorySlug } from './categories';

export function parseRecipe(jsonString: string): { recipe?: Recipe; errors?: string[] } {
  try {
    const parsed = JSON.parse(jsonString);
    const result = recipeSchema.safeParse(parsed);
    if (!result.success) {
      return {
        errors: result.error.errors.map((issue) => `${issue.path.join('.')}: ${issue.message}`),
      };
    }
    return { recipe: normalizeCategories(result.data) };
  } catch (error) {
    return { errors: ['Invalid JSON: ' + (error as Error).message] };
  }
}

export function recipeToJson(recipe: Recipe): string {
  return JSON.stringify(normalizeCategories(recipe), null, 2);
}

export function summarizeRecipe(recipe: Recipe): string {
  const totalTime = recipe.prepTimeMinutes + recipe.cookTimeMinutes;
  return `${recipe.servings} servings • ${totalTime} mins total`;
}

export function matchQuery(recipe: Recipe, query: string, activeTags: string[], categorySlug?: string): boolean {
  const search = query.toLowerCase();
  const categorySlugs = (recipe.categories ?? []).map(toCategorySlug);
  const matchesText = [
    recipe.title,
    recipe.description,
    recipe.tags.join(' '),
    (recipe.categories ?? []).join(' '),
  ].some((value) => value.toLowerCase().includes(search));
  const matchesTags = activeTags.length === 0 || activeTags.every((tag) => recipe.tags.includes(tag));
  const matchesCategory = !categorySlug || categorySlugs.includes(categorySlug);
  return matchesText && matchesTags && matchesCategory;
}

function normalizeCategories(recipe: Recipe): Recipe {
  const categories = deriveCategoriesArray(recipe);
  return {
    ...recipe,
    categories,
  };
}
