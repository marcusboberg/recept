'use client';

import { useRef, useState, type ChangeEvent, type ReactNode } from 'react';
import { Button, Group, Paper, SegmentedControl, Stack, Text, TextInput, Title } from '@mantine/core';
import { StudioCategoryField } from '@/components/StudioCategoryField';
import { getBaseCategoryIconClass } from '@/lib/categoryIcons';
import { uploadRecipeImage } from '@/lib/clientImageUpload';
import { inferRecipeKind, type RecipeKind } from '@/lib/recipeKind';
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
  const recipeKind = inferRecipeKind(formRecipe);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [uploadStatus, setUploadStatus] = useState<{ tone: 'dimmed' | 'green' | 'red'; message: string } | null>(null);
  const [uploading, setUploading] = useState(false);

  const handleImageUpload = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.currentTarget.files?.[0];
    event.currentTarget.value = '';

    if (!file) {
      return;
    }

    setUploading(true);
    setUploadStatus({ tone: 'dimmed', message: 'Bearbetar bilden…' });

    try {
      const uploaded = await uploadRecipeImage(file, formRecipe.slug);
      updateRecipe((prev) => ({ ...prev, imageUrl: uploaded.url }));
      const kilobytes = Math.max(1, Math.round(uploaded.size / 1024));
      setUploadStatus({
        tone: 'green',
        message: `Uppladdad som WebP (${uploaded.width}x${uploaded.height}, ${kilobytes} kB).`,
      });
    } catch (error) {
      setUploadStatus({
        tone: 'red',
        message: (error as Error).message || 'Kunde inte ladda upp bilden.',
      });
    } finally {
      setUploading(false);
    }
  };

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
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              hidden
              onChange={handleImageUpload}
            />
            <Group gap="sm" align="center">
              <Button
                type="button"
                variant="light"
                color="studioBlue"
                radius="xl"
                loading={uploading}
                onClick={() => fileInputRef.current?.click()}
              >
                {uploading ? 'Laddar upp…' : 'Ladda upp bild'}
              </Button>
              {uploadStatus ? (
                <Text size="sm" c={uploadStatus.tone}>
                  {uploadStatus.message}
                </Text>
              ) : (
                <Text size="sm" c="dimmed">
                  Konverteras till WebP, max 800 px.
                </Text>
              )}
            </Group>
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
                getOptionIconClass={getBaseCategoryIconClass}
                onChange={(value) => updateRecipe((prev) => ({ ...prev, categoryBase: value }))}
              />
              <div className="editor-meta-toggle-field">
                <Text size="sm" fw={600} c="dimmed">
                  Typ
                </Text>
                <SegmentedControl
                  aria-label="Välj mat, dryck eller sötma"
                  value={recipeKind}
                  onChange={(value) =>
                    updateRecipe((prev) => {
                      const nextRecipeKind = value as RecipeKind;
                      return {
                        ...prev,
                        recipeKind: nextRecipeKind,
                        isDrink: nextRecipeKind === 'drink',
                      };
                    })
                  }
                  data={[
                    { label: 'Mat', value: 'mat' },
                    { label: 'Dryck', value: 'drink' },
                    { label: 'Sötma', value: 'sweetness' },
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
