import { recipeSchema, type Recipe } from '../schema/recipeSchema.ts';
import { deriveCategoriesArray } from './categories.ts';

export type ImportCategoriesInput = {
  categoryPlace: string;
  categoryBase: string;
  isDrink?: boolean;
};

function normalizeImportCategories(input: ImportCategoriesInput) {
  return {
    categoryPlace: input.categoryPlace.trim(),
    categoryBase: input.categoryBase.trim(),
    isDrink: input.isDrink === true,
  };
}

export function assertImportCategories(input: ImportCategoriesInput) {
  const normalized = normalizeImportCategories(input);

  if (!normalized.categoryPlace || !normalized.categoryBase) {
    throw new Error('Fyll i plats och basvara före import.');
  }

  return normalized;
}

export function finalizeImportedRecipe(recipe: Recipe, categories: ImportCategoriesInput) {
  const normalized = assertImportCategories(categories);
  const existingDerived = new Set(deriveCategoriesArray(recipe));
  const extraCategories = (recipe.categories ?? []).filter((entry) => !existingDerived.has(entry));

  return recipeSchema.parse({
    ...recipe,
    categoryPlace: normalized.categoryPlace,
    categoryBase: normalized.categoryBase,
    isDrink: normalized.isDrink,
    categories: extraCategories,
  });
}
