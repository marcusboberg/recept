import assert from 'node:assert/strict';
import { shouldApplyRecipeRefresh, shouldApplyRecipesRefresh } from '../lib/publicRecipeRefresh.ts';
import { parsePublicRecipeData, resolvePublicRecipeFromCollection } from '../lib/publicRecipeData.ts';
import { recipeSchema } from '../schema/recipeSchema.ts';
import {
  applyEditableIngredientGroups,
  getEditableTitleSegments,
  getRecipeHeroImage,
  getRecipeStepLabel,
  getTitleSegments,
  toIngredientGroups,
} from '../lib/recipePresentation.ts';

const createRecipe = (overrides: Record<string, unknown> = {}) =>
  recipeSchema.parse({
    slug: 'test-recipe',
    title: 'Test Recipe',
    titlePrefix: '',
    titleSuffix: '',
    titleSegments: [{ text: 'Test Recipe', size: 'big' }],
    slugHistory: [],
    description: 'Description',
    imageUrl: 'https://example.com/recipe.jpg',
    servings: 2,
    prepTimeMinutes: 5,
    cookTimeMinutes: 10,
    ingredients: [{ label: 'Salt', amount: '1 tsk', kind: 'ingredient' }],
    steps: [{ title: '', body: 'Blanda allt.' }],
    categoryPlace: 'Sverige',
    categoryBase: 'Potatis',
    categories: ['Sverige', 'Potatis'],
    ...overrides,
  });

const cases: Array<[string, () => void]> = [
  [
    'toIngredientGroups falls back to ingredients',
    () => {
      const recipe = createRecipe({
        ingredientGroups: undefined,
        ingredients: [{ label: 'Mjöl', amount: '2 dl', kind: 'ingredient' }],
      });

      assert.deepEqual(toIngredientGroups(recipe), [
        {
          title: 'Ingredienser',
          items: [{ label: 'Mjöl', amount: '2 dl', kind: 'ingredient' }],
        },
      ]);
    },
  ],
  [
    'applyEditableIngredientGroups removes single default group',
    () => {
      const recipe = createRecipe();
      const next = applyEditableIngredientGroups(recipe, [
        {
          title: 'Ingredienser',
          items: [{ label: 'Smör', amount: '50 g', kind: 'ingredient' }],
        },
      ]);

      assert.equal(next.ingredientGroups, undefined);
      assert.deepEqual(next.ingredients, [{ label: 'Smör', amount: '50 g', kind: 'ingredient' }]);
    },
  ],
  [
    'applyEditableIngredientGroups preserves named groups',
    () => {
      const recipe = createRecipe();
      const next = applyEditableIngredientGroups(recipe, [
        {
          title: 'Deg',
          items: [{ label: 'Mjöl', amount: '2 dl', kind: 'ingredient' }],
        },
        {
          title: 'Topping',
          items: [{ label: 'Socker', amount: '1 msk', kind: 'ingredient' }],
        },
      ]);

      assert.equal(next.ingredientGroups?.length, 2);
      assert.equal(next.ingredientGroups?.[0]?.title, 'Deg');
      assert.equal(next.ingredients[0]?.label, 'Mjöl');
    },
  ],
  [
    'title helpers build fallback segments consistently',
    () => {
      const recipe = createRecipe({
        titleSegments: undefined,
        titlePrefix: 'Extra',
        title: 'Crispy',
        titleSuffix: 'Deluxe',
      });

      assert.deepEqual(getTitleSegments(recipe), [
        { text: 'Extra', size: 'small' },
        { text: 'Crispy', size: 'big' },
        { text: 'Deluxe', size: 'small' },
      ]);
      assert.deepEqual(getEditableTitleSegments(recipe), [
        { text: 'Extra', size: 'small' },
        { text: 'Crispy', size: 'big' },
        { text: 'Deluxe', size: 'small' },
      ]);
    },
  ],
  [
    'hero image and step label helpers provide fallbacks',
    () => {
      const recipe = {
        ...createRecipe({
          steps: [{ title: '', body: 'Servera kall.' }],
        }),
        imageUrl: '',
      };

      assert.match(getRecipeHeroImage(recipe), /^data:image\/svg\+xml/);
      assert.equal(getRecipeStepLabel(recipe.steps[0], 0), 'Steg 1');
    },
  ],
  [
    'refresh helpers only update when slug or updatedAt changes',
    () => {
      const current = createRecipe({
        slug: 'amaretto-sour',
        updatedAt: '2026-04-02T07:00:00.000Z',
      });
      const same = createRecipe({
        slug: 'amaretto-sour',
        updatedAt: '2026-04-02T07:00:00.000Z',
      });
      const next = createRecipe({
        slug: 'amaretto-sour',
        updatedAt: '2026-04-02T07:05:00.000Z',
      });

      assert.equal(shouldApplyRecipeRefresh(current, same), false);
      assert.equal(shouldApplyRecipeRefresh(current, next), true);
      assert.equal(shouldApplyRecipesRefresh([current], [same]), false);
      assert.equal(shouldApplyRecipesRefresh([current], [next]), true);
    },
  ],
  [
    'public recipe helpers parse legacy data and resolve slug history consistently',
    () => {
      const recipe = createRecipe({
        slug: 'canonical-recipe',
        slugHistory: ['old-recipe'],
        categories: ['Sverige', 'Potatis', 'Fusion'],
      });

      const parsed = parsePublicRecipeData({
        ...recipe,
        categories: ['Sverige', 'Potatis', 'Fusion', 'bakverk'],
      });

      assert.ok(parsed.recipe);
      assert.deepEqual(parsed.recipe?.categories, ['Sverige', 'Potatis', 'Fusion', 'Bakverk']);

      const resolved = resolvePublicRecipeFromCollection([parsed.recipe!], 'old-recipe');
      assert.equal(resolved.canonicalSlug, 'canonical-recipe');
      assert.equal(resolved.recipe?.slug, 'canonical-recipe');
    },
  ],
];

for (const [name, run] of cases) {
  run();
  console.log(`ok - ${name}`);
}

console.log(`recipe presentation checks passed (${cases.length})`);
