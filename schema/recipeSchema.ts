import { z } from 'zod';
import { DRINK_CATEGORY_NAME, inferRecipeKind, RECIPE_KIND_VALUES, SWEETNESS_CATEGORY_NAME } from '../lib/recipeKind.ts';

export const recipeSchema = z.object({
  title: z.string().min(1, 'Title is required'),
  titleSegments: z.array(z.object({
    text: z.string().min(1, 'Titelsegment får inte vara tomt'),
    size: z.enum(['big', 'small']),
  })).optional().default([]),
  slug: z.string().regex(/^[a-z0-9-]+$/, 'Use kebab-case for slug'),
  slugHistory: z.array(z.string().regex(/^[a-z0-9-]+$/, 'Use kebab-case for slug')).optional().default([]),
  description: z.string().min(1, 'Description is required'),
  prepTimeMinutes: z.number().int().nonnegative(),
  cookTimeMinutes: z.number().int().nonnegative(),
  servings: z.number().int().positive(),
  imageUrl: z.string().url().or(z.string().startsWith('/')).optional(),
  recipeKind: z.enum(RECIPE_KIND_VALUES).optional(),
  isDrink: z.boolean().optional().default(false),
  categoryPlace: z.string().trim().min(1, 'Platskategori krävs'),
  categoryBase: z.string().trim().min(1, 'Basvarukategori krävs'),
  categories: z.array(z.string()).default([]),
  titlePrefix: z.string().optional(),
  titleSuffix: z.string().optional(),
  ingredients: z.array(z.object({
    label: z.string(),
    amount: z.string().optional(),
    notes: z.string().optional(),
    kind: z.enum(['ingredient', 'heading']).optional().default('ingredient'),
  })).min(1, 'At least one ingredient'),
  ingredientGroups: z.array(z.object({
    title: z.string().optional(),
    items: z.array(z.object({
      label: z.string(),
      amount: z.string().optional(),
      notes: z.string().optional(),
      kind: z.enum(['ingredient', 'heading']).optional().default('ingredient'),
    })).min(1, 'Group must include ingredients'),
  })).optional(),
  steps: z.array(z.object({
    title: z.string().optional(),
    body: z.string().min(1, 'Step text required'),
  })).min(1, 'At least one step'),
  source: z.string().url().optional(),
  createdAt: z.string().datetime().optional(),
  updatedAt: z.string().datetime().optional(),
}).transform((data) => {
  const recipeKind = inferRecipeKind(data);
  const derivedCategories = Array.from(
    new Set(
      [
        data.categoryPlace,
        data.categoryBase,
        ...(recipeKind === 'drink' ? [DRINK_CATEGORY_NAME] : []),
        ...(recipeKind === 'sweetness' ? [SWEETNESS_CATEGORY_NAME] : []),
        ...data.categories,
      ]
        .map((c) => c?.trim())
        .filter((c): c is string => Boolean(c && c.length > 0)),
    ),
  );

  const hasSegments = (data.titleSegments ?? []).length > 0;
  const segments = hasSegments
    ? data.titleSegments
    : [
        ...(data.titlePrefix ? [{ text: data.titlePrefix, size: 'small' as const }] : []),
        { text: data.title, size: 'big' as const },
        ...(data.titleSuffix ? [{ text: data.titleSuffix, size: 'small' as const }] : []),
      ];

  const capFirst = (text?: string) => {
    if (!text) return text;
    return text.charAt(0).toUpperCase() + text.slice(1);
  };

  const normalizedIngredients = (data.ingredients ?? []).map((ing) => ({
    ...ing,
    label: capFirst(ing.label) ?? '',
  }));

  const normalizedGroups = data.ingredientGroups?.map((group) => ({
    ...group,
    title: capFirst(group.title ?? '') ?? '',
    items: (group.items ?? []).map((item) => ({
      ...item,
      label: capFirst(item.label) ?? '',
    })),
  }));

  const normalizedSlugHistory = Array.from(
    new Set(
      (data.slugHistory ?? [])
        .map((slug) => slug?.trim())
        .filter((slug): slug is string => Boolean(slug && slug.length > 0 && slug !== data.slug)),
    ),
  );

  return {
    ...data,
    recipeKind,
    titleSegments: segments,
    slugHistory: normalizedSlugHistory,
    isDrink: recipeKind === 'drink',
    categories: derivedCategories,
    ingredients: normalizedIngredients,
    ingredientGroups: normalizedGroups,
  };
});

export type Recipe = z.infer<typeof recipeSchema>;
