export const DRINK_CATEGORY_NAME = 'Drinkar';
export const LEGACY_DRINK_BASE_NAME = 'Sprit';
export const SWEETNESS_CATEGORY_NAME = 'Sötma';

export const RECIPE_KIND_VALUES = ['mat', 'drink', 'sweetness'] as const;

export type RecipeKind = (typeof RECIPE_KIND_VALUES)[number];

const SYNTHETIC_BASE_CATEGORY_NAMES = [LEGACY_DRINK_BASE_NAME, SWEETNESS_CATEGORY_NAME];

function normalizeCategoryName(value: string) {
  return value.trim().toLowerCase();
}

function toCategoryList(value: unknown): string[] {
  if (!Array.isArray(value)) {
    return [];
  }

  return value.filter((entry): entry is string => typeof entry === 'string');
}

export function inferRecipeKind(input: {
  recipeKind?: unknown;
  isDrink?: unknown;
  categoryBase?: unknown;
  categories?: unknown;
}): RecipeKind {
  if (typeof input.recipeKind === 'string' && RECIPE_KIND_VALUES.includes(input.recipeKind as RecipeKind)) {
    return input.recipeKind as RecipeKind;
  }

  if (input.isDrink === true) {
    return 'drink';
  }

  const normalizedBase = typeof input.categoryBase === 'string' ? normalizeCategoryName(input.categoryBase) : '';
  const normalizedCategories = toCategoryList(input.categories).map(normalizeCategoryName);

  if (
    normalizedBase === normalizeCategoryName(LEGACY_DRINK_BASE_NAME) ||
    normalizedCategories.includes(normalizeCategoryName(DRINK_CATEGORY_NAME))
  ) {
    return 'drink';
  }

  if (
    normalizedBase === normalizeCategoryName(SWEETNESS_CATEGORY_NAME) ||
    normalizedCategories.includes(normalizeCategoryName(SWEETNESS_CATEGORY_NAME))
  ) {
    return 'sweetness';
  }

  return 'mat';
}

export function isSyntheticBaseCategory(value: string | null | undefined) {
  if (!value) {
    return false;
  }

  const normalized = normalizeCategoryName(value);
  return SYNTHETIC_BASE_CATEGORY_NAMES.some((entry) => normalizeCategoryName(entry) === normalized);
}

export function isVisibleBaseCategory(value: string | null | undefined) {
  return Boolean(value?.trim()) && !isSyntheticBaseCategory(value);
}
