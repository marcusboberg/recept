import { recipeSchema, type Recipe } from '@/schema/recipeSchema';

export function parseRecipe(jsonString: string): { recipe?: Recipe; errors?: string[] } {
  try {
    const parsed = JSON.parse(jsonString);
    const result = recipeSchema.safeParse(parsed);
    if (!result.success) {
      return {
        errors: result.error.errors.map((issue) => `${issue.path.join('.')}: ${issue.message}`),
      };
    }
    return { recipe: result.data };
  } catch (error) {
    return { errors: ['Invalid JSON: ' + (error as Error).message] };
  }
}

export function recipeToJson(recipe: Recipe): string {
  return JSON.stringify(recipe, null, 2);
}

export function summarizeRecipe(recipe: Recipe): string {
  const totalTime = recipe.prepTimeMinutes + recipe.cookTimeMinutes;
  return `${recipe.servings} servings • ${totalTime} mins total`;
}

export function matchQuery(recipe: Recipe, query: string, activeTags: string[]): boolean {
  const search = query.toLowerCase();
  const matchesText = [recipe.title, recipe.description, recipe.tags.join(' ')]
    .some((value) => value.toLowerCase().includes(search));
  const matchesTags = activeTags.length === 0 || activeTags.every((tag) => recipe.tags.includes(tag));
  return matchesText && matchesTags;
}
