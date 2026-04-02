export type PublicCategoryGroup = 'place' | 'base';

const STUDIO_ROOT_PATH = '/';

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
