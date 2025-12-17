import { z } from 'zod';

export const recipeSchema = z.object({
  title: z.string().min(1, 'Title is required'),
  slug: z.string().regex(/^[a-z0-9-]+$/, 'Use kebab-case for slug'),
  description: z.string().min(1, 'Description is required'),
  tags: z.array(z.string()).default([]),
  prepTimeMinutes: z.number().int().nonnegative(),
  cookTimeMinutes: z.number().int().nonnegative(),
  servings: z.number().int().positive(),
  imageUrl: z.string().url().or(z.string().startsWith('/')).optional(),
  categoryPlace: z.string().min(1, 'Platskategori krävs').catch(''),
  categoryBase: z.string().min(1, 'Basvarukategori krävs').catch(''),
  categoryType: z.string().min(1, 'Typkategori krävs').catch(''),
  categories: z.array(z.string()).default([]),
  titlePrefix: z.string().optional(),
  titleSuffix: z.string().optional(),
  ingredients: z.array(z.object({
    label: z.string(),
    amount: z.string().optional(),
    notes: z.string().optional(),
  })).min(1, 'At least one ingredient'),
  ingredientGroups: z.array(z.object({
    title: z.string().optional(),
    items: z.array(z.object({
      label: z.string(),
      amount: z.string().optional(),
      notes: z.string().optional(),
    })).min(1, 'Group must include ingredients'),
  })).optional(),
  steps: z.array(z.object({
    title: z.string().optional(),
    body: z.string().min(1, 'Step text required'),
  })).min(1, 'At least one step'),
  source: z.string().url().optional(),
  createdAt: z.string().datetime().optional(),
  updatedAt: z.string().datetime().optional(),
}).transform((data) => ({
  ...data,
  categories: Array.from(
    new Set(
      [data.categoryPlace, data.categoryBase, data.categoryType, ...data.categories]
        .map((c) => c?.trim())
        .filter((c): c is string => Boolean(c && c.length > 0)),
    ),
  ),
}));

export type Recipe = z.infer<typeof recipeSchema>;
