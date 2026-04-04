'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { PointerSensor, type DragEndEvent, type DragStartEvent, useSensor, useSensors } from '@dnd-kit/core';
import { arrayMove } from '@dnd-kit/sortable';
import { deleteDoc, doc, getDoc, setDoc, writeBatch } from 'firebase/firestore';
import { buildCategoryOptions } from '@/lib/categoryOptions';
import { deriveCategoriesArray } from '@/lib/categories';
import { getFirestoreClient } from '@/lib/firebaseClient';
import { parseRecipe, recipeToJson } from '@/lib/recipes';
import { getRecipePath } from '@/lib/routes';
import { buildEditorSavePayload, isAutoLikeSlug, NEW_RECIPE_SLUG } from '@/lib/recipeWorkflows';
import { useLiveRecipes } from '@/lib/useLiveRecipes';
import type { Recipe } from '@/schema/recipeSchema';
import type { FlatIngredientRow, IngredientGroup } from './types';

interface UseEditorRecipeStateOptions {
  initialJson: string;
}

export function useEditorRecipeState({ initialJson }: UseEditorRecipeStateOptions) {
  const [content, setContent] = useState(initialJson);
  const [errors, setErrors] = useState<string[]>([]);
  const [preview, setPreview] = useState<Recipe | null>(null);
  const [formRecipe, setFormRecipe] = useState<Recipe | null>(null);
  const [saving, setSaving] = useState(false);
  const [status, setStatus] = useState<string | null>(null);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [insertMenu, setInsertMenu] = useState<{ index: number; x: number; y: number } | null>(null);
  const [flatIngredients, setFlatIngredients] = useState<FlatIngredientRow[]>([]);
  const [activeDragId, setActiveDragId] = useState<string | null>(null);
  const [activeDragWidth, setActiveDragWidth] = useState<number | null>(null);
  const [focusIngredientRequest, setFocusIngredientRequest] = useState<{ id: string; selectAll: boolean } | null>(null);
  const formUpdateRef = useRef(false);
  const initialSlugRef = useRef<string | null>(null);
  const initialSlugWasAutoRef = useRef(false);
  const ingredientRefs = useRef<Record<string, HTMLInputElement | null>>({});
  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 5 } }));
  const liveRecipes = useLiveRecipes();
  const categoryOptions = useMemo(() => buildCategoryOptions(liveRecipes), [liveRecipes]);
  const indexById = useMemo(
    () => new Map(flatIngredients.map((item, idx) => [item.id, idx] as const)),
    [flatIngredients],
  );
  const activeDraggedItem = useMemo(
    () => flatIngredients.find((item) => item.id === activeDragId) ?? null,
    [activeDragId, flatIngredients],
  );

  const createPlaceholderRow = (kind: 'ingredient' | 'heading' = 'ingredient'): FlatIngredientRow => ({
    id: crypto.randomUUID(),
    label: '',
    amount: '',
    kind,
    isPlaceholder: true,
  });

  useEffect(() => {
    if (initialSlugRef.current) return;
    const parsed = parseRecipe(initialJson);
    if (parsed.recipe) {
      initialSlugRef.current = parsed.recipe.slug;
      initialSlugWasAutoRef.current =
        parsed.recipe.slug === NEW_RECIPE_SLUG || isAutoLikeSlug(parsed.recipe.slug, parsed.recipe.title);
    }
  }, [initialJson]);

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
    if (focusIngredientRequest) {
      const el = ingredientRefs.current[focusIngredientRequest.id];
      if (el) {
        el.focus();
        if (focusIngredientRequest.selectAll) {
          el.select?.();
        }
      }
      setFocusIngredientRequest(null);
    }
  }, [focusIngredientRequest]);

  useEffect(() => {
    const parsed = parseRecipe(content);
    if (parsed.errors) {
      setErrors(parsed.errors);
      setPreview(null);
      formUpdateRef.current = false;
      return;
    }

    if (!parsed.recipe) {
      return;
    }

    const recipe = parsed.recipe;
    setErrors([]);
    setPreview(recipe);
    setFormRecipe(recipe);

    if (!formUpdateRef.current) {
      const flattened: FlatIngredientRow[] = [];
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
          flattened.push({
            id: `${groupIndex}-${itemIndex}`,
            label: ing.label,
            amount: ing.amount,
            kind: ing.kind ?? 'ingredient',
          });
        });
      });

      setFlatIngredients([...flattened, createPlaceholderRow()]);
    }

    formUpdateRef.current = false;
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

  const rebuildRecipeFromFlat = (list: FlatIngredientRow[], prev: Recipe): Recipe => {
    const persistedRows = list.filter((item) => !item.isPlaceholder);
    const groups = persistedRows.reduce<IngredientGroup[]>((acc, item) => {
      if (item.kind === 'heading') {
        acc.push({ title: item.label || 'Sektion', items: [] });
        return acc;
      }

      if (acc.length === 0) {
        acc.push({ title: 'Huvudingredienser', items: [] });
      }

      acc[acc.length - 1].items.push({ label: item.label, amount: item.amount, kind: item.kind });
      return acc;
    }, []);

    const filteredGroups = groups.filter((group) => group.items.length > 0);
    const safeGroups: IngredientGroup[] =
      filteredGroups.length > 0 ? filteredGroups : [{ title: 'Huvudingredienser', items: [{ label: '', kind: 'ingredient' }] }];
    const normalizedSafeGroups = safeGroups.map((group) => ({
      ...group,
      title: group.title ?? '',
    }));
    const ingredients = normalizedSafeGroups[0]?.items ?? [{ label: '', kind: 'ingredient' }];

    return {
      ...prev,
      ingredients,
      ingredientGroups: normalizedSafeGroups,
    };
  };

  const setFlatAndRecipe = (updater: (prev: FlatIngredientRow[]) => FlatIngredientRow[]) => {
    setFlatIngredients((prevFlat) => {
      const nextFlat = updater(prevFlat);
      updateRecipe((prevRecipe) => rebuildRecipeFromFlat(nextFlat, prevRecipe));
      return nextFlat;
    });
  };

  const insertIngredientAt = (index: number, kind: 'ingredient' | 'heading' = 'ingredient') => {
    setFlatAndRecipe((prev) => {
      const next = prev.filter((item) => !item.isPlaceholder);
      const newId = crypto.randomUUID();
      next.splice(index, 0, { id: newId, label: '', amount: '', kind });
      setFocusIngredientRequest({ id: newId, selectAll: true });
      return [...next, createPlaceholderRow()];
    });
  };

  const updateIngredient = (index: number, field: 'label' | 'amount', value: string) => {
    setFlatAndRecipe((prev) => {
      const next = [...prev];
      const current = next[index];
      const updated = { ...current, [field]: value };

      if (current.isPlaceholder) {
        const hasContent =
          updated.label.trim().length > 0 || (updated.kind !== 'heading' && (updated.amount ?? '').trim().length > 0);

        next[index] = updated;
        if (hasContent) {
          next[index] = { ...updated, isPlaceholder: false };
          next.push(createPlaceholderRow());
          setFocusIngredientRequest({ id: current.id, selectAll: false });
        }
        return next;
      }

      next[index] = updated;
      return next;
    });
  };

  const moveIngredient = (from: number, to: number) => {
    setFlatAndRecipe((prev) => arrayMove(prev, from, to));
  };

  const setIngredientKind = (index: number, kind: 'ingredient' | 'heading') => {
    setFlatAndRecipe((prev) => {
      const next = [...prev];
      next[index] = {
        ...next[index],
        kind,
        amount: kind === 'heading' ? '' : next[index].amount,
      };
      return next;
    });
  };

  const deleteIngredient = (index: number) => {
    setFlatAndRecipe((prev) => {
      const next = [...prev];
      next.splice(index, 1);
      const withoutPlaceholders = next.filter((item) => !item.isPlaceholder);
      return [...withoutPlaceholders, createPlaceholderRow()];
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
      const initialSlug = initialSlugRef.current;
      const { payload, slugChanged, shouldCheckCollision } = buildEditorSavePayload({
        formRecipe,
        initialSlug,
      });

      setContent(recipeToJson(payload));
      const targetRef = doc(db, 'recipes', payload.slug);
      if (shouldCheckCollision) {
        const existing = await getDoc(targetRef);
        const isSameDoc = Boolean(initialSlug && existing.exists() && existing.id === initialSlug);
        if (existing.exists() && !isSameDoc) {
          throw new Error(`Sluggen "${payload.slug}" finns redan. Välj en annan slug.`);
        }
      }

      if (slugChanged && initialSlug) {
        const batch = writeBatch(db);
        batch.set(targetRef, payload);
        batch.delete(doc(db, 'recipes', initialSlug));
        await batch.commit();
      } else {
        await setDoc(targetRef, payload);
      }

      initialSlugRef.current = payload.slug;
      initialSlugWasAutoRef.current = payload.slug === NEW_RECIPE_SLUG || isAutoLikeSlug(payload.slug, payload.title);
      setStatus('Recipe saved to Firebase.');
      if (typeof window !== 'undefined') {
        window.location.replace(getRecipePath(payload.slug));
      }
    } catch (error) {
      setStatus((error as Error).message);
    } finally {
      setSaving(false);
    }
  };

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

  const handleDragStart = (event: DragStartEvent) => {
    const id = event.active.id as string;
    setActiveDragId(id);
    setActiveDragWidth(event.active.rect.current.initial?.width ?? null);
  };

  const handleDragEnd = (event: DragEndEvent) => {
    const over = event.over?.id as string | undefined;
    const activeId = event.active.id as string;
    const activeIndex = indexById.get(activeId);
    const overIndex = over ? indexById.get(over) : null;
    setActiveDragId(null);
    setActiveDragWidth(null);
    if (activeIndex == null || overIndex == null || activeIndex === overIndex) return;
    moveIngredient(activeIndex, overIndex);
  };

  const handleDragCancel = () => {
    setActiveDragId(null);
    setActiveDragWidth(null);
  };

  return {
    activeDragWidth,
    activeDraggedItem,
    addStep,
    categoryOptions,
    content,
    deleteIngredient,
    deleting,
    errors,
    flatIngredients,
    formReady: Boolean(formRecipe),
    formRecipe,
    handleDelete,
    handleDragCancel,
    handleDragEnd,
    handleDragStart,
    insertIngredientAt,
    insertMenu,
    preview,
    removeStep,
    saveDisabled: saving || errors.length > 0,
    saving,
    sensors,
    setContent,
    setIngredientKind,
    setInsertMenu,
    setInputRefForIngredient: (id: string, element: HTMLInputElement | null) => {
      ingredientRefs.current[id] = element;
    },
    setShowDeleteModal,
    showDeleteModal,
    status,
    submit,
    updateIngredient,
    updateRecipe,
    updateStep,
  };
}
