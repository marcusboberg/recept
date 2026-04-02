'use client';

import type { ReactNode } from 'react';
import {
  DndContext,
  DragOverlay,
  closestCenter,
  type DragEndEvent,
  type DragStartEvent,
} from '@dnd-kit/core';
import { restrictToParentElement, restrictToVerticalAxis } from '@dnd-kit/modifiers';
import { SortableContext, useSortable, verticalListSortingStrategy } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { ActionIcon, Group, Paper, SegmentedControl, Stack, TextInput, Title } from '@mantine/core';
import { editorSegmentedClassNames, type FlatIngredientRow } from './types';

interface Props {
  activeDragWidth: number | null;
  activeDraggedItem: FlatIngredientRow | null;
  flatIngredients: FlatIngredientRow[];
  onDragCancel: () => void;
  onDragEnd: (event: DragEndEvent) => void;
  onDragStart: (event: DragStartEvent) => void;
  sensors: ReturnType<typeof import('@dnd-kit/core').useSensors>;
  setIngredientKind: (index: number, kind: 'ingredient' | 'heading') => void;
  setInputRefForIngredient: (id: string, element: HTMLInputElement | null) => void;
  updateIngredient: (index: number, field: 'label' | 'amount', value: string) => void;
  deleteIngredient: (index: number) => void;
}

type SortableIngredientRowProps = {
  item: FlatIngredientRow;
  index: number;
  onUpdateIngredient: (index: number, field: 'label' | 'amount', value: string) => void;
  onSetKind: (kind: 'ingredient' | 'heading') => void;
  onDelete: () => void;
  setInputRef: (el: HTMLInputElement | null) => void;
};

type IngredientRowContentProps = {
  item: FlatIngredientRow;
  index: number;
  onUpdateIngredient: (index: number, field: 'label' | 'amount', value: string) => void;
  onSetKind: (kind: 'ingredient' | 'heading') => void;
  dragHandle: ReactNode;
  deleteAction: ReactNode;
  readOnly?: boolean;
  setInputRef?: (el: HTMLInputElement | null) => void;
};

function IngredientRowContent({
  item,
  index,
  onUpdateIngredient,
  onSetKind,
  dragHandle,
  deleteAction,
  readOnly = false,
  setInputRef,
}: IngredientRowContentProps) {
  return (
    <div className="ingredient-row__grid">
      {dragHandle}
      <TextInput
        classNames={{
          input:
            item.kind === 'heading'
              ? 'ingredient-row__name ingredient-row__name--heading'
              : item.isPlaceholder
                ? 'ingredient-row__name ingredient-row__name--placeholder'
                : 'ingredient-row__name',
        }}
        ref={setInputRef}
        value={item.label}
        onChange={(event) => onUpdateIngredient(index, 'label', event.currentTarget.value)}
        placeholder={item.kind === 'heading' ? 'Ny rubrik' : item.isPlaceholder ? 'Lägg till ingrediens' : 't.ex. Smör'}
        variant="default"
        radius="md"
        size="md"
        readOnly={readOnly}
      />
      {item.kind !== 'heading' ? (
        <TextInput
          classNames={{ input: item.isPlaceholder ? 'ingredient-row__amount ingredient-row__amount--placeholder' : 'ingredient-row__amount' }}
          value={item.amount ?? ''}
          onChange={(event) => onUpdateIngredient(index, 'amount', event.currentTarget.value)}
          placeholder="1 dl"
          variant="filled"
          radius="md"
          size="md"
          readOnly={readOnly}
        />
      ) : (
        <div className="ingredient-row__amount-spacer" aria-hidden="true" />
      )}
      <SegmentedControl
        className="ingredient-kind-toggle"
        aria-label="Välj radtyp"
        value={item.kind}
        onChange={(value) => onSetKind(value as 'ingredient' | 'heading')}
        size="sm"
        radius="xl"
        color="studioBlue"
        classNames={editorSegmentedClassNames}
        data={[
          { label: 'Ingrediens', value: 'ingredient' },
          { label: 'Rubrik', value: 'heading' },
        ]}
        disabled={readOnly}
      />
      {deleteAction}
    </div>
  );
}

function SortableIngredientRow({
  item,
  index,
  onUpdateIngredient,
  onSetKind,
  onDelete,
  setInputRef,
}: SortableIngredientRowProps) {
  const { attributes, listeners, setActivatorNodeRef, setNodeRef, transform, transition, isDragging } = useSortable({
    id: item.id,
  });

  const rowClass = [
    'ingredient-row',
    item.kind === 'heading' ? 'ingredient-row--heading' : 'ingredient-row--item',
    isDragging ? 'ingredient-row--dragging' : '',
  ]
    .filter(Boolean)
    .join(' ');

  return (
    <div ref={setNodeRef} className={rowClass} style={{ transform: CSS.Transform.toString(transform), transition }}>
      <IngredientRowContent
        item={item}
        index={index}
        onUpdateIngredient={onUpdateIngredient}
        onSetKind={onSetKind}
        setInputRef={setInputRef}
        dragHandle={
          <ActionIcon
            type="button"
            className="ingredient-drag"
            ref={setActivatorNodeRef}
            {...listeners}
            {...attributes}
            aria-label="Dra för att flytta"
            variant="subtle"
            color="gray"
            radius="xl"
          >
            <i className="fa-solid fa-grip-vertical" aria-hidden="true"></i>
          </ActionIcon>
        }
        deleteAction={
          <ActionIcon
            type="button"
            className="chip-button chip-button--icon chip-button--danger"
            aria-label="Ta bort"
            onClick={onDelete}
            disabled={item.kind === 'heading'}
            variant="subtle"
            color="red"
            radius="xl"
          >
            <i className="fa-solid fa-trash-can" aria-hidden="true"></i>
          </ActionIcon>
        }
      />
    </div>
  );
}

export function EditorIngredientsPanel({
  activeDragWidth,
  activeDraggedItem,
  flatIngredients,
  onDragCancel,
  onDragEnd,
  onDragStart,
  sensors,
  setIngredientKind,
  setInputRefForIngredient,
  updateIngredient,
  deleteIngredient,
}: Props) {
  const sortableItems = flatIngredients.filter((item) => !item.isPlaceholder);
  const placeholderItem = flatIngredients.find((item) => item.isPlaceholder) ?? null;

  return (
    <Paper className="workspace-card stack" withBorder radius="xl" p="xl" shadow="sm">
      <Stack gap="lg">
        <Group justify="space-between" align="center" gap="sm">
          <Title order={3}>Ingredienser</Title>
        </Group>
        <DndContext
          sensors={sensors}
          collisionDetection={closestCenter}
          modifiers={[restrictToVerticalAxis, restrictToParentElement]}
          onDragStart={onDragStart}
          onDragEnd={onDragEnd}
          onDragCancel={onDragCancel}
        >
          <SortableContext items={sortableItems.map((item) => item.id)} strategy={verticalListSortingStrategy}>
            <div className="stack" style={{ gap: 0 }}>
              {sortableItems.map((item, index) => (
                <SortableIngredientRow
                  key={item.id}
                  item={item}
                  index={index}
                  onUpdateIngredient={updateIngredient}
                  onSetKind={(kind) => setIngredientKind(index, kind)}
                  onDelete={() => deleteIngredient(index)}
                  setInputRef={(element) => setInputRefForIngredient(item.id, element)}
                />
              ))}
              {placeholderItem && (
                <div key={placeholderItem.id} className="ingredient-row ingredient-row--placeholder">
                  <IngredientRowContent
                    item={placeholderItem}
                    index={flatIngredients.findIndex((item) => item.id === placeholderItem.id)}
                    onUpdateIngredient={updateIngredient}
                    onSetKind={(kind) => {
                      const placeholderIndex = flatIngredients.findIndex((item) => item.id === placeholderItem.id);
                      if (placeholderIndex >= 0) {
                        setIngredientKind(placeholderIndex, kind);
                      }
                    }}
                    setInputRef={(element) => setInputRefForIngredient(placeholderItem.id, element)}
                    dragHandle={<div className="ingredient-row__handle-spacer" aria-hidden="true" />}
                    deleteAction={<div className="ingredient-row__delete-spacer" aria-hidden="true" />}
                  />
                </div>
              )}
            </div>
          </SortableContext>
          <DragOverlay zIndex={1000}>
            {activeDraggedItem ? (
              <div
                className={`ingredient-row ingredient-row--overlay ${
                  activeDraggedItem.kind === 'heading' ? 'ingredient-row--heading' : 'ingredient-row--item'
                }`}
                style={activeDragWidth ? { width: activeDragWidth } : undefined}
              >
                <IngredientRowContent
                  item={activeDraggedItem}
                  index={-1}
                  readOnly
                  dragHandle={
                    <ActionIcon
                      type="button"
                      className="ingredient-drag"
                      aria-label="Dra för att flytta"
                      variant="default"
                      color="gray"
                      radius="xl"
                      disabled
                    >
                      <i className="fa-solid fa-grip-vertical" aria-hidden="true"></i>
                    </ActionIcon>
                  }
                  deleteAction={
                    <ActionIcon
                      type="button"
                      className="chip-button chip-button--icon chip-button--danger"
                      aria-label="Ta bort"
                      variant="subtle"
                      color="red"
                      radius="xl"
                      disabled
                    >
                      <i className="fa-solid fa-trash-can" aria-hidden="true"></i>
                    </ActionIcon>
                  }
                  onUpdateIngredient={() => {}}
                  onSetKind={() => {}}
                />
              </div>
            ) : null}
          </DragOverlay>
        </DndContext>
      </Stack>
    </Paper>
  );
}
