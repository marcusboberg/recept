export type PublicCategoryGroup = 'place' | 'base';
export type PublicView =
  | { type: 'categories' }
  | { type: 'category'; slug: string }
  | { type: 'sweetness' }
  | { type: 'list' }
  | { type: 'categoryGroup'; group: PublicCategoryGroup }
  | { type: 'recipe'; slug: string };

const STUDIO_ROOT_PATH = '/';
export const STUDIO_MOBILE_QUICK_EDIT_INTENT_KEY = 'recipe-mobile-quick-edit-intent';
export const RECIPE_QUICK_EDIT_SEARCH_PARAM = 'quickEdit';

export function getHomePath() {
  return '/';
}

export function getCategoriesPath() {
  return '/kategorier';
}

export function getCategoryGroupPath(group: PublicCategoryGroup) {
  return `/kategorier/grupp/${group}`;
}

export function getCategoryPath(slug: string) {
  return `/kategorier/${slug}`;
}

export function getSweetnessPath() {
  return '/sotma';
}

export function getRecipePath(slug: string) {
  return `/recept/${slug}`;
}

export function getRecipeQuickEditPath(slug: string) {
  return `${getRecipePath(slug)}?${RECIPE_QUICK_EDIT_SEARCH_PARAM}=1`;
}

export function getStudioNewHash() {
  return '#/new';
}

export function getStudioEditHash(slug: string) {
  return `#/edit/${slug}`;
}

export function getStudioNewHref() {
  return `${STUDIO_ROOT_PATH}${getStudioNewHash()}`;
}

export function getStudioEditHref(slug: string) {
  return `${STUDIO_ROOT_PATH}${getStudioEditHash(slug)}`;
}

export function getPublicPathForView(view: PublicView) {
  switch (view.type) {
    case 'categories':
      return getCategoriesPath();
    case 'category':
      return getCategoryPath(view.slug);
    case 'recipe':
      return getRecipePath(view.slug);
    case 'sweetness':
      return getSweetnessPath();
    case 'categoryGroup':
      return getCategoryGroupPath(view.group);
    case 'list':
    default:
      return getHomePath();
  }
}

export function parsePublicViewFromPath(pathname: string): PublicView | null {
  const segments = pathname.split('/').filter(Boolean);

  if (segments.length === 0) {
    return { type: 'list' };
  }

  if (segments[0] === 'recept' && segments[1]) {
    return { type: 'recipe', slug: segments[1] };
  }

  if (segments[0] !== 'kategorier' && segments[0] !== 'sotma') {
    return null;
  }

  if (segments[0] === 'sotma') {
    return { type: 'sweetness' };
  }

  if (segments.length === 1) {
    return { type: 'categories' };
  }

  if (segments[1] === 'grupp' && (segments[2] === 'place' || segments[2] === 'base')) {
    return { type: 'categoryGroup', group: segments[2] };
  }

  if (segments[1]) {
    return { type: 'category', slug: segments[1] };
  }

  return null;
}

export function legacyHashToPublicPath(hash: string): string | null {
  const trimmed = hash.startsWith('#') ? hash.slice(1) : hash;
  const [segment, first, second] = trimmed.split('/').filter(Boolean);

  if (!segment || segment === 'recipes') {
    return getHomePath();
  }

  if (segment === 'categories') {
    if (first === 'place' || first === 'base') {
      return getCategoryGroupPath(first);
    }
    return getCategoriesPath();
  }

  if (segment === 'category' && first) {
    return getCategoryPath(first);
  }

  if (segment === 'sweetness') {
    return getSweetnessPath();
  }

  if (segment === 'recipe' && first) {
    return getRecipePath(first);
  }

  if (segment === 'edit' && first) {
    return getStudioEditHref(first);
  }

  if (segment === 'new') {
    return getStudioNewHref();
  }

  if (segment === 'categories' && second) {
    return getCategoryPath(second);
  }

  return null;
}

export function isStudioHashRoute(hash: string): boolean {
  return hash.startsWith(getStudioNewHash()) || hash.startsWith('#/edit/');
}
