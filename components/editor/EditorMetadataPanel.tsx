'use client';

import type { ReactNode } from 'react';
import { Paper, SegmentedControl, Stack, Text, TextInput, Title } from '@mantine/core';
import { StudioCategoryField } from '@/components/StudioCategoryField';
import type { Recipe } from '@/schema/recipeSchema';
import { editorSegmentedClassNames } from './types';

interface Props {
  categoryOptions: {
    place: string[];
    base: string[];
  };
  formRecipe: Recipe;
  titleComposer: ReactNode;
  updateRecipe: (updater: (prev: Recipe) => Recipe) => void;
}

export function EditorMetadataPanel({ categoryOptions, formRecipe, titleComposer, updateRecipe }: Props) {
  return (
    <Paper className="workspace-card stack" withBorder radius="xl" p="xl" shadow="sm">
      <Stack gap="lg">
        <div>
          <Title order={3}>Grunddata &amp; kategorier</Title>
        </div>
        <div className="editor-meta">
          {titleComposer}
          <Stack gap="sm" className="editor-meta-section">
            <div className="editor-meta-section__header">
              <Text size="sm" c="dimmed" className="editor-meta-section__eyebrow">
                Media
              </Text>
              <Text size="sm" c="dimmed" className="editor-meta-section__hint">
                Ange bild för receptkortet och förhandsvisningen.
              </Text>
            </div>
            <TextInput
              label="Bild-URL"
              type="url"
              placeholder="https://example.com/bild.jpg"
              value={formRecipe.imageUrl ?? ''}
              onChange={(event) => updateRecipe((prev) => ({ ...prev, imageUrl: event.currentTarget.value }))}
              radius="md"
            />
          </Stack>
          <Stack gap="sm" className="editor-meta-section">
            <div className="editor-meta-section__header">
              <Text size="sm" c="dimmed" className="editor-meta-section__eyebrow">
                Kategorisering
              </Text>
              <Text size="sm" c="dimmed" className="editor-meta-section__hint">
                Hjälper till med filtrering, sökbarhet och rätt placering i receptlistorna.
              </Text>
            </div>
            <div className="three-col">
              <StudioCategoryField
                label="Plats"
                value={formRecipe.categoryPlace ?? ''}
                options={categoryOptions.place}
                onChange={(value) => updateRecipe((prev) => ({ ...prev, categoryPlace: value }))}
              />
              <StudioCategoryField
                label="Basvara"
                value={formRecipe.categoryBase ?? ''}
                options={categoryOptions.base}
                onChange={(value) => updateRecipe((prev) => ({ ...prev, categoryBase: value }))}
              />
              <div className="editor-meta-toggle-field">
                <Text size="sm" fw={600} c="dimmed">
                  Recept
                </Text>
                <SegmentedControl
                  aria-label="Välj mat eller dryck"
                  value={formRecipe.isDrink ? 'drink' : 'mat'}
                  onChange={(value) =>
                    updateRecipe((prev) => {
                      const nextIsDrink = value === 'drink';
                      return {
                        ...prev,
                        isDrink: nextIsDrink,
                      };
                    })
                  }
                  data={[
                    { label: 'Mat', value: 'mat' },
                    { label: 'Drink', value: 'drink' },
                  ]}
                  radius="xl"
                  color="studioBlue"
                  classNames={editorSegmentedClassNames}
                  fullWidth
                />
              </div>
            </div>
          </Stack>
        </div>
      </Stack>
    </Paper>
  );
}
