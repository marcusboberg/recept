import type { Recipe } from '@/schema/recipeSchema';

export const SWEETNESS_CATEGORY_NAME = 'Sötma';

export interface CategoryInfo {
  name: string;
  slug: string;
  image: string;
  count: number;
}

export function deriveCategoriesArray(input: {
  categories?: string[];
  categoryPlace?: string;
  categoryBase?: string;
  imageUrl?: string;
  isDrink?: boolean;
}): string[] {
  const items = [
    input.categoryPlace,
    input.categoryBase,
    ...(input.isDrink ? ['Drinkar'] : []),
    ...(input.categories ?? []),
  ]
    .map((c) => c?.trim())
    .filter((c): c is string => Boolean(c && c.length > 0));
  return Array.from(new Set(items));
}

export function derivePublicCategoriesArray(input: {
  categories?: string[];
  categoryPlace?: string;
  categoryBase?: string;
  isDrink?: boolean;
}): string[] {
  const items = [
    input.categoryPlace,
    input.categoryBase,
    ...(input.isDrink ? ['Drinkar'] : []),
    ...(input.categories ?? []),
  ]
    .map((c) => c?.trim())
    .filter((c): c is string => Boolean(c && c.length > 0));

  return Array.from(new Set(items));
}

export function toCategorySlug(name: string): string {
  return name.trim().toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');
}

export function recipeInSweetnessCollection(recipe: Recipe): boolean {
  if (recipe.isDrink) {
    return false;
  }

  const sweetnessSlug = toCategorySlug(SWEETNESS_CATEGORY_NAME);

  return deriveCategoriesArray(recipe).some((name) => toCategorySlug(name) === sweetnessSlug);
}

export function buildCategories(recipes: Recipe[], fallbackImage: string): CategoryInfo[] {
  const map = new Map<string, CategoryInfo>();

  recipes.forEach((recipe) => {
    const derived = deriveCategoriesArray(recipe);
    derived.forEach((name) => {
      const slug = toCategorySlug(name);
      if (!slug) return;
      const existing = map.get(slug);
      if (existing) {
        existing.count += 1;
        if (!existing.image && recipe.imageUrl) {
          existing.image = recipe.imageUrl;
        }
        return;
      }
      map.set(slug, {
        name,
        slug,
        image: recipe.imageUrl ?? fallbackImage,
        count: 1,
      });
    });
  });

  return Array.from(map.values()).sort((a, b) => a.name.localeCompare(b.name, 'sv'));
}

export function buildPublicCategories(recipes: Recipe[], fallbackImage: string): CategoryInfo[] {
  const map = new Map<string, CategoryInfo>();

  recipes.forEach((recipe) => {
    const derived = derivePublicCategoriesArray(recipe);
    derived.forEach((name) => {
      const slug = toCategorySlug(name);
      if (!slug) return;
      const existing = map.get(slug);
      if (existing) {
        existing.count += 1;
        if (!existing.image && recipe.imageUrl) {
          existing.image = recipe.imageUrl;
        }
        return;
      }
      map.set(slug, {
        name,
        slug,
        image: recipe.imageUrl ?? fallbackImage,
        count: 1,
      });
    });
  });

  return Array.from(map.values()).sort((a, b) => a.name.localeCompare(b.name, 'sv'));
}

export function recipeInCategory(recipe: Recipe, slug: string): boolean {
  return deriveCategoriesArray(recipe).some((name) => toCategorySlug(name) === slug);
}

export function recipeInPublicCategory(recipe: Recipe, slug: string): boolean {
  return derivePublicCategoriesArray(recipe).some((name) => toCategorySlug(name) === slug);
}
