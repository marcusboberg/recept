'use client';

import { useRef, useState, type ReactNode } from 'react';
import {
  DndContext,
  DragOverlay,
  KeyboardSensor,
  PointerSensor,
  closestCenter,
  useDroppable,
  useSensor,
  useSensors,
  type DragEndEvent,
  type DragStartEvent,
} from '@dnd-kit/core';
import { SortableContext, sortableKeyboardCoordinates, useSortable, verticalListSortingStrategy } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import {
  applyEditableRecipeTitle,
  moveIngredientBetweenGroups,
  type IngredientGroup,
} from '@/lib/recipePresentation';
import type { Recipe } from '@/schema/recipeSchema';

type IngredientDragData = {
  type: 'ingredient';
  groupIndex: number;
  itemIndex: number;
};

type GroupDropData = {
  type: 'group';
  groupIndex: number;
};

const getIngredientDragId = (groupIndex: number, itemIndex: number) => `ingredient-${groupIndex}-${itemIndex}`;
const getGroupDropId = (groupIndex: number) => `ingredient-group-${groupIndex}`;

function isIngredientDragData(value: unknown): value is IngredientDragData {
  if (!value || typeof value !== 'object') {
    return false;
  }

  const data = value as Partial<IngredientDragData>;
  return data.type === 'ingredient' && Number.isInteger(data.groupIndex) && Number.isInteger(data.itemIndex);
}

function isGroupDropData(value: unknown): value is GroupDropData {
  if (!value || typeof value !== 'object') {
    return false;
  }

  const data = value as Partial<GroupDropData>;
  return data.type === 'group' && Number.isInteger(data.groupIndex);
}

interface SortableIngredientRowProps {
  children: ReactNode;
  groupIndex: number;
  itemIndex: number;
  label: string;
}

function SortableIngredientRow({ children, groupIndex, itemIndex, label }: SortableIngredientRowProps) {
  const id = getIngredientDragId(groupIndex, itemIndex);
  const { attributes, isDragging, listeners, setActivatorNodeRef, setNodeRef, transform, transition } = useSortable({
    id,
    data: { type: 'ingredient', groupIndex, itemIndex } satisfies IngredientDragData,
  });

  return (
    <div
      ref={setNodeRef}
      className={isDragging ? 'recipe-quick-edit__row is-dragging' : 'recipe-quick-edit__row'}
      style={{ transform: CSS.Transform.toString(transform), transition }}
    >
      <button
        ref={setActivatorNodeRef}
        type="button"
        className="recipe-quick-edit__drag-handle"
        aria-label={`Dra ${label || 'ingrediensen'} till en annan grupp`}
        {...attributes}
        {...listeners}
      >
        <i className="fa-solid fa-grip-vertical" aria-hidden="true" />
      </button>
      {children}
    </div>
  );
}

function DroppableIngredientGroup({ children, groupIndex }: { children: ReactNode; groupIndex: number }) {
  const { isOver, setNodeRef } = useDroppable({
    id: getGroupDropId(groupIndex),
    data: { type: 'group', groupIndex } satisfies GroupDropData,
  });

  return (
    <div
      ref={setNodeRef}
      className={isOver ? 'recipe-quick-edit__group is-drop-target' : 'recipe-quick-edit__group'}
    >
      {children}
    </div>
  );
}

interface Props {
  activeView: 'ingredients' | 'steps';
  draftRecipe: Recipe;
  isSavingEdit: boolean;
  onCancel: () => void;
  onSave: () => void;
  setActiveView: (view: 'ingredients' | 'steps') => void;
  toggleDirection: 'left' | 'right';
  updateDraftIngredientGroups: (updater: (prev: IngredientGroup[]) => IngredientGroup[]) => void;
  updateDraftRecipe: (updater: (prev: Recipe) => Recipe) => void;
}

export function RecipeQuickEditPanel({
  activeView,
  draftRecipe,
  isSavingEdit,
  onCancel,
  onSave,
  setActiveView,
  toggleDirection,
  updateDraftIngredientGroups,
  updateDraftRecipe,
}: Props) {
  const pendingGroupTitleFocus = useRef<number | null>(null);
  const groupTitleRefs = useRef<Record<number, HTMLInputElement | null>>({});
  const [draggedIngredient, setDraggedIngredient] = useState<Recipe['ingredients'][number] | null>(null);
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: { distance: 4 },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    }),
  );
  const groups = draftRecipe.ingredientGroups && draftRecipe.ingredientGroups.length > 0
    ? draftRecipe.ingredientGroups
    : [{ title: 'Ingredienser', items: draftRecipe.ingredients ?? [] }];
  const showGroupTitles = groups.length > 1 || groups.some((group) => Boolean(group.title?.trim() && group.title.trim() !== 'Ingredienser'));

  const focusPendingGroupTitle = () => {
    const groupIndex = pendingGroupTitleFocus.current;
    if (groupIndex === null) {
      return;
    }

    const target = groupTitleRefs.current[groupIndex];
    if (!target) {
      return;
    }

    target.focus();
    target.select();
    pendingGroupTitleFocus.current = null;
  };

  const addIngredientGroupAfter = (groupIndex: number) => {
    updateDraftIngredientGroups((prev) => {
      const next = [...prev];
      next.splice(groupIndex + 1, 0, {
        title: '',
        items: [{ label: '', amount: '', kind: 'ingredient' }],
      });
      return next;
    });
    pendingGroupTitleFocus.current = groupIndex + 1;
    window.setTimeout(focusPendingGroupTitle, 0);
  };

  const handleIngredientDragStart = (event: DragStartEvent) => {
    const source = event.active.data.current;
    if (!isIngredientDragData(source)) {
      return;
    }

    setDraggedIngredient(groups[source.groupIndex]?.items[source.itemIndex] ?? null);
  };

  const handleIngredientDragEnd = (event: DragEndEvent) => {
    setDraggedIngredient(null);

    const source = event.active.data.current;
    const destination = event.over?.data.current;
    if (!isIngredientDragData(source) || !destination) {
      return;
    }

    if (isIngredientDragData(destination)) {
      updateDraftIngredientGroups((prev) => moveIngredientBetweenGroups(prev, source, destination));
      return;
    }

    if (isGroupDropData(destination)) {
      updateDraftIngredientGroups((prev) =>
        moveIngredientBetweenGroups(prev, source, {
          groupIndex: destination.groupIndex,
          itemIndex: prev[destination.groupIndex]?.items.length ?? 0,
        }),
      );
    }
  };

  return (
    <div className="recipe-quick-edit">
      <div className="recipe-quick-edit__meta">
        <label className="recipe-quick-edit__field">
          <span>Receptnamn</span>
          <input
            className="recipe-quick-edit__input"
            value={draftRecipe.title}
            onChange={(event) =>
              updateDraftRecipe((prev) => applyEditableRecipeTitle(prev, event.target.value))
            }
            placeholder="Receptnamn"
          />
        </label>
        <label className="recipe-quick-edit__field">
          <span>Bild</span>
          <input
            className="recipe-quick-edit__input"
            value={draftRecipe.imageUrl}
            onChange={(event) =>
              updateDraftRecipe((prev) => ({
                ...prev,
                imageUrl: event.target.value,
              }))
            }
            placeholder="Bild-URL"
          />
        </label>
      </div>
      <div className="recipe-toggle-mobile" role="tablist" aria-label="Redigera innehåll">
        <span className={`recipe-toggle-mobile__bg ${activeView === 'ingredients' ? 'is-left' : 'is-right'}`} aria-hidden="true">
          <span className={`recipe-toggle-mobile__bg-inner ${toggleDirection === 'right' ? 'wobble-right' : 'wobble-left'}`} />
        </span>
        <button
          className={activeView === 'ingredients' ? 'recipe-toggle-mobile__tab is-active' : 'recipe-toggle-mobile__tab'}
          onClick={() => setActiveView('ingredients')}
          role="tab"
          aria-selected={activeView === 'ingredients'}
          type="button"
        >
          Ingredienser
        </button>
        <button
          className={activeView === 'steps' ? 'recipe-toggle-mobile__tab is-active' : 'recipe-toggle-mobile__tab'}
          onClick={() => setActiveView('steps')}
          role="tab"
          aria-selected={activeView === 'steps'}
          type="button"
        >
          Gör så här
        </button>
      </div>

      {activeView === 'ingredients' ? (
        <DndContext
          sensors={sensors}
          collisionDetection={closestCenter}
          onDragStart={handleIngredientDragStart}
          onDragEnd={handleIngredientDragEnd}
          onDragCancel={() => setDraggedIngredient(null)}
        >
          <div className="recipe-quick-edit__section">
            {groups.map((group, groupIndex) => (
              <DroppableIngredientGroup key={groupIndex} groupIndex={groupIndex}>
                {showGroupTitles ? (
                  <input
                    ref={(element) => {
                      groupTitleRefs.current[groupIndex] = element;
                    }}
                    className="recipe-quick-edit__group-title"
                    value={group.title ?? ''}
                    onChange={(event) =>
                      updateDraftIngredientGroups((prev) =>
                        prev.map((entry, idx) => (idx === groupIndex ? { ...entry, title: event.target.value } : entry)),
                      )
                    }
                    placeholder="Mellanrubrik"
                  />
                ) : null}
                <SortableContext
                  items={group.items.map((_, itemIndex) => getIngredientDragId(groupIndex, itemIndex))}
                  strategy={verticalListSortingStrategy}
                >
                  <div className="recipe-quick-edit__rows">
                    {group.items.map((item, itemIndex) => (
                      <SortableIngredientRow
                        key={getIngredientDragId(groupIndex, itemIndex)}
                        groupIndex={groupIndex}
                        itemIndex={itemIndex}
                        label={item.label}
                      >
                        <input
                          className="recipe-quick-edit__input recipe-quick-edit__input--label"
                          value={item.label}
                          onChange={(event) =>
                            updateDraftIngredientGroups((prev) =>
                              prev.map((entry, idx) =>
                                idx === groupIndex
                                  ? {
                                      ...entry,
                                      items: entry.items.map((current, currentIndex) =>
                                        currentIndex === itemIndex ? { ...current, label: event.target.value } : current,
                                      ),
                                    }
                                  : entry,
                              ),
                            )
                          }
                          placeholder="Ingrediens"
                        />
                        <input
                          className="recipe-quick-edit__input recipe-quick-edit__input--amount"
                          value={item.amount ?? ''}
                          onChange={(event) =>
                            updateDraftIngredientGroups((prev) =>
                              prev.map((entry, idx) =>
                                idx === groupIndex
                                  ? {
                                      ...entry,
                                      items: entry.items.map((current, currentIndex) =>
                                        currentIndex === itemIndex ? { ...current, amount: event.target.value } : current,
                                      ),
                                    }
                                  : entry,
                              ),
                            )
                          }
                          placeholder="Mängd"
                        />
                        <button
                          type="button"
                          className="recipe-quick-edit__icon"
                          onClick={() =>
                            updateDraftIngredientGroups((prev) =>
                              prev.map((entry, idx) =>
                                idx === groupIndex
                                  ? {
                                      ...entry,
                                      items:
                                        entry.items.length > 1
                                          ? entry.items.filter((_, currentIndex) => currentIndex !== itemIndex)
                                          : [{ label: '', amount: '', kind: 'ingredient' }],
                                    }
                                  : entry,
                              ),
                            )
                          }
                          aria-label="Ta bort ingrediens"
                        >
                          <i className="fa-solid fa-trash-can" aria-hidden="true" />
                        </button>
                      </SortableIngredientRow>
                    ))}
                  </div>
                </SortableContext>
                <button
                  type="button"
                  className="recipe-quick-edit__add"
                  onClick={() =>
                    updateDraftIngredientGroups((prev) =>
                      prev.map((entry, idx) =>
                        idx === groupIndex
                          ? {
                              ...entry,
                              items: [...entry.items, { label: '', amount: '', kind: 'ingredient' }],
                            }
                          : entry,
                      ),
                    )
                  }
                >
                  + Lägg till ingrediens
                </button>
                <button
                  type="button"
                  className="recipe-quick-edit__add recipe-quick-edit__add--secondary"
                  onClick={() => addIngredientGroupAfter(groupIndex)}
                >
                  + Lägg till mellanrubrik
                </button>
              </DroppableIngredientGroup>
            ))}
          </div>
          <DragOverlay dropAnimation={{ duration: 160, easing: 'ease-out' }}>
            {draggedIngredient ? (
              <div className="recipe-quick-edit__drag-overlay">
                <i className="fa-solid fa-grip-vertical" aria-hidden="true" />
                <span>{draggedIngredient.label || 'Ny ingrediens'}</span>
                {draggedIngredient.amount ? <strong>{draggedIngredient.amount}</strong> : null}
              </div>
            ) : null}
          </DragOverlay>
        </DndContext>
      ) : (
        <div className="recipe-quick-edit__section recipe-quick-edit__section--steps">
          {(draftRecipe.steps ?? []).map((step, index) => (
            <div key={index} className="recipe-quick-edit__step">
              <div className="recipe-quick-edit__step-header">
                <span className="recipe-quick-edit__step-index">Steg {index + 1}</span>
                <button
                  type="button"
                  className="recipe-quick-edit__text-button"
                  onClick={() =>
                    updateDraftRecipe((prev) => {
                      const nextSteps = [...(prev.steps ?? [])];
                      nextSteps.splice(index, 1);
                      return { ...prev, steps: nextSteps.length > 0 ? nextSteps : [{ title: '', body: '' }] };
                    })
                  }
                >
                  Ta bort
                </button>
              </div>
              <input
                className="recipe-quick-edit__input"
                value={step.title ?? ''}
                onChange={(event) =>
                  updateDraftRecipe((prev) => {
                    const nextSteps = [...(prev.steps ?? [])];
                    nextSteps[index] = { ...nextSteps[index], title: event.target.value };
                    return { ...prev, steps: nextSteps };
                  })
                }
                placeholder="Stegrubrik (valfri)"
              />
              <textarea
                className="recipe-quick-edit__textarea"
                value={step.body}
                onChange={(event) =>
                  updateDraftRecipe((prev) => {
                    const nextSteps = [...(prev.steps ?? [])];
                    nextSteps[index] = { ...nextSteps[index], body: event.target.value };
                    return { ...prev, steps: nextSteps };
                  })
                }
                placeholder="Instruktion"
                rows={4}
              />
            </div>
          ))}
          <button
            type="button"
            className="recipe-quick-edit__add"
            onClick={() =>
              updateDraftRecipe((prev) => ({
                ...prev,
                steps: [...(prev.steps ?? []), { title: '', body: '' }],
              }))
            }
          >
            + Lägg till steg
          </button>
        </div>
      )}

      <div className="recipe-quick-edit__actions">
        <button type="button" className="recipe-quick-edit__cancel" onClick={onCancel}>
          Avbryt
        </button>
        <button type="button" className="recipe-quick-edit__save" onClick={onSave} disabled={isSavingEdit}>
          {isSavingEdit ? 'Sparar…' : 'Spara'}
        </button>
      </div>
    </div>
  );
}
