export type IngredientRow = { label: string; amount?: string; kind: 'ingredient' | 'heading' };
export type IngredientGroup = { title?: string; items: IngredientRow[] };
export type FlatIngredientRow = {
  id: string;
  label: string;
  amount?: string;
  kind: 'ingredient' | 'heading';
  isPlaceholder?: boolean;
};

export const editorSegmentedClassNames = {
  root: 'studio-segmented-root',
  indicator: 'studio-segmented-indicator',
  label: 'studio-segmented-label',
  innerLabel: 'studio-segmented-inner-label',
} as const;
