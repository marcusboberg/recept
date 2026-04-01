const LEGACY_DRINK_DEFAULTS = {
  categoryPlace: 'Internationellt',
  categoryBase: 'Sprit',
  categoryType: 'Cocktail',
} as const;

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function cleanCategoryList(value: unknown): string[] {
  if (!Array.isArray(value)) return [];

  return value
    .map((entry) => (typeof entry === 'string' ? entry.trim() : ''))
    .filter(Boolean)
    .filter((entry) => !['D', 'Dr', 'Dri', 'Drin', 'Drink'].includes(entry));
}

export function normalizeLegacyRecipeForRead(input: unknown): unknown {
  if (!isRecord(input)) return input;

  const categoryPlace = typeof input.categoryPlace === 'string' ? input.categoryPlace.trim() : '';
  const categoryBase = typeof input.categoryBase === 'string' ? input.categoryBase.trim() : '';
  const categoryType = typeof input.categoryType === 'string' ? input.categoryType.trim() : '';
  const isDrink = input.isDrink === true;

  if (!isDrink) {
    return {
      ...input,
      categories: cleanCategoryList(input.categories),
    };
  }

  const nextPlace = categoryPlace || LEGACY_DRINK_DEFAULTS.categoryPlace;
  const nextBase = categoryBase || LEGACY_DRINK_DEFAULTS.categoryBase;
  const nextType = categoryType || LEGACY_DRINK_DEFAULTS.categoryType;

  return {
    ...input,
    categoryPlace: nextPlace,
    categoryBase: nextBase,
    categoryType: nextType,
    categories: Array.from(
      new Set(['Drinkar', nextPlace, nextBase, nextType, ...cleanCategoryList(input.categories)]),
    ),
  };
}
