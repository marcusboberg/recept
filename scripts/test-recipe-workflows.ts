import assert from 'node:assert/strict';
import { finalizeImportedRecipe } from '../lib/importRecipes.ts';
import { normalizeLegacyRecipeForRead } from '../lib/legacyRecipes.ts';
import { buildEditorSavePayload, buildQuickEditPayload, NEW_RECIPE_SLUG } from '../lib/recipeWorkflows.ts';
import { recipeSchema } from '../schema/recipeSchema.ts';

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
    'editor save payload auto-generates slug and preserves timestamps',
    () => {
      const recipe = createRecipe({
        slug: NEW_RECIPE_SLUG,
        title: 'Söt blåbärspaj',
      });

      const { payload, slugChanged, shouldCheckCollision } = buildEditorSavePayload({
        formRecipe: recipe,
        initialSlug: NEW_RECIPE_SLUG,
        now: '2026-04-01T20:00:00.000Z',
      });

      assert.equal(payload.slug, 'sot-blabarspaj');
      assert.equal(payload.createdAt, '2026-04-01T20:00:00.000Z');
      assert.equal(payload.updatedAt, '2026-04-01T20:00:00.000Z');
      assert.equal(slugChanged, false);
      assert.equal(shouldCheckCollision, true);
    },
  ],
  [
    'editor save payload records previous slug in slugHistory on rename',
    () => {
      const recipe = createRecipe({
        slug: 'new-slug',
        title: 'New title',
        slugHistory: ['older-slug'],
      });

      const { payload, slugChanged } = buildEditorSavePayload({
        formRecipe: recipe,
        initialSlug: 'old-slug',
        now: '2026-04-01T20:00:00.000Z',
      });

      assert.equal(slugChanged, true);
      assert.deepEqual(payload.slugHistory, ['older-slug', 'old-slug']);
    },
  ],
  [
    'quick edit payload keeps live slug but refreshes editable title segments',
    () => {
      const liveRecipe = createRecipe({
        slug: 'live-slug',
      });
      const draftRecipe = createRecipe({
        slug: 'draft-slug',
        titleSegments: undefined,
        titlePrefix: 'Snabb',
        title: 'Pasta',
      });

      const payload = buildQuickEditPayload({
        draftRecipe,
        liveRecipe,
        now: '2026-04-01T20:00:00.000Z',
      });

      assert.equal(payload.slug, 'live-slug');
      assert.equal(payload.updatedAt, '2026-04-01T20:00:00.000Z');
      assert.deepEqual(payload.titleSegments, [
        { text: 'Snabb', size: 'small' },
        { text: 'Pasta', size: 'big' },
      ]);
    },
  ],
  [
    'import finalization enforces selected categories and schema validation',
    () => {
      const recipe = createRecipe();

      const payload = finalizeImportedRecipe(recipe, {
        categoryPlace: 'Frankrike',
        categoryBase: 'Sötma',
      });

      assert.equal(payload.categoryPlace, 'Frankrike');
      assert.equal(payload.categoryBase, 'Sötma');
      assert.equal(payload.isDrink, false);
      assert.deepEqual(payload.categories, ['Frankrike', 'Sötma']);
    },
  ],
  [
    'import finalization derives Drinkar from isDrink without categoryType',
    () => {
      const recipe = createRecipe({
        isDrink: true,
        categories: [],
      });

      const payload = finalizeImportedRecipe(recipe, {
        categoryPlace: 'Internationellt',
        categoryBase: 'Sprit',
        isDrink: true,
      });

      assert.equal(payload.isDrink, true);
      assert.deepEqual(payload.categories, ['Internationellt', 'Sprit', 'Drinkar']);
    },
  ],
  [
    'legacy category cleanup keeps only canonical extra categories without categoryType',
    () => {
      const normalized = recipeSchema.parse(
        normalizeLegacyRecipeForRead({
          ...createRecipe({
            categoryPlace: 'Nordisk',
            categoryBase: 'Sötma',
            categories: ['Nordis', 'Nordi', 'N', 'bakverk', 'fika', 'Frukt', 'Desssert'],
          }),
          categoryType: 'Dessert',
        }),
      );

      assert.deepEqual(normalized.categories, ['Nordisk', 'Sötma', 'Bakverk', 'Fika', 'Frukt']);
    },
  ],
];

for (const [name, run] of cases) {
  run();
  console.log(`ok - ${name}`);
}

console.log(`recipe workflow checks passed (${cases.length})`);
