import type { Recipe } from '@/schema/recipeSchema';

export interface CategoryInfo {
  name: string;
  slug: string;
  image: string;
  count: number;
}

export function toCategorySlug(name: string): string {
  return name.trim().toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');
}

export function buildCategories(recipes: Recipe[], fallbackImage: string): CategoryInfo[] {
  const map = new Map<string, CategoryInfo>();

  recipes.forEach((recipe) => {
    (recipe.categories ?? []).forEach((name) => {
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
  return (recipe.categories ?? []).some((name) => toCategorySlug(name) === slug);
}
