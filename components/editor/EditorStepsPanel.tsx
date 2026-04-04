'use client';

import { Button, Group, Paper, Stack, Text, TextInput, Textarea, Title } from '@mantine/core';
import type { Recipe } from '@/schema/recipeSchema';

type FloatingFieldProps = {
  id: string;
  label: string;
  value: string;
  onChange: (value: string) => void;
  textarea?: boolean;
  rows?: number;
};

function FloatingField({ id, label, value, onChange, textarea = false, rows = 3 }: FloatingFieldProps) {
  const sharedProps = {
    id,
    value,
    placeholder: ' ',
    radius: 'md' as const,
    'aria-label': label,
  };

  return (
    <div className={`studio-floating-field${value.trim().length > 0 ? ' is-filled' : ''}${textarea ? ' is-textarea' : ''}`}>
      {textarea ? (
        <Textarea
          {...sharedProps}
          rows={rows}
          classNames={{ input: 'studio-floating-field__input studio-floating-field__input--textarea' }}
          onChange={(event) => onChange(event.currentTarget.value)}
        />
      ) : (
        <TextInput
          {...sharedProps}
          classNames={{ input: 'studio-floating-field__input' }}
          onChange={(event) => onChange(event.currentTarget.value)}
        />
      )}
      <label className="studio-floating-field__label" htmlFor={id}>
        {label}
      </label>
    </div>
  );
}

interface Props {
  addStep: () => void;
  formRecipe: Recipe;
  removeStep: (index: number) => void;
  updateStep: (index: number, field: 'title' | 'body', value: string) => void;
}

export function EditorStepsPanel({ addStep, formRecipe, removeStep, updateStep }: Props) {
  return (
    <Paper className="workspace-card stack" withBorder radius="xl" p="xl" shadow="sm">
      <Stack gap="lg">
        <Group justify="space-between" align="center" gap="md">
          <Title order={3}>Gör så här</Title>
          <Button type="button" className="editor-section__add-button" color="studioBlue" radius="xl" onClick={addStep}>
            Lägg till steg
          </Button>
        </Group>
        <Stack gap="sm" className="studio-steps-list">
          {(formRecipe.steps ?? []).map((step, index) => (
            <div key={index} className="studio-step-row">
              <div className="studio-step-row__header">
                <Text size="sm" c="dimmed" fw={700} className="studio-step-row__index">
                  Steg {index + 1}
                </Text>
                <Button
                  type="button"
                  className="studio-step-row__remove"
                  variant="subtle"
                  color="red"
                  onClick={() => removeStep(index)}
                  aria-label={`Ta bort steg ${index + 1}`}
                >
                  <i className="fa-solid fa-trash-can" aria-hidden="true" /> Ta bort
                </Button>
              </div>
              <div className="studio-step-row__body">
                <FloatingField
                  id={`step-title-${index}`}
                  label="Stegrubrik (valfri)"
                  value={step.title ?? ''}
                  onChange={(value) => updateStep(index, 'title', value)}
                />
                <FloatingField
                  id={`step-body-${index}`}
                  label="Instruktion"
                  value={step.body}
                  onChange={(value) => updateStep(index, 'body', value)}
                  textarea
                  rows={3}
                />
              </div>
            </div>
          ))}
        </Stack>
      </Stack>
    </Paper>
  );
}
