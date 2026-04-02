'use client';

import { Alert, Button, Group, Modal, Stack, Text } from '@mantine/core';
import { RecipePreview } from '@/components/RecipePreview';
import type { Recipe } from '@/schema/recipeSchema';

interface Props {
  deleting: boolean;
  formReady: boolean;
  formRecipe: Recipe | null;
  preview: Recipe | null;
  saveDisabled: boolean;
  saving: boolean;
  showDeleteModal: boolean;
  status: string | null;
  submit: () => Promise<void>;
  onDelete: () => Promise<void>;
  onOpenDeleteModal: () => void;
  onCloseDeleteModal: () => void;
}

export function EditorPreviewPanel({
  deleting,
  formReady,
  formRecipe,
  preview,
  saveDisabled,
  saving,
  showDeleteModal,
  status,
  submit,
  onDelete,
  onOpenDeleteModal,
  onCloseDeleteModal,
}: Props) {
  return (
    <>
      <Group className="preview-grid__actions" wrap="nowrap" align="center">
        <Button
          className="preview-grid__save"
          color="green"
          radius="xl"
          size="lg"
          onClick={submit}
          disabled={saveDisabled}
          loading={saving}
        >
          {saving ? 'Sparar…' : 'Spara recept'}
        </Button>
        {formReady && (
          <Button type="button" variant="subtle" color="red" className="preview-grid__delete" onClick={onOpenDeleteModal}>
            <i className="fa-solid fa-trash-can" aria-hidden="true" /> Radera recept
          </Button>
        )}
      </Group>
      {status && (
        <Alert color={status.toLowerCase().includes('raderat') || status.toLowerCase().includes('saved') ? 'studioBlue' : 'red'} variant="light">
          {status}
        </Alert>
      )}
      <div className="preview-grid__device preview-grid__device--full">
        {preview ? (
          <div className="preview-page">
            <RecipePreview recipe={preview} />
          </div>
        ) : (
          <Alert color="red" variant="light" style={{ width: '100%' }}>
            Invalid JSON
          </Alert>
        )}
      </div>
      <Modal opened={showDeleteModal && Boolean(formRecipe)} onClose={onCloseDeleteModal} title="Radera recept" centered radius="xl">
        {formRecipe && (
          <Stack gap="md">
            <Text>Detta kommer att radera &quot;{formRecipe.title}&quot;. Är du säker?</Text>
            <Group justify="flex-end">
              <Button type="button" variant="default" onClick={onCloseDeleteModal}>
                Avbryt
              </Button>
              <Button type="button" color="red" onClick={onDelete} loading={deleting}>
                {deleting ? 'Raderar…' : 'Radera'}
              </Button>
            </Group>
          </Stack>
        )}
      </Modal>
    </>
  );
}
