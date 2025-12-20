'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import {
  DndContext,
  PointerSensor,
  closestCenter,
  type DragEndEvent,
  type DragOverEvent,
  type DragStartEvent,
  useSensor,
  useSensors,
} from '@dnd-kit/core';
import { SortableContext, arrayMove, useSortable, verticalListSortingStrategy } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { deleteDoc, doc, setDoc } from 'firebase/firestore';
import { deriveCategoriesArray } from '@/lib/categories';
import { JsonEditor } from '@/components/JsonEditor';
import { RecipePreview } from '@/components/RecipePreview';
import { parseRecipe, recipeToJson } from '@/lib/recipes';
import type { Recipe } from '@/schema/recipeSchema';
import { getFirestoreClient } from '@/lib/firebaseClient';
import { useLiveRecipes } from '@/lib/useLiveRecipes';

interface Props {
  initialJson: string;
  initialTitle: string;
  mode: 'new' | 'edit';
}

interface EditorShellProps extends Props {
  forcedTab?: 'form' | 'json';
}

type IngredientRow = { label: string; amount?: string; kind: 'ingredient' | 'heading' };
type IngredientGroup = { title?: string; items: IngredientRow[] };

export function EditorShell({ initialJson, initialTitle, mode: _mode, forcedTab }: EditorShellProps) {
  const [content, setContent] = useState(initialJson);
  const [errors, setErrors] = useState<string[]>([]);
  const [preview, setPreview] = useState<Recipe | null>(null);
  const [formRecipe, setFormRecipe] = useState<Recipe | null>(null);
  const [saving, setSaving] = useState(false);
  const [status, setStatus] = useState<string | null>(null);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [insertMenu, setInsertMenu] = useState<{ index: number; x: number; y: number } | null>(null);
  const [flatIngredients, setFlatIngredients] = useState<Array<{ id: string; label: string; amount?: string; kind: 'ingredient' | 'heading' }>>([]);
  const [activeDragId, setActiveDragId] = useState<string | null>(null);
  const [overId, setOverId] = useState<string | null>(null);
  const [dropIndicatorIndex, setDropIndicatorIndex] = useState<number | null>(null);
  const [focusIngredientId, setFocusIngredientId] = useState<string | null>(null);
  const [justDroppedId, setJustDroppedId] = useState<string | null>(null);
  const view: 'form' | 'json' = forcedTab ?? 'form';
  const formUpdateRef = useRef(false);
  const ingredientRefs = useRef<Record<string, HTMLInputElement | null>>({});
  const dropFlashTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 5 } }));
  const liveRecipes = useLiveRecipes();

  const categoryOptions = useMemo(() => {
    const place = new Set<string>();
    const base = new Set<string>();
    const type = new Set<string>();
    liveRecipes.forEach((recipe) => {
      const p = recipe.categoryPlace?.trim();
      const b = recipe.categoryBase?.trim();
      const t = recipe.categoryType?.trim();
      if (p) place.add(p);
      if (b) base.add(b);
      if (t) type.add(t);
    });
    const sortFn = (a: string, b: string) => a.localeCompare(b, 'sv');
    return {
      place: Array.from(place).sort(sortFn),
      base: Array.from(base).sort(sortFn),
      type: Array.from(type).sort(sortFn),
    };
  }, [liveRecipes]);

  const indexById = useMemo(
    () => new Map(flatIngredients.map((item, idx) => [item.id, idx] as const)),
    [flatIngredients],
  );

  useEffect(() => {
    if (!insertMenu) return;
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as HTMLElement | null;
      if (!target) return;
      const inMenu = target.closest('.insert-menu');
      const inTrigger = target.closest('.ingredient-insert__trigger');
      if (!inMenu && !inTrigger) {
        setInsertMenu(null);
      }
    };
    document.addEventListener('click', handleClickOutside);
    return () => document.removeEventListener('click', handleClickOutside);
  }, [insertMenu]);

  useEffect(() => {
    if (focusIngredientId) {
      const el = ingredientRefs.current[focusIngredientId];
      if (el) {
        el.focus();
        el.select?.();
      }
      setFocusIngredientId(null);
    }
  }, [focusIngredientId]);

  useEffect(() => {
    return () => {
      if (dropFlashTimer.current) {
        clearTimeout(dropFlashTimer.current);
      }
    };
  }, []);

  useEffect(() => {
    const parsed = parseRecipe(content);
    if (parsed.errors) {
      setErrors(parsed.errors);
      setPreview(null);
      formUpdateRef.current = false;
      return;
    } else if (parsed.recipe) {
      const recipe = parsed.recipe;
      setErrors([]);
      setPreview(recipe);
      setFormRecipe(recipe);

      if (!formUpdateRef.current) {
        const flattened: Array<{ id: string; label: string; amount?: string; kind: 'ingredient' | 'heading' }> = [];

        const groupsToFlatten =
          recipe.ingredientGroups && recipe.ingredientGroups.length > 0
            ? recipe.ingredientGroups
            : [{ title: 'Huvudingredienser', items: recipe.ingredients ?? [] }];

        groupsToFlatten.forEach((group, groupIndex) => {
          const isDefaultFirst = groupIndex === 0 && (group.title ?? 'Huvudingredienser') === 'Huvudingredienser';
          if (group.title && !isDefaultFirst) {
            flattened.push({ id: `${groupIndex}-heading`, label: group.title, kind: 'heading' });
          }
          (group.items ?? []).forEach((ing, itemIndex) => {
            const stableId = `${groupIndex}-${itemIndex}`;
            flattened.push({ id: stableId, label: ing.label, amount: ing.amount, kind: ing.kind ?? 'ingredient' });
          });
        });

        setFlatIngredients(flattened.length > 0 ? flattened : [{ id: crypto.randomUUID(), label: '', amount: '', kind: 'ingredient' }]);
      }
      formUpdateRef.current = false;
    }
  }, [content]);

  const stripNotes = (recipe: Recipe): Recipe => ({
    ...recipe,
    ingredients: (recipe.ingredients ?? []).map(({ label, amount, kind }) =>
      amount && amount.length > 0 ? { label, amount, kind } : { label, kind },
    ),
    ingredientGroups: recipe.ingredientGroups?.map((group) => ({
      ...group,
      items:
        group.items?.map(({ label, amount, kind }) =>
          amount && amount.length > 0 ? { label, amount, kind } : { label, kind },
        ) ?? [],
    })),
  });

  const updateRecipe = (updater: (prev: Recipe) => Recipe) => {
    formUpdateRef.current = true;
    setFormRecipe((prev) => {
      if (!prev) return prev;
      const next = stripNotes(updater(prev));
      const normalized: Recipe = { ...next, categories: deriveCategoriesArray(next) };
      setContent(recipeToJson(normalized));
      return normalized;
    });
  };

  const rebuildRecipeFromFlat = (list: typeof flatIngredients, prev: Recipe): Recipe => {
    const groups = list.reduce<IngredientGroup[]>((acc, item) => {
      if (item.kind === 'heading') {
        acc.push({ title: item.label || 'Sektion', items: [] });
        return acc;
      }

      if (acc.length === 0) {
        acc.push({ title: 'Huvudingredienser', items: [] });
      }

      const current = acc[acc.length - 1];
      current.items.push({ label: item.label, amount: item.amount, kind: item.kind });
      return acc;
    }, []);

    const filteredGroups = groups.filter((group) => group.items.length > 0);
    const safeGroups: IngredientGroup[] =
      filteredGroups.length > 0 ? filteredGroups : [{ title: 'Huvudingredienser', items: [{ label: '', kind: 'ingredient' }] }];
    const ingredients = safeGroups[0]?.items ?? [{ label: '', kind: 'ingredient' }];

    return {
      ...prev,
      ingredients,
      ingredientGroups: safeGroups,
    };
  };

  const setFlatAndRecipe = (updater: (prev: typeof flatIngredients) => typeof flatIngredients) => {
    setFlatIngredients((prevFlat) => {
      const nextFlat = updater(prevFlat);
      updateRecipe((prevRecipe) => rebuildRecipeFromFlat(nextFlat, prevRecipe));
      return nextFlat;
    });
  };

  const insertIngredientAt = (index: number, kind: 'ingredient' | 'heading' = 'ingredient') => {
    setFlatAndRecipe((prev) => {
      const next = [...prev];
      const newId = crypto.randomUUID();
      next.splice(index, 0, { id: newId, label: '', amount: '', kind });
      setFocusIngredientId(newId);
      return next;
    });
  };

  const updateIngredient = (index: number, field: 'label' | 'amount', value: string) => {
    setFlatAndRecipe((prev) => {
      const next = [...prev];
      next[index] = { ...next[index], [field]: value };
      return next;
    });
  };

  const moveIngredient = (from: number, to: number) => {
    setFlatAndRecipe((prev) => {
      const next = arrayMove(prev, from, to);
      const item = next[to];
      if (dropFlashTimer.current) {
        clearTimeout(dropFlashTimer.current);
      }
      setJustDroppedId(item?.id);
      dropFlashTimer.current = setTimeout(() => setJustDroppedId(null), 900);

      return next;
    });
  };

  const addStep = () => {
    updateRecipe((prev) => ({
      ...prev,
      steps: [...(prev.steps ?? []), { title: '', body: 'Skriv här...' }],
    }));
  };

  const updateStep = (index: number, field: 'title' | 'body', value: string) => {
    updateRecipe((prev) => {
      const steps = [...(prev.steps ?? [])];
      steps[index] = { ...steps[index], [field]: value };
      return { ...prev, steps };
    });
  };

  const removeStep = (index: number) => {
    updateRecipe((prev) => {
      const steps = [...(prev.steps ?? [])];
      steps.splice(index, 1);
      return { ...prev, steps };
    });
  };

  const submit = async () => {
    setSaving(true);
    setStatus(null);
    try {
      if (!formRecipe) {
        throw new Error('Fix validation errors before saving.');
      }
      const db = getFirestoreClient();
      const now = new Date().toISOString();
      const payload: Recipe = {
        ...formRecipe,
        categories: deriveCategoriesArray(formRecipe),
        createdAt: formRecipe.createdAt ?? now,
        updatedAt: now,
      };
      setContent(recipeToJson(payload));
      await setDoc(doc(db, 'recipes', payload.slug), payload);
      setStatus('Recipe saved to Firebase.');
    } catch (error) {
      setStatus((error as Error).message);
    } finally {
      setSaving(false);
    }
  };

  const saveDisabled = saving || errors.length > 0;
  const formReady = Boolean(formRecipe);

  const handleDelete = async () => {
    if (!formRecipe) return;
    setDeleting(true);
    setStatus(null);
    try {
      const db = getFirestoreClient();
      await deleteDoc(doc(db, 'recipes', formRecipe.slug));
      setStatus('Receptet har raderats.');
      setShowDeleteModal(false);
    } catch (error) {
      setStatus((error as Error).message);
    } finally {
      setDeleting(false);
    }
  };

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
      // Bevara segment även om de är tomma så användaren kan skriva i dem
      const normalized = segments.map((seg) => ({ text: seg.text, size: seg.size }));
      const titleFromSegments = normalized
        .map((seg) => seg.text.trim())
        .filter((txt) => txt.length > 0)
        .join(' ')
        .trim();
      const title = titleFromSegments || 'Ny rätt';
      updateRecipe((prev) => ({
        ...prev,
        title,
        titlePrefix: '',
        titleSuffix: '',
        titleSegments: normalized.length > 0 ? normalized : [{ text: title, size: 'big' }],
      }));
    };

    const handleTextChange = (index: number, text: string) => {
      const next = [...fallbackSegments];
      next[index] = { ...next[index], text };
      setSegments(next);
    };

    const handleSizeToggle = (index: number) => {
      const next = [...fallbackSegments];
      const nextSize = next[index].size === 'big' ? 'small' : 'big';
      next[index] = { ...next[index], size: nextSize };
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
      <div className="stack">
        <span className="text-sm text-muted">Titel (bygg valfria stora/små delar)</span>
        <div className="title-composer title-composer--segments">
          <div className="title-composer__segments">
            {fallbackSegments.map((segment, idx) => (
              <div key={idx} className="title-segment-row">
                <input
                  className="input title-segment-row__input"
                  value={segment.text}
                  onChange={(e) => handleTextChange(idx, e.target.value)}
                />
                <div className="title-segment-row__actions">
                  <button
                    type="button"
                    className={segment.size === 'big' ? 'title-size-pill is-big' : 'title-size-pill'}
                    aria-label={segment.size === 'big' ? 'Stor del' : 'Liten del'}
                    onClick={() => handleSizeToggle(idx)}
                  >
                    {segment.size === 'big' ? 'Stor' : 'Liten'}
                  </button>
                  {fallbackSegments.length > 1 && (
                    <button
                      type="button"
                      className="chip-button chip-button--icon chip-button--danger"
                      aria-label="Ta bort"
                      onClick={() => handleRemove(idx)}
                    >
                      <i className="fa-solid fa-trash-can" aria-hidden="true"></i>
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
          <div className="title-composer__toolbar">
            <button type="button" className="chip-button" onClick={handleAdd}>
              +
            </button>
            <span className="text-sm text-muted">Titel byggs av alla delar i ordning. Stor/liten visas per segment.</span>
          </div>
          <div className="title-composer__preview">
            <span className="text-sm text-muted">Förhandsvisning:</span>{' '}
            <strong>{fallbackSegments.map((seg) => seg.text).join(' ') || 'Ny rätt'}</strong>
          </div>
        </div>
      </div>
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
        <button type="button" onClick={() => handleAdd('ingredient')}>+ Ingrediens</button>
        <button type="button" onClick={() => handleAdd('heading')}>+ Rubrik</button>
        <button type="button" className="insert-menu__close" onClick={close} aria-label="Stäng">×</button>
      </div>
    );
  };

  const renderForm = () => {
    if (!formRecipe) return null;
    return (
      <div className="workspace-grid">
        <article className="workspace-card stack">
          <h3>Grunddata &amp; kategorier</h3>
          {renderTitleComposer()}
          <label className="stack">
            <span className="text-sm text-muted">Bild-URL</span>
            <input
              className="input"
              type="url"
              placeholder="https://example.com/bild.jpg"
              value={formRecipe.imageUrl ?? ''}
              onChange={(e) => updateRecipe((prev) => ({ ...prev, imageUrl: e.target.value }))}
            />
          </label>
          <div className="two-col" />
          <div className="stack" style={{ gap: '0.5rem' }}>
            <p className="text-sm text-muted" style={{ marginBottom: '-0.25rem' }}>
              Kategorier
            </p>
            <div className="three-col">
              <label className="stack">
                <span className="text-sm text-muted">Plats</span>
                <input
                  className="input"
                  list="category-place-options"
                  value={formRecipe.categoryPlace ?? ''}
                  onChange={(e) => updateRecipe((prev) => ({ ...prev, categoryPlace: e.target.value }))}
                />
              </label>
              <label className="stack">
                <span className="text-sm text-muted">Basvara</span>
                <input
                  className="input"
                  list="category-base-options"
                  value={formRecipe.categoryBase ?? ''}
                  onChange={(e) => updateRecipe((prev) => ({ ...prev, categoryBase: e.target.value }))}
                />
              </label>
              <label className="stack">
                <span className="text-sm text-muted">Typ</span>
                <input
                  className="input"
                  list="category-type-options"
                  value={formRecipe.categoryType ?? ''}
                  onChange={(e) => updateRecipe((prev) => ({ ...prev, categoryType: e.target.value }))}
                />
              </label>
            </div>
          </div>
        </article>

        <article className="workspace-card stack">
          <div className="flex" style={{ justifyContent: 'space-between', alignItems: 'center', gap: '0.5rem' }}>
            <h3 style={{ margin: 0 }}>Ingredienser</h3>
            <button type="button" className="button-secondary" onClick={() => insertIngredientAt(flatIngredients.length, 'ingredient')}>
              + Ny ingrediens
            </button>
          </div>
          <DndContext
            sensors={sensors}
            collisionDetection={closestCenter}
            onDragStart={(event: DragStartEvent) => {
              const id = event.active.id as string;
              setActiveDragId(id);
              setOverId(id);
              const currentIndex = indexById.get(id);
              setDropIndicatorIndex(currentIndex ?? null);
            }}
            onDragOver={(event: DragOverEvent) => {
              const over = event.over?.id as string | undefined;
              if (!over) {
                setOverId(null);
                setDropIndicatorIndex(null);
                return;
              }
              setOverId(over);
              const activeId = event.active.id as string;
              const activeIndex = indexById.get(activeId);
              const overIndex = indexById.get(over);
              if (activeIndex == null || overIndex == null) {
                setDropIndicatorIndex(null);
                return;
              }
              const insertionIndex = activeIndex < overIndex ? overIndex + 1 : overIndex;
              setDropIndicatorIndex(insertionIndex);
            }}
            onDragEnd={(event: DragEndEvent) => {
              const over = event.over?.id as string | undefined;
              const activeId = event.active.id as string;
              const activeIndex = indexById.get(activeId);
              const overIndex = over ? indexById.get(over) : null;
              setActiveDragId(null);
              setOverId(null);
              setDropIndicatorIndex(null);
              if (activeIndex == null || overIndex == null || activeIndex === overIndex) return;
              const targetIndex = activeIndex < overIndex ? overIndex : overIndex;
              moveIngredient(activeIndex, targetIndex);
            }}
            onDragCancel={() => {
              setActiveDragId(null);
              setOverId(null);
              setDropIndicatorIndex(null);
            }}
          >
            <SortableContext items={flatIngredients.map((i) => i.id)} strategy={verticalListSortingStrategy}>
              <div className="stack" style={{ gap: 0 }}>
                {flatIngredients.map((item, index) => (
                  <SortableIngredientRow
                    key={item.id}
                    item={item}
                    index={index}
                    dropIndicatorIndex={dropIndicatorIndex}
                    justDroppedId={justDroppedId}
                    overId={overId}
                    onUpdateIngredient={updateIngredient}
                    onToggleKind={() =>
                      setFlatAndRecipe((prev) => {
                        const next = [...prev];
                        const nextKind = next[index].kind === 'heading' ? 'ingredient' : 'heading';
                        next[index] = { ...next[index], kind: nextKind, amount: nextKind === 'heading' ? '' : next[index].amount };
                        return next;
                      })
                    }
                    onDelete={() =>
                      setFlatAndRecipe((prev) => {
                        const next = [...prev];
                        next.splice(index, 1);
                        return next.length > 0 ? next : [{ id: crypto.randomUUID(), label: '', amount: '', kind: 'ingredient' }];
                      })
                    }
                    setInputRef={(el) => {
                      ingredientRefs.current[item.id] = el;
                    }}
                  />
                ))}
                {dropIndicatorIndex === flatIngredients.length && activeDragId && (
                  <div className="ingredient-drop-indicator" aria-hidden="true" />
                )}
              </div>
            </SortableContext>
          </DndContext>
        </article>

        <article className="workspace-card stack">
          <div className="flex" style={{ justifyContent: 'space-between', alignItems: 'center', gap: '1rem' }}>
            <h3>Gör så här</h3>
            <button type="button" className="button-primary" onClick={addStep}>
              Lägg till steg
            </button>
          </div>
          <div className="stack" style={{ gap: '1rem' }}>
            {(formRecipe.steps ?? []).map((step, index) => (
              <div key={index} className="stack" style={{ border: '1px solid #e5e7eb', borderRadius: '16px', padding: '1rem' }}>
                <div className="flex" style={{ justifyContent: 'space-between', alignItems: 'center', gap: '0.5rem' }}>
                  <span className="text-sm text-muted">Steg {index + 1}</span>
                  <button
                    type="button"
                    className="button-ghost"
                    onClick={() => removeStep(index)}
                    aria-label={`Ta bort steg ${index + 1}`}
                    style={{ padding: '0.35rem 0.6rem', color: '#b91c1c' }}
                  >
                    <i className="fa-solid fa-trash-can" aria-hidden="true" /> Ta bort
                  </button>
                </div>
                <label className="stack">
                  <span className="text-sm text-muted">Stegrubrik (valfri)</span>
                  <input className="input" value={step.title ?? ''} onChange={(e) => updateStep(index, 'title', e.target.value)} />
                </label>
                <label className="stack">
                  <span className="text-sm text-muted">Instruktion</span>
                  <textarea
                    className="input"
                    rows={3}
                    value={step.body}
                    onChange={(e) => updateStep(index, 'body', e.target.value)}
                  />
                </label>
              </div>
            ))}
          </div>
        </article>
        <datalist id="category-place-options">
          {categoryOptions.place.map((opt) => (
            <option key={opt} value={opt} />
          ))}
        </datalist>
        <datalist id="category-base-options">
          {categoryOptions.base.map((opt) => (
            <option key={opt} value={opt} />
          ))}
        </datalist>
        <datalist id="category-type-options">
          {categoryOptions.type.map((opt) => (
            <option key={opt} value={opt} />
          ))}
        </datalist>
      </div>
    );
  };

  return (
      <div className="preview-grid">
        <div className="preview-grid__left">
        <div className="preview-grid__copy">
          <p className="eyebrow">Redigera</p>
          <h2>Arbeta i formulär eller JSON – allt synkas med mobilen till höger.</h2>
        </div>
        <div className="preview-grid__editor">
          {view === 'form' && formReady && (
            <div className="stack preview-form-stack">
              {renderForm()}
            </div>
          )}
          {view === 'json' && (
            <div className="preview-grid__json">
              <JsonEditor value={content} onChange={setContent} errors={errors} />
            </div>
          )}
          {!formReady && errors.length > 0 && (
            <div className="alert error" style={{ marginTop: '1rem' }}>
              Ogiltig JSON: {errors.join('; ')}
            </div>
          )}
        </div>
      </div>
        <div className="preview-grid__right">
          <button className="button-primary button-hero preview-grid__save" onClick={submit} disabled={saveDisabled}>
            {saving ? 'Sparar…' : 'Spara recept'}
          </button>
          {formReady && (
            <button
              type="button"
              className="text-link text-danger preview-grid__delete"
              onClick={() => setShowDeleteModal(true)}
            >
              <i className="fa-solid fa-trash-can" aria-hidden="true" /> Radera recept
            </button>
          )}
          {status && (
            <div className="text-sm text-muted" style={{ marginTop: '-0.35rem' }}>
              {status}
            </div>
          )}
        <div className="preview-grid__device">
          {preview ? (
            <div className="phone-preview">
              <div className="phone-preview__frame">
                <RecipePreview recipe={preview} />
              </div>
            </div>
          ) : (
            <div className="alert error" style={{ width: '100%' }}>
              Invalid JSON
            </div>
          )}
        </div>
      </div>
      {showDeleteModal && formRecipe && (
        <div className="modal-backdrop" role="dialog" aria-modal="true" aria-labelledby="delete-modal-title">
          <div className="modal">
            <h4 id="delete-modal-title">Radera recept</h4>
            <p>Detta kommer att radera &quot;{formRecipe.title}&quot;. Är du säker?</p>
            <div className="modal__actions">
              <button type="button" className="button-secondary" onClick={() => setShowDeleteModal(false)}>
                Avbryt
              </button>
              <button
                type="button"
                className="button-danger"
                onClick={handleDelete}
                disabled={deleting}
              >
                {deleting ? 'Raderar…' : 'Radera'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

type SortableIngredientRowProps = {
  item: { id: string; label: string; amount?: string; kind: 'ingredient' | 'heading' };
  index: number;
  dropIndicatorIndex: number | null;
  overId: string | null;
  justDroppedId: string | null;
  onUpdateIngredient: (index: number, field: 'label' | 'amount', value: string) => void;
  onToggleKind: () => void;
  onDelete: () => void;
  setInputRef: (el: HTMLInputElement | null) => void;
};

function SortableIngredientRow({
  item,
  index,
  dropIndicatorIndex,
  overId,
  justDroppedId,
  onUpdateIngredient,
  onToggleKind,
  onDelete,
  setInputRef,
}: SortableIngredientRowProps) {
  const { attributes, listeners, setActivatorNodeRef, setNodeRef, transform, transition, isOver, isDragging } = useSortable({
    id: item.id,
    animateLayoutChanges: () => false,
  });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  const showDropIndicatorBefore = dropIndicatorIndex === index;
  const rowClass = [
    'ingredient-row',
    item.kind === 'heading' ? 'ingredient-row--heading' : 'ingredient-row--item',
    isOver ? 'ingredient-row--dragover' : '',
    isDragging ? 'ingredient-row--dragging' : '',
    justDroppedId === item.id ? 'ingredient-row--dropped' : '',
  ]
    .filter(Boolean)
    .join(' ');

  return (
    <>
      {showDropIndicatorBefore && <div className="ingredient-drop-indicator" aria-hidden="true" />}
      <div ref={setNodeRef} className={rowClass} style={style} data-over={overId === item.id}>
        <div className="ingredient-row__grid">
          <button
            type="button"
            className="ingredient-drag"
            ref={setActivatorNodeRef}
            {...listeners}
            {...attributes}
            aria-label="Dra för att flytta"
          >
            <i className="fa-solid fa-grip-vertical" aria-hidden="true"></i>
          </button>
          <input
            className={
              item.kind === 'heading'
                ? 'input ingredient-row__name ingredient-row__name--heading'
                : 'input ingredient-row__name'
            }
            ref={setInputRef}
            value={item.label}
            onChange={(e) => onUpdateIngredient(index, 'label', e.target.value)}
            placeholder={item.kind === 'heading' ? 'Rubrik' : 't.ex. Smör'}
          />
          {item.kind !== 'heading' && (
            <input
              className="input ingredient-row__amount"
              value={item.amount ?? ''}
              onChange={(e) => onUpdateIngredient(index, 'amount', e.target.value)}
              placeholder="1 dl"
            />
          )}
          <button
            type="button"
            className="ingredient-kind-toggle"
            aria-label={item.kind === 'heading' ? 'Gör till ingrediens' : 'Gör till rubrik'}
            onClick={onToggleKind}
          >
            <i className={item.kind === 'heading' ? 'fa-solid fa-heading' : 'fa-solid fa-list-ul'} aria-hidden="true"></i>
          </button>
          <button
            type="button"
            className="chip-button chip-button--icon chip-button--danger"
            aria-label="Ta bort"
            onClick={onDelete}
            disabled={item.kind === 'heading'}
          >
            <i className="fa-solid fa-trash-can" aria-hidden="true"></i>
          </button>
        </div>
      </div>
    </>
  );
}
