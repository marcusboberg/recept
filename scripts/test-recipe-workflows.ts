import assert from 'node:assert/strict';
import { getBaseCategoryIconClass } from '../lib/categoryIcons.ts';
import { buildCategoryOptions } from '../lib/categoryOptions.ts';
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
    'quick edit payload strips undefined nested fields before save',
    () => {
      const liveRecipe = createRecipe({
        slug: 'live-slug',
      });
      const draftRecipe = createRecipe({
        ingredientGroups: [
          {
            title: 'Drink',
            items: [
              {
                label: 'Gin',
                amount: '2 cl',
                notes: undefined,
                kind: 'ingredient',
              },
              {
                label: 'Citron',
                amount: undefined,
                kind: 'ingredient',
              },
            ],
          },
        ],
        ingredients: [
          {
            label: 'Gin',
            amount: '2 cl',
            notes: undefined,
            kind: 'ingredient',
          },
        ],
        steps: [{ title: undefined, body: 'Skaka med is.' }],
      });

      const payload = buildQuickEditPayload({
        draftRecipe,
        liveRecipe,
        now: '2026-04-01T20:00:00.000Z',
      });

      assert.deepEqual(payload.ingredientGroups, [
        {
          title: 'Drink',
          items: [
            { label: 'Gin', amount: '2 cl', kind: 'ingredient' },
            { label: 'Citron', kind: 'ingredient' },
          ],
        },
      ]);
      assert.deepEqual(payload.ingredients, [{ label: 'Gin', amount: '2 cl', kind: 'ingredient' }]);
      assert.deepEqual(payload.steps, [{ body: 'Skaka med is.' }]);
    },
  ],
  [
    'import finalization supports sweetness as its own recipe kind',
    () => {
      const recipe = createRecipe();

      const payload = finalizeImportedRecipe(recipe, {
        categoryPlace: 'Frankrike',
        categoryBase: 'Choklad',
        recipeKind: 'sweetness',
      });

      assert.equal(payload.categoryPlace, 'Frankrike');
      assert.equal(payload.categoryBase, 'Choklad');
      assert.equal(payload.recipeKind, 'sweetness');
      assert.equal(payload.isDrink, false);
      assert.deepEqual(payload.categories, ['Frankrike', 'Choklad', 'Sötma']);
    },
  ],
  [
    'import finalization derives Drinkar from recipe kind without categoryType',
    () => {
      const recipe = createRecipe({
        isDrink: true,
        categories: [],
      });

      const payload = finalizeImportedRecipe(recipe, {
        categoryPlace: 'Internationellt',
        categoryBase: 'Sprit',
        recipeKind: 'drink',
      });

      assert.equal(payload.recipeKind, 'drink');
      assert.equal(payload.isDrink, true);
      assert.deepEqual(payload.categories, ['Internationellt', 'Sprit', 'Drinkar']);
    },
  ],
  [
    'legacy recipe kind is inferred from previous sweetness modeling',
    () => {
      const normalized = recipeSchema.parse(
        normalizeLegacyRecipeForRead({
          ...createRecipe({
            categoryBase: 'Sötma',
            categories: ['Sverige', 'Sötma', 'Bakverk'],
          }),
        }),
      );

      assert.equal(normalized.recipeKind, 'sweetness');
      assert.equal(normalized.isDrink, false);
      assert.deepEqual(normalized.categories, ['Sverige', 'Sötma', 'Bakverk']);
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
  [
    'category options hide synthetic base categories from suggestions',
    () => {
      const options = buildCategoryOptions([
        createRecipe({ categoryBase: 'Potatis' }),
        createRecipe({ categoryBase: 'Sötma', recipeKind: 'sweetness' }),
        createRecipe({ categoryBase: 'Sprit', recipeKind: 'drink', isDrink: true }),
      ]);

      assert.deepEqual(options.base, ['Potatis']);
    },
  ],
  [
    'base category icons resolve from known names and fall back safely',
    () => {
      assert.equal(getBaseCategoryIconClass('Kött'), 'fa-solid fa-steak');
      assert.equal(getBaseCategoryIconClass('Kallskuret'), 'fa-solid fa-sandwich');
      assert.equal(getBaseCategoryIconClass('Kyckling'), 'fa-solid fa-turkey');
      assert.equal(getBaseCategoryIconClass('Köttfärs'), 'fa-solid fa-bowl-rice');
      assert.equal(getBaseCategoryIconClass('Vegetariskt'), 'fa-solid fa-carrot');
      assert.equal(getBaseCategoryIconClass('Umami'), 'fa-solid fa-mushroom');
      assert.equal(getBaseCategoryIconClass('Okänd basvara'), 'fa-solid fa-utensils');
    },
  ],
];

for (const [name, run] of cases) {
  run();
  console.log(`ok - ${name}`);
}

console.log(`recipe workflow checks passed (${cases.length})`);
