'use client';

import { useRef, useState, type ChangeEvent, type ReactNode } from 'react';
import { Group, Paper, SegmentedControl, Stack, Text, TextInput, Title } from '@mantine/core';
import { StudioCategoryField } from '@/components/StudioCategoryField';
import { getBaseCategoryIconClass } from '@/lib/categoryIcons';
import { uploadRecipeImage, type RecipeImageUploadStep } from '@/lib/clientImageUpload';
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

type EditorImageUploadStep = RecipeImageUploadStep | 'updateField';
type UploadStepStatus = 'pending' | 'active' | 'complete' | 'error';

const UPLOAD_STEPS: { id: EditorImageUploadStep; label: string }[] = [
  { id: 'validate', label: 'Kontrollerar filen' },
  { id: 'decode', label: 'Öppnar bilden i webbläsaren' },
  { id: 'resize', label: 'Skalar ner bilden' },
  { id: 'convert', label: 'Konverterar till WebP' },
  { id: 'upload', label: 'Laddar upp till Firebase Storage' },
  { id: 'downloadUrl', label: 'Hämtar bildlänk' },
  { id: 'updateField', label: 'Uppdaterar Bild-URL' },
];

function initialUploadStepStatus(): Record<EditorImageUploadStep, UploadStepStatus> {
  return Object.fromEntries(UPLOAD_STEPS.map((step) => [step.id, 'pending'])) as Record<EditorImageUploadStep, UploadStepStatus>;
}

export function EditorMetadataPanel({ categoryOptions, formRecipe, titleComposer, updateRecipe }: Props) {
  const recipeKind = inferRecipeKind(formRecipe);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [uploadStatus, setUploadStatus] = useState<{ tone: 'dimmed' | 'green' | 'red'; message: string } | null>(null);
  const [uploadStepStatus, setUploadStepStatus] = useState<Record<EditorImageUploadStep, UploadStepStatus>>(initialUploadStepStatus);
  const [uploading, setUploading] = useState(false);

  const setActiveUploadStep = (stepId: EditorImageUploadStep) => {
    const activeIndex = UPLOAD_STEPS.findIndex((step) => step.id === stepId);
    setUploadStepStatus((prev) => {
      const next = { ...prev };
      UPLOAD_STEPS.forEach((step, index) => {
        if (prev[step.id] === 'error') return;
        if (index < activeIndex) {
          next[step.id] = 'complete';
        } else if (index === activeIndex) {
          next[step.id] = 'active';
        }
      });
      return next;
    });
  };

  const handleImageUpload = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.currentTarget.files?.[0];
    event.currentTarget.value = '';

    if (!file) {
      return;
    }

    setUploading(true);
    setUploadStepStatus(initialUploadStepStatus());
    setUploadStatus({ tone: 'dimmed', message: 'Startar bilduppladdning…' });

    try {
      const uploaded = await uploadRecipeImage(file, formRecipe.slug, {
        onProgress: ({ step }) => {
          setActiveUploadStep(step);
          const current = UPLOAD_STEPS.find((entry) => entry.id === step);
          setUploadStatus({
            tone: 'dimmed',
            message: current ? `${current.label}…` : 'Arbetar…',
          });
        },
      });
      setActiveUploadStep('updateField');
      updateRecipe((prev) => ({ ...prev, imageUrl: uploaded.url }));
      const kilobytes = Math.max(1, Math.round(uploaded.size / 1024));
      setUploadStepStatus(Object.fromEntries(UPLOAD_STEPS.map((step) => [step.id, 'complete'])) as Record<EditorImageUploadStep, UploadStepStatus>);
      setUploadStatus({
        tone: 'green',
        message: `Uppladdad som WebP (${uploaded.width}x${uploaded.height}, ${kilobytes} kB).`,
      });
    } catch (error) {
      setUploadStepStatus((prev) => {
        const next = { ...prev };
        const activeStep = UPLOAD_STEPS.find((step) => prev[step.id] === 'active');
        if (activeStep) {
          next[activeStep.id] = 'error';
        }
        return next;
      });
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
            <Group gap="sm" align="center" wrap="wrap">
              <button
                type="button"
                className="editor-image-upload-button"
                disabled={uploading}
                onClick={() => fileInputRef.current?.click()}
              >
                {uploading ? 'Laddar upp…' : 'Ladda upp bild'}
              </button>
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
            {(uploading || uploadStatus?.tone === 'green' || uploadStatus?.tone === 'red') && (
              <ol className="editor-image-upload-steps" aria-label="Bilduppladdningens steg">
                {UPLOAD_STEPS.map((step, index) => {
                  const status = uploadStepStatus[step.id];
                  return (
                    <li key={step.id} className={`editor-image-upload-step editor-image-upload-step--${status}`}>
                      <span className="editor-image-upload-step__marker" aria-hidden="true">
                        {status === 'active' ? (
                          <span className="editor-image-upload-spinner" />
                        ) : status === 'complete' ? (
                          <i className="fa-solid fa-check" aria-hidden="true" />
                        ) : status === 'error' ? (
                          <i className="fa-solid fa-xmark" aria-hidden="true" />
                        ) : (
                          index + 1
                        )}
                      </span>
                      <span className="editor-image-upload-step__copy">
                        <span className="editor-image-upload-step__label">
                          {index + 1}/{UPLOAD_STEPS.length} {step.label}
                        </span>
                      </span>
                    </li>
                  );
                })}
              </ol>
            )}
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
