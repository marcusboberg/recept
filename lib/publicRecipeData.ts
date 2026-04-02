import { normalizeLegacyRecipeForRead } from './legacyRecipes.ts';
import { recipeSchema, type Recipe } from '../schema/recipeSchema.ts';

export interface PublicRecipeParseResult {
  recipe: Recipe | null;
  issues: string[];
}

export function parsePublicRecipeData(input: unknown): PublicRecipeParseResult {
  const parsed = recipeSchema.safeParse(normalizeLegacyRecipeForRead(input));

  if (parsed.success) {
    return {
      recipe: parsed.data,
      issues: [],
    };
  }

  return {
    recipe: null,
    issues: parsed.error.issues.map((issue) => {
      const issuePath = issue.path.join('.') || '(root)';
      return `${issuePath}: ${issue.message}`;
    }),
  };
}

export function sortPublicRecipes(recipes: Recipe[]) {
  return [...recipes].sort((a, b) => a.title.localeCompare(b.title, 'sv'));
}

export function resolvePublicRecipeFromCollection(recipes: Recipe[], slug: string) {
  const direct = recipes.find((recipe) => recipe.slug === slug);
  if (direct) {
    return { recipe: direct, canonicalSlug: direct.slug };
  }

  const resolved = recipes.find((recipe) => (recipe.slugHistory ?? []).includes(slug));
  if (resolved) {
    return { recipe: resolved, canonicalSlug: resolved.slug };
  }

  return { recipe: null, canonicalSlug: null };
}
