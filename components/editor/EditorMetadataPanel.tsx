'use client';

import { useRef, useState, type ChangeEvent, type ReactNode } from 'react';
import { Group, Paper, SegmentedControl, Stack, Text, TextInput, Title } from '@mantine/core';
import { StudioCategoryField } from '@/components/StudioCategoryField';
import { getBaseCategoryIconClass } from '@/lib/categoryIcons';
import { createSmallerRecipeImage, uploadRecipeImage, type RecipeImageUploadStep } from '@/lib/clientImageUpload';
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

type EditorImageUploadStep = RecipeImageUploadStep | 'downloadFile' | 'updateField';
type UploadStepStatus = 'pending' | 'active' | 'complete' | 'error';
type ImageActionStep = { id: EditorImageUploadStep; label: string };

const UPLOAD_STEPS: ImageActionStep[] = [
  { id: 'validate', label: 'Kontrollerar filen' },
  { id: 'decode', label: 'Förbereder bilden' },
  { id: 'resize', label: 'Skalar ner bilden' },
  { id: 'convert', label: 'Konverterar till WebP' },
  { id: 'upload', label: 'Laddar upp till Vercel Blob' },
  { id: 'downloadUrl', label: 'Hämtar bildlänk' },
  { id: 'updateField', label: 'Uppdaterar Bild-URL' },
];

const LOCAL_STEPS: ImageActionStep[] = [
  { id: 'validate', label: 'Kontrollerar filen' },
  { id: 'upload', label: 'Skickar bilden till servern' },
  { id: 'resize', label: 'Skalar ner bilden' },
  { id: 'convert', label: 'Konverterar till WebP' },
  { id: 'downloadFile', label: 'Sparar filen som smaller' },
];

function initialUploadStepStatus(steps: ImageActionStep[]): Record<EditorImageUploadStep, UploadStepStatus> {
  return Object.fromEntries(steps.map((step) => [step.id, 'pending'])) as Record<EditorImageUploadStep, UploadStepStatus>;
}

export function EditorMetadataPanel({ categoryOptions, formRecipe, titleComposer, updateRecipe }: Props) {
  const recipeKind = inferRecipeKind(formRecipe);
  const uploadFileInputRef = useRef<HTMLInputElement | null>(null);
  const localFileInputRef = useRef<HTMLInputElement | null>(null);
  const activeStepsRef = useRef<ImageActionStep[]>(UPLOAD_STEPS);
  const [uploadStatus, setUploadStatus] = useState<{ tone: 'dimmed' | 'green' | 'red'; message: string } | null>(null);
  const [activeSteps, setActiveSteps] = useState<ImageActionStep[]>(UPLOAD_STEPS);
  const [uploadStepStatus, setUploadStepStatus] = useState<Record<EditorImageUploadStep, UploadStepStatus>>(initialUploadStepStatus(UPLOAD_STEPS));
  const [processingImage, setProcessingImage] = useState<'local' | 'upload' | null>(null);

  const startImageAction = (steps: ImageActionStep[], message: string) => {
    activeStepsRef.current = steps;
    setActiveSteps(steps);
    setUploadStepStatus(initialUploadStepStatus(steps));
    setUploadStatus({ tone: 'dimmed', message });
  };

  const setActiveUploadStep = (stepId: EditorImageUploadStep) => {
    const steps = activeStepsRef.current;
    const activeIndex = steps.findIndex((step) => step.id === stepId);
    setUploadStepStatus((prev) => {
      const next = { ...prev };
      steps.forEach((step, index) => {
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

  const markCurrentStepAsError = () => {
    setUploadStepStatus((prev) => {
      const next = { ...prev };
      const activeStep = activeStepsRef.current.find((step) => prev[step.id] === 'active');
      if (activeStep) {
        next[activeStep.id] = 'error';
      }
      return next;
    });
  };

  const handleImageUpload = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.currentTarget.files?.[0];
    event.currentTarget.value = '';

    if (!file) {
      return;
    }

    setProcessingImage('upload');
    startImageAction(UPLOAD_STEPS, 'Startar bilduppladdning…');

    try {
      const uploaded = await uploadRecipeImage(file, formRecipe.slug, {
        onProgress: ({ step }) => {
          setActiveUploadStep(step);
          const current = activeStepsRef.current.find((entry) => entry.id === step);
          setUploadStatus({
            tone: 'dimmed',
            message: current ? `${current.label}…` : 'Arbetar…',
          });
        },
      });
      setActiveUploadStep('updateField');
      updateRecipe((prev) => ({ ...prev, imageUrl: uploaded.url }));
      const kilobytes = Math.max(1, Math.round(uploaded.size / 1024));
      setUploadStepStatus(Object.fromEntries(activeStepsRef.current.map((step) => [step.id, 'complete'])) as Record<EditorImageUploadStep, UploadStepStatus>);
      setUploadStatus({
        tone: 'green',
        message: `Uppladdad som WebP (${uploaded.width}x${uploaded.height}, ${kilobytes} kB).`,
      });
    } catch (error) {
      markCurrentStepAsError();
      setUploadStatus({
        tone: 'red',
        message: (error as Error).message || 'Kunde inte ladda upp bilden.',
      });
    } finally {
      setProcessingImage(null);
    }
  };

  const handleLocalImageDownload = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.currentTarget.files?.[0];
    event.currentTarget.value = '';

    if (!file) {
      return;
    }

    setProcessingImage('local');
    startImageAction(LOCAL_STEPS, 'Startar lokal WebP-version…');

    try {
      setActiveUploadStep('validate');
      setUploadStatus({ tone: 'dimmed', message: 'Kontrollerar filen…' });
      const image = await createSmallerRecipeImage(file, formRecipe.slug, {
        onProgress: ({ step }) => {
          setActiveUploadStep(step);
          const current = activeStepsRef.current.find((entry) => entry.id === step);
          setUploadStatus({
            tone: 'dimmed',
            message: current ? `${current.label}…` : 'Arbetar…',
          });
        },
      });

      setActiveUploadStep('resize');
      setActiveUploadStep('convert');
      setActiveUploadStep('downloadFile');
      const objectUrl = URL.createObjectURL(image.blob);
      const link = document.createElement('a');
      link.href = objectUrl;
      link.download = image.filename;
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.setTimeout(() => URL.revokeObjectURL(objectUrl), 0);

      const kilobytes = Math.max(1, Math.round(image.size / 1024));
      setUploadStepStatus(Object.fromEntries(activeStepsRef.current.map((step) => [step.id, 'complete'])) as Record<EditorImageUploadStep, UploadStepStatus>);
      setUploadStatus({
        tone: 'green',
        message: `Sparad som ${image.filename} (${image.width}x${image.height}, ${kilobytes} kB).`,
      });
    } catch (error) {
      markCurrentStepAsError();
      setUploadStatus({
        tone: 'red',
        message: (error as Error).message || 'Kunde inte skapa en mindre WebP.',
      });
    } finally {
      setProcessingImage(null);
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
              ref={uploadFileInputRef}
              type="file"
              accept="image/*"
              hidden
              onChange={handleImageUpload}
            />
            <input
              ref={localFileInputRef}
              type="file"
              accept="image/*"
              hidden
              onChange={handleLocalImageDownload}
            />
            <Group gap="sm" align="center" wrap="wrap">
              <button
                type="button"
                className="editor-image-upload-button"
                disabled={Boolean(processingImage)}
                onClick={() => uploadFileInputRef.current?.click()}
              >
                {processingImage === 'upload' ? 'Laddar upp…' : 'Ladda upp bild'}
              </button>
              <button
                type="button"
                className="editor-image-upload-button editor-image-upload-button--secondary"
                disabled={Boolean(processingImage)}
                onClick={() => localFileInputRef.current?.click()}
              >
                {processingImage === 'local' ? 'Skapar…' : 'Skapa liten WebP'}
              </button>
              {uploadStatus ? (
                <Text size="sm" c={uploadStatus.tone}>
                  {uploadStatus.message}
                </Text>
              ) : (
                <Text size="sm" c="dimmed">
                  Konverteras till WebP och sparas i Vercel Blob.
                </Text>
              )}
            </Group>
            {(processingImage || uploadStatus?.tone === 'green' || uploadStatus?.tone === 'red') && (
              <ol className="editor-image-upload-steps" aria-label="Bilduppladdningens steg">
                {activeSteps.map((step, index) => {
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
                          {index + 1}/{activeSteps.length} {step.label}
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
