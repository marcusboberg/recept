import { recipeSchema, type Recipe } from '../schema/recipeSchema.ts';
import { deriveCategoriesArray } from './categories.ts';
import { getEditableTitleSegments } from './recipePresentation.ts';

export const NEW_RECIPE_SLUG = 'new-recipe-slug';

function stripUndefinedDeep<T>(value: T): T {
  if (Array.isArray(value)) {
    return value
      .filter((entry) => entry !== undefined)
      .map((entry) => stripUndefinedDeep(entry)) as T;
  }

  if (value && typeof value === 'object') {
    return Object.fromEntries(
      Object.entries(value)
        .filter(([, entry]) => entry !== undefined)
        .map(([key, entry]) => [key, stripUndefinedDeep(entry)]),
    ) as T;
  }

  return value;
}

export function toRecipeSlug(value: string): string {
  const transliterated = value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[åä]/gi, 'a')
    .replace(/ö/gi, 'o');

  return transliterated
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, '')
    .trim()
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-+|-+$/g, '');
}

function toLegacyAutoSlug(value: string): string {
  return value
    .replace(/\s+/g, ' ')
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, '')
    .trim()
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-+|-+$/g, '');
}

export function slugCandidatesFromTitle(title: string): Set<string> {
  const primary = toRecipeSlug(title);
  const legacy = toLegacyAutoSlug(title);
  const compact = [primary, legacy].map((value) => value.replace(/-/g, ''));
  return new Set([primary, legacy, ...compact].filter(Boolean));
}

export function isAutoLikeSlug(slug: string, title: string): boolean {
  if (!slug || !title) return false;
  return slugCandidatesFromTitle(title).has(slug);
}

type BuildEditorSavePayloadOptions = {
  formRecipe: Recipe;
  initialSlug: string | null;
  now?: string;
};

export function buildEditorSavePayload({
  formRecipe,
  initialSlug,
  now = new Date().toISOString(),
}: BuildEditorSavePayloadOptions) {
  const draftPayload: Recipe = {
    ...formRecipe,
    categories: deriveCategoriesArray(formRecipe),
    createdAt: formRecipe.createdAt ?? now,
    updatedAt: now,
  };

  if (draftPayload.slug === NEW_RECIPE_SLUG) {
    const fallbackSlug = toRecipeSlug(draftPayload.title);
    if (!fallbackSlug) {
      throw new Error('Kunde inte skapa slug från titel. Ange en giltig titel/slugg manuellt.');
    }
    draftPayload.slug = fallbackSlug;
  }

  const slugChanged = Boolean(initialSlug && initialSlug !== draftPayload.slug && initialSlug !== NEW_RECIPE_SLUG);

  if (slugChanged && initialSlug) {
    const nextHistory = new Set(draftPayload.slugHistory ?? []);
    nextHistory.add(initialSlug);
    nextHistory.delete(draftPayload.slug);
    nextHistory.delete(NEW_RECIPE_SLUG);
    draftPayload.slugHistory = Array.from(nextHistory);
  }

  const payload = stripUndefinedDeep(recipeSchema.parse(stripUndefinedDeep(draftPayload)));
  const isCreateLike = !initialSlug || initialSlug === NEW_RECIPE_SLUG;
  const shouldCheckCollision = isCreateLike || slugChanged;

  return {
    payload,
    slugChanged,
    shouldCheckCollision,
  };
}

type BuildQuickEditPayloadOptions = {
  draftRecipe: Recipe;
  liveRecipe: Recipe;
  now?: string;
};

export function buildQuickEditPayload({
  draftRecipe,
  liveRecipe,
  now = new Date().toISOString(),
}: BuildQuickEditPayloadOptions) {
  const editableTitleSegments = getEditableTitleSegments(draftRecipe).filter(
    (segment) => segment.size === 'big' || segment.text.trim().length > 0,
  );

  return stripUndefinedDeep(
    recipeSchema.parse(
      stripUndefinedDeep({
        ...draftRecipe,
        slug: liveRecipe.slug,
        slugHistory: liveRecipe.slugHistory ?? draftRecipe.slugHistory ?? [],
        titleSegments: editableTitleSegments,
        createdAt: draftRecipe.createdAt ?? liveRecipe.createdAt ?? now,
        updatedAt: now,
        categories: deriveCategoriesArray(draftRecipe),
      }),
    ),
  );
}
