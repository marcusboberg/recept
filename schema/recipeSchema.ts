import { z } from 'zod';

export const recipeSchema = z.object({
  title: z.string().min(1, 'Title is required'),
  slug: z.string().regex(/^[a-z0-9-]+$/, 'Use kebab-case for slug'),
  description: z.string().min(1, 'Description is required'),
  tags: z.array(z.string()).default([]),
  prepTimeMinutes: z.number().int().nonnegative(),
  cookTimeMinutes: z.number().int().nonnegative(),
  servings: z.number().int().positive(),
  ingredients: z.array(z.object({
    label: z.string(),
    amount: z.string().optional(),
    notes: z.string().optional(),
  })).min(1, 'At least one ingredient'),
  steps: z.array(z.object({
    title: z.string().optional(),
    body: z.string().min(1, 'Step text required'),
  })).min(1, 'At least one step'),
  source: z.string().url().optional(),
  createdAt: z.string().datetime().optional(),
  updatedAt: z.string().datetime().optional(),
});

export type Recipe = z.infer<typeof recipeSchema>;
