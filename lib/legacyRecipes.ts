const LEGACY_DRINK_DEFAULTS = {
  categoryPlace: 'Internationellt',
  categoryBase: 'Sprit',
} as const;

const EXTRA_CATEGORY_ALIASES: Record<string, string> = {
  bakverk: 'Bakverk',
  brunch: 'Brunch',
  bullar: 'Bakverk',
  efterratt: 'Efterrätt',
  fika: 'Fika',
  frukt: 'Frukt',
  fusion: 'Fusion',
  husmanskost: 'Husmanskost',
  konfekt: 'Konfekt',
  ost: 'Ost',
  saffran: 'Saffran',
  skaldjur: 'Skaldjur',
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function normalizeCategoryKey(input: string) {
  return input
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '');
}

function cleanCategoryList(value: unknown): string[] {
  if (!Array.isArray(value)) return [];

  const seen = new Set<string>();

  return value
    .map((entry) => (typeof entry === 'string' ? entry.trim() : ''))
    .filter(Boolean)
    .flatMap((entry) => {
      const key = normalizeCategoryKey(entry);
      if (!key) return [];

      const canonical = EXTRA_CATEGORY_ALIASES[key];
      if (!canonical || seen.has(canonical)) {
        return [];
      }

      seen.add(canonical);
      return [canonical];
    });
}

export function normalizeLegacyRecipeForRead(input: unknown): unknown {
  if (!isRecord(input)) return input;

  const categoryPlace = typeof input.categoryPlace === 'string' ? input.categoryPlace.trim() : '';
  const categoryBase = typeof input.categoryBase === 'string' ? input.categoryBase.trim() : '';
  const isDrink = input.isDrink === true;

  if (!isDrink) {
    const legacyType = typeof input.categoryType === 'string' ? input.categoryType.trim() : '';
    return {
      ...input,
      categories: cleanCategoryList(input.categories).filter((entry) => entry !== legacyType),
    };
  }

  const nextPlace = categoryPlace || LEGACY_DRINK_DEFAULTS.categoryPlace;
  const nextBase = categoryBase || LEGACY_DRINK_DEFAULTS.categoryBase;
  const legacyType = typeof input.categoryType === 'string' ? input.categoryType.trim() : '';

  return {
    ...input,
    categoryPlace: nextPlace,
    categoryBase: nextBase,
    categories: Array.from(
      new Set(['Drinkar', nextPlace, nextBase, ...cleanCategoryList(input.categories).filter((entry) => entry !== legacyType)]),
    ),
  };
}
