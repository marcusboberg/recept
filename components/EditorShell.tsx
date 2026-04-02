'use client';

import { Alert, Button, Group, Stack, Text, TextInput, Title } from '@mantine/core';
import { EditorIngredientsPanel } from '@/components/editor/EditorIngredientsPanel';
import { EditorMetadataPanel } from '@/components/editor/EditorMetadataPanel';
import { EditorPreviewPanel } from '@/components/editor/EditorPreviewPanel';
import { EditorStepsPanel } from '@/components/editor/EditorStepsPanel';
import { useEditorRecipeState } from '@/components/editor/useEditorRecipeState';
import { JsonEditor } from '@/components/JsonEditor';
import { isAutoLikeSlug, NEW_RECIPE_SLUG, toRecipeSlug } from '@/lib/recipeWorkflows';
import type { Recipe } from '@/schema/recipeSchema';

interface Props {
  initialJson: string;
  initialTitle: string;
  mode: 'new' | 'edit';
}

interface EditorShellProps extends Props {
  forcedTab?: 'form' | 'json';
}

export function EditorShell({ initialJson, forcedTab }: EditorShellProps) {
  const view: 'form' | 'json' = forcedTab ?? 'form';
  const {
    activeDragWidth,
    activeDraggedItem,
    addStep,
    categoryOptions,
    content,
    deleteIngredient,
    deleting,
    errors,
    flatIngredients,
    formReady,
    formRecipe,
    handleDelete,
    handleDragCancel,
    handleDragEnd,
    handleDragStart,
    insertIngredientAt,
    insertMenu,
    preview,
    removeStep,
    saveDisabled,
    saving,
    sensors,
    setContent,
    setIngredientKind,
    setInsertMenu,
    setInputRefForIngredient,
    setShowDeleteModal,
    showDeleteModal,
    status,
    submit,
    updateIngredient,
    updateRecipe,
    updateStep,
  } = useEditorRecipeState({ initialJson });

  const renderTitleComposer = () => {
    if (!formRecipe) return null;
    const fallbackSegments =
      formRecipe.titleSegments && formRecipe.titleSegments.length > 0
        ? formRecipe.titleSegments
        : [
            ...(formRecipe.titlePrefix ? [{ text: formRecipe.titlePrefix, size: 'small' as const }] : []),
            { text: formRecipe.title, size: 'big' as const },
            ...(formRecipe.titleSuffix ? [{ text: formRecipe.titleSuffix, size: 'small' as const }] : []),
          ];

    const setSegments = (segments: { text: string; size: 'big' | 'small' }[]) => {
      const normalized = segments.map((segment) => ({ text: segment.text, size: segment.size }));
      const titleFromSegments = normalized
        .map((segment) => segment.text.trim())
        .filter((text) => text.length > 0)
        .join(' ')
        .trim();
      const title = titleFromSegments || 'Ny rätt';

      updateRecipe((prev) => {
        const next: Recipe = {
          ...prev,
          title,
          titlePrefix: '',
          titleSuffix: '',
          titleSegments: normalized.length > 0 ? normalized : [{ text: title, size: 'big' }],
        };

        if (prev.slug === NEW_RECIPE_SLUG || isAutoLikeSlug(prev.slug, prev.title)) {
          const nextSlug = toRecipeSlug(title);
          if (nextSlug) {
            next.slug = nextSlug;
          }
        }

        return next;
      });
    };

    const handleTextChange = (index: number, text: string) => {
      const next = [...fallbackSegments];
      next[index] = { ...next[index], text };
      setSegments(next);
    };

    const handleSizeToggle = (index: number) => {
      const next = [...fallbackSegments];
      next[index] = {
        ...next[index],
        size: next[index].size === 'big' ? 'small' : 'big',
      };
      setSegments(next);
    };

    const handleRemove = (index: number) => {
      const next = [...fallbackSegments];
      next.splice(index, 1);
      setSegments(next);
    };

    const handleAdd = () => {
      setSegments([...fallbackSegments, { text: 'Ny del', size: 'small' }]);
    };

    return (
      <Stack gap="sm" className="editor-meta-section">
        <div className="editor-meta-section__header">
          <Text size="sm" c="dimmed" className="editor-meta-section__eyebrow">
            Titel
          </Text>
          <Text size="sm" c="dimmed" className="editor-meta-section__hint">
            Bygg visningsrubriken i delar. Stor eller liten styr hur varje segment visas i kortet.
          </Text>
        </div>
        <div className="title-composer title-composer--segments">
          <Stack gap="sm" className="title-composer__segments">
            {fallbackSegments.map((segment, index) => (
              <Group key={index} className="title-segment-row" align="flex-start" wrap="nowrap">
                <TextInput
                  className="title-segment-row__input"
                  value={segment.text}
                  onChange={(event) => handleTextChange(index, event.currentTarget.value)}
                  placeholder={segment.size === 'big' ? 'Huvudtitel' : 'Delrubrik'}
                  radius="md"
                  size="md"
                  styles={{ root: { flex: 1 } }}
                />
                <Group gap="xs" className="title-segment-row__actions" wrap="nowrap">
                  <Button
                    type="button"
                    className={
                      segment.size === 'big'
                        ? 'title-segment-row__size-button title-segment-row__size-button--active'
                        : 'title-segment-row__size-button'
                    }
                    variant={segment.size === 'big' ? 'filled' : 'default'}
                    color={segment.size === 'big' ? 'studioBlue' : 'gray'}
                    radius="xl"
                    aria-label={segment.size === 'big' ? 'Stor del' : 'Liten del'}
                    onClick={() => handleSizeToggle(index)}
                    styles={{ root: { minWidth: 76 }, label: { fontWeight: 700 } }}
                  >
                    {segment.size === 'big' ? 'Stor' : 'Liten'}
                  </Button>
                  {fallbackSegments.length > 1 && (
                    <Button type="button" variant="subtle" color="red" radius="xl" aria-label="Ta bort" onClick={() => handleRemove(index)}>
                      <i className="fa-solid fa-trash-can" aria-hidden="true"></i>
                    </Button>
                  )}
                </Group>
              </Group>
            ))}
          </Stack>
          <Group justify="space-between" align="center" mt="sm" className="title-composer__toolbar">
            <Button type="button" className="title-composer__add-button" variant="light" color="studioBlue" radius="xl" onClick={handleAdd}>
              + Lägg till del
            </Button>
          </Group>
          <Text size="sm" mt="sm" className="title-composer__preview">
            <Text component="span" c="dimmed" inherit>
              Förhandsvisning:
            </Text>{' '}
            <Text component="strong" inherit>
              {fallbackSegments.map((segment) => segment.text).join(' ') || 'Ny rätt'}
            </Text>
          </Text>
        </div>
      </Stack>
    );
  };

  const renderInsertMenu = () => {
    if (!insertMenu) return null;
    const close = () => setInsertMenu(null);
    const handleAdd = (kind: 'ingredient' | 'heading') => {
      insertIngredientAt(insertMenu.index, kind);
      close();
    };
    return (
      <div className="insert-menu" style={{ top: insertMenu.y, left: insertMenu.x }}>
        <button type="button" onClick={() => handleAdd('ingredient')}>
          + Ingrediens
        </button>
        <button type="button" onClick={() => handleAdd('heading')}>
          + Rubrik
        </button>
        <button type="button" className="insert-menu__close" onClick={close} aria-label="Stäng">
          ×
        </button>
      </div>
    );
  };

  const renderForm = () => {
    if (!formRecipe) return null;
    return (
      <div className="workspace-grid">
        <EditorMetadataPanel
          categoryOptions={categoryOptions}
          formRecipe={formRecipe}
          titleComposer={renderTitleComposer()}
          updateRecipe={updateRecipe}
        />
        <EditorIngredientsPanel
          activeDragWidth={activeDragWidth}
          activeDraggedItem={activeDraggedItem}
          flatIngredients={flatIngredients}
          onDragCancel={handleDragCancel}
          onDragEnd={handleDragEnd}
          onDragStart={handleDragStart}
          sensors={sensors}
          setIngredientKind={setIngredientKind}
          setInputRefForIngredient={setInputRefForIngredient}
          updateIngredient={updateIngredient}
          deleteIngredient={deleteIngredient}
        />
        <EditorStepsPanel addStep={addStep} formRecipe={formRecipe} removeStep={removeStep} updateStep={updateStep} />
      </div>
    );
  };

  return (
    <div className="preview-grid">
      <div className="preview-grid__left">
        <div className="preview-grid__copy">
          <p className="eyebrow">Redigera</p>
          <Title order={2}>Arbeta i formulär eller JSON. Allt synkas med mobilen till höger.</Title>
        </div>
        <div className="preview-grid__editor">
          {view === 'form' && formReady && <div className="stack preview-form-stack">{renderForm()}</div>}
          {view === 'json' && (
            <div className="preview-grid__json">
              <JsonEditor value={content} onChange={setContent} errors={errors} />
            </div>
          )}
          {!formReady && errors.length > 0 && (
            <Alert color="red" variant="light" mt="md">
              Ogiltig JSON: {errors.join('; ')}
            </Alert>
          )}
        </div>
      </div>
      <div className="preview-grid__right">
        <EditorPreviewPanel
          deleting={deleting}
          formReady={formReady}
          formRecipe={formRecipe}
          preview={preview}
          saveDisabled={saveDisabled}
          saving={saving}
          showDeleteModal={showDeleteModal}
          status={status}
          submit={submit}
          onDelete={handleDelete}
          onOpenDeleteModal={() => setShowDeleteModal(true)}
          onCloseDeleteModal={() => setShowDeleteModal(false)}
        />
      </div>
      {renderInsertMenu()}
    </div>
  );
}
