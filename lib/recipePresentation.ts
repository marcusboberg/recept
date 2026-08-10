import { DEFAULT_RECIPE_IMAGE } from './images.ts';
import type { Recipe } from '../schema/recipeSchema.ts';

export interface IngredientGroup {
  title?: string;
  items: Recipe['ingredients'];
}

export interface TitleSegment {
  text: string;
  size: 'big' | 'small';
}

export function cloneRecipe(recipe: Recipe): Recipe {
  return JSON.parse(JSON.stringify(recipe)) as Recipe;
}

export function toIngredientGroups(recipe: Recipe): IngredientGroup[] {
  if (recipe.ingredientGroups?.length) {
    return recipe.ingredientGroups;
  }
  return [
    {
      title: 'Ingredienser',
      items: recipe.ingredients,
    },
  ];
}

export function getEditableIngredientGroups(recipe: Recipe): IngredientGroup[] {
  return toIngredientGroups(recipe).map((group) => ({
    title: group.title ?? '',
    items: group.items.map((item) => ({ ...item })),
  }));
}

export function applyEditableIngredientGroups(recipe: Recipe, groups: IngredientGroup[]): Recipe {
  const nextGroups =
    groups.length > 0 ? groups : [{ title: 'Ingredienser', items: [{ label: '', kind: 'ingredient' as const }] }];
  const normalizedGroups = nextGroups.map((group) => ({
    title: group.title ?? '',
    items:
      group.items.length > 0
        ? group.items.map((item) => ({
            label: item.label,
            ...(item.amount !== undefined ? { amount: item.amount } : {}),
            ...(item.notes !== undefined ? { notes: item.notes } : {}),
            kind: item.kind ?? 'ingredient',
          }))
        : [{ label: '', kind: 'ingredient' as const }],
  }));
  const firstItems = normalizedGroups[0]?.items ?? [{ label: '', kind: 'ingredient' as const }];
  const keepGroups =
    normalizedGroups.length > 1 ||
    normalizedGroups.some((group) => Boolean(group.title && group.title.trim() && group.title.trim() !== 'Ingredienser'));

  return {
    ...recipe,
    ingredients: firstItems,
    ingredientGroups: keepGroups ? normalizedGroups : undefined,
  };
}

export function getIngredientKey(groupIndex: number, item: Recipe['ingredients'][number], itemIndex: number) {
  return `${groupIndex}-${item.label}-${itemIndex}`;
}

export function getTitleSegments(recipe: Recipe): TitleSegment[] {
  if (recipe.titleSegments && recipe.titleSegments.length > 0) {
    return recipe.titleSegments;
  }
  return [
    ...(recipe.titlePrefix ? [{ text: recipe.titlePrefix, size: 'small' as const }] : []),
    { text: recipe.title, size: 'big' as const },
    ...(recipe.titleSuffix ? [{ text: recipe.titleSuffix, size: 'small' as const }] : []),
  ];
}

export function getEditableTitleSegments(recipe: Recipe): TitleSegment[] {
  const segments = getTitleSegments(recipe).map((segment) => ({ ...segment }));
  if (segments.length === 0) {
    return [{ text: recipe.title, size: 'big' as const }];
  }
  return segments;
}

export function applyEditableRecipeTitle(recipe: Recipe, title: string): Recipe {
  const titleSegments = getEditableTitleSegments(recipe);
  const primaryTitleIndex = titleSegments.findIndex((segment) => segment.size === 'big');

  if (primaryTitleIndex === -1) {
    return {
      ...recipe,
      title,
      titleSegments: [{ text: title, size: 'big' }],
    };
  }

  return {
    ...recipe,
    title,
    titleSegments: titleSegments.map((segment, index) =>
      index === primaryTitleIndex ? { ...segment, text: title } : segment,
    ),
  };
}

export function applyEditableTitleSegment(recipe: Recipe, segmentIndex: number, text: string): Recipe {
  const titleSegments = getEditableTitleSegments(recipe);
  const segment = titleSegments[segmentIndex];

  if (!segment) {
    return recipe;
  }

  return {
    ...recipe,
    ...(segment.size === 'big' ? { title: text } : {}),
    titleSegments: titleSegments.map((entry, index) =>
      index === segmentIndex ? { ...entry, text } : entry,
    ),
  };
}

interface IngredientPosition {
  groupIndex: number;
  itemIndex: number;
}

export function moveIngredientBetweenGroups(
  groups: IngredientGroup[],
  source: IngredientPosition,
  target: IngredientPosition,
): IngredientGroup[] {
  const sourceGroup = groups[source.groupIndex];
  const targetGroup = groups[target.groupIndex];
  const ingredient = sourceGroup?.items[source.itemIndex];

  if (!sourceGroup || !targetGroup || !ingredient) {
    return groups;
  }

  if (source.groupIndex === target.groupIndex && source.itemIndex === target.itemIndex) {
    return groups;
  }

  const nextGroups = groups.map((group) => ({
    ...group,
    items: group.items.map((item) => ({ ...item })),
  }));
  const [movedIngredient] = nextGroups[source.groupIndex].items.splice(source.itemIndex, 1);
  const insertionIndex = Math.max(0, Math.min(target.itemIndex, nextGroups[target.groupIndex].items.length));
  nextGroups[target.groupIndex].items.splice(insertionIndex, 0, movedIngredient);

  return nextGroups;
}

export function getRecipeHeroImage(recipe: Recipe): string {
  return recipe.imageUrl?.trim() ? recipe.imageUrl : DEFAULT_RECIPE_IMAGE;
}

export function getRecipeStepLabel(step: Recipe['steps'][number], index: number): string {
  const customTitle = step.title?.trim();
  return customTitle && customTitle.length > 0 ? customTitle : `Steg ${index + 1}`;
}
