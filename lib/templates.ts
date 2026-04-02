import { recipeSchema, type Recipe } from '@/schema/recipeSchema';

export const emptyRecipe: Recipe = recipeSchema.parse({
  title: 'New recipe title',
  titlePrefix: '',
  titleSuffix: '',
  slug: 'new-recipe-slug',
  description: 'Describe the dish in one or two sentences.',
  categoryPlace: 'Sverige',
  categoryBase: 'Kyckling',
  categories: ['Sverige', 'Kyckling'],
  isDrink: false,
  prepTimeMinutes: 10,
  cookTimeMinutes: 15,
  servings: 2,
  imageUrl: '/images/recipes/new-recipe.jpg',
  ingredients: [
    { label: 'Olive oil', amount: '2 tbsp' },
    { label: 'Garlic cloves', amount: '3', notes: 'thinly sliced' },
  ],
  steps: [
    { body: 'Prepare your mise en place and bring a pot of salted water to a boil.' },
    { body: 'Cook pasta until al dente. In a pan, warm olive oil and garlic until fragrant.' },
    { body: 'Toss pasta with oil, salt, and pepper. Finish with herbs.' },
  ],
  source: 'https://example.com',
  createdAt: new Date().toISOString(),
});
