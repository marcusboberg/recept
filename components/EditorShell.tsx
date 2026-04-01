'use client';

import { useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import {
  ActionIcon,
  Alert,
  Button,
  Group,
  Modal,
  Paper,
  SegmentedControl,
  Stack,
  Text,
  TextInput,
  Textarea,
  Title,
} from '@mantine/core';
import {
  DndContext,
  DragOverlay,
  PointerSensor,
  closestCenter,
  type DragEndEvent,
  type DragStartEvent,
  useSensor,
  useSensors,
} from '@dnd-kit/core';
import { restrictToParentElement, restrictToVerticalAxis } from '@dnd-kit/modifiers';
import { SortableContext, arrayMove, useSortable, verticalListSortingStrategy } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { deleteDoc, doc, getDoc, setDoc, writeBatch } from 'firebase/firestore';
import { deriveCategoriesArray } from '@/lib/categories';
import { JsonEditor } from '@/components/JsonEditor';
import { RecipePreview } from '@/components/RecipePreview';
import { StudioCategoryField } from '@/components/StudioCategoryField';
import { parseRecipe, recipeToJson } from '@/lib/recipes';
import type { Recipe } from '@/schema/recipeSchema';
import { getFirestoreClient } from '@/lib/firebaseClient';
import { useLiveRecipes } from '@/lib/useLiveRecipes';

const NEW_RECIPE_SLUG = 'new-recipe-slug';

function toRecipeSlug(value: string): string {
  const transliterated = value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[åä]/gi, 'a')
    .replace(/ö/gi, 'o');

  return transliterated
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, '')
    .trim()
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-+|-+$/g, '');
}

function toLegacyAutoSlug(value: string): string {
  return value
    .replace(/\s+/g, ' ')
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, '')
    .trim()
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-+|-+$/g, '');
}

function slugCandidatesFromTitle(title: string): Set<string> {
  const primary = toRecipeSlug(title);
  const legacy = toLegacyAutoSlug(title);
  const compact = [primary, legacy].map((value) => value.replace(/-/g, ''));
  return new Set([primary, legacy, ...compact].filter(Boolean));
}

function isAutoLikeSlug(slug: string, title: string): boolean {
  if (!slug || !title) return false;
  return slugCandidatesFromTitle(title).has(slug);
}

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
type FlatIngredientRow = { id: string; label: string; amount?: string; kind: 'ingredient' | 'heading' };
const editorSegmentedClassNames = {
  root: 'studio-segmented-root',
  indicator: 'studio-segmented-indicator',
  label: 'studio-segmented-label',
  innerLabel: 'studio-segmented-inner-label',
} as const;

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

export function EditorShell({ initialJson, initialTitle, mode, forcedTab }: EditorShellProps) {
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
  const [focusIngredientId, setFocusIngredientId] = useState<string | null>(null);
  const view: 'form' | 'json' = forcedTab ?? 'form';
  const formUpdateRef = useRef(false);
  const initialSlugRef = useRef<string | null>(null);
  const initialSlugWasAutoRef = useRef(false);
  const ingredientRefs = useRef<Record<string, HTMLInputElement | null>>({});
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
  const activeDraggedItem = useMemo(
    () => flatIngredients.find((item) => item.id === activeDragId) ?? null,
    [activeDragId, flatIngredients],
  );

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
      return arrayMove(prev, from, to);
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
      const draftPayload: Recipe = {
        ...formRecipe,
        categories: deriveCategoriesArray(formRecipe),
        createdAt: formRecipe.createdAt ?? now,
        updatedAt: now,
      };
      if (draftPayload.slug === NEW_RECIPE_SLUG) {
        const fallbackSlug = toRecipeSlug(draftPayload.title);
        if (!fallbackSlug) {
          throw new Error('Kunde inte skapa slug från titel. Ange en giltig titel/slugg manuellt.');
        }
        draftPayload.slug = fallbackSlug;
      }
      const initialSlug = initialSlugRef.current;
      const slugChanged = Boolean(initialSlug && initialSlug !== draftPayload.slug && initialSlug !== NEW_RECIPE_SLUG);
      if (slugChanged && initialSlug) {
        const nextHistory = new Set(draftPayload.slugHistory ?? []);
        nextHistory.add(initialSlug);
        nextHistory.delete(draftPayload.slug);
        nextHistory.delete(NEW_RECIPE_SLUG);
        draftPayload.slugHistory = Array.from(nextHistory);
      }
      const payload = JSON.parse(recipeToJson(draftPayload)) as Recipe;
      setContent(recipeToJson(payload));
      const targetRef = doc(db, 'recipes', payload.slug);
      const isCreateLike = !initialSlug || initialSlug === NEW_RECIPE_SLUG;
      const shouldCheckCollision = isCreateLike || slugChanged;
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
        window.location.hash = `#/recipe/${payload.slug}`;
      }
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
      updateRecipe((prev) => {
        const next: Recipe = {
          ...prev,
          title,
          titlePrefix: '',
          titleSuffix: '',
          titleSegments: normalized.length > 0 ? normalized : [{ text: title, size: 'big' }],
        };

        const prevAutoSlug = isAutoLikeSlug(prev.slug, prev.title);
        const initialAutoSlug = initialSlugRef.current;
        const shouldAutoSlug =
          prev.slug === NEW_RECIPE_SLUG ||
          prevAutoSlug ||
          (initialSlugWasAutoRef.current && initialAutoSlug ? prev.slug === initialAutoSlug : false);

        if (shouldAutoSlug) {
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
            {fallbackSegments.map((segment, idx) => (
              <Group key={idx} className="title-segment-row" align="flex-start" wrap="nowrap">
                <TextInput
                  className="title-segment-row__input"
                  value={segment.text}
                  onChange={(event) => handleTextChange(idx, event.currentTarget.value)}
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
                    onClick={() => handleSizeToggle(idx)}
                    styles={{ root: { minWidth: 76 }, label: { fontWeight: 700 } }}
                  >
                    {segment.size === 'big' ? 'Stor' : 'Liten'}
                  </Button>
                  {fallbackSegments.length > 1 && (
                    <ActionIcon
                      type="button"
                      variant="subtle"
                      color="red"
                      radius="xl"
                      aria-label="Ta bort"
                      onClick={() => handleRemove(idx)}
                    >
                      <i className="fa-solid fa-trash-can" aria-hidden="true"></i>
                    </ActionIcon>
                  )}
                </Group>
              </Group>
            ))}
          </Stack>
          <Group justify="space-between" align="center" mt="sm" className="title-composer__toolbar">
            <Button
              type="button"
              className="title-composer__add-button"
              variant="light"
              color="studioBlue"
              radius="xl"
              onClick={handleAdd}
            >
              + Lägg till del
            </Button>
          </Group>
          <Text size="sm" mt="sm" className="title-composer__preview">
            <Text component="span" c="dimmed" inherit>
              Förhandsvisning:
            </Text>{' '}
            <Text component="strong" inherit>
              {fallbackSegments.map((seg) => seg.text).join(' ') || 'Ny rätt'}
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
        <Paper className="workspace-card stack" withBorder radius="xl" p="xl" shadow="sm">
          <Stack gap="lg">
            <div>
              <Title order={3}>Grunddata &amp; kategorier</Title>
            </div>
            <div className="editor-meta">
              {renderTitleComposer()}
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
                    onChange={(value) => updateRecipe((prev) => ({ ...prev, categoryBase: value }))}
                  />
                  <StudioCategoryField
                    label="Typ"
                    value={formRecipe.categoryType ?? ''}
                    options={categoryOptions.type}
                    onChange={(value) => updateRecipe((prev) => ({ ...prev, categoryType: value }))}
                  />
                </div>
                <SegmentedControl
                  aria-label="Markera som drink"
                  value={formRecipe.isDrink ? 'drink' : 'mat'}
                  onChange={(value) => updateRecipe((prev) => ({ ...prev, isDrink: value === 'drink' }))}
                  data={[
                    { label: 'Mat', value: 'mat' },
                    { label: 'Drink', value: 'drink' },
                  ]}
                  radius="xl"
                  color="studioBlue"
                  classNames={editorSegmentedClassNames}
                  fullWidth
                />
              </Stack>
            </div>
          </Stack>
        </Paper>

        <Paper className="workspace-card stack" withBorder radius="xl" p="xl" shadow="sm">
          <Stack gap="lg">
            <Group justify="space-between" align="center" gap="sm">
              <Title order={3}>Ingredienser</Title>
              <Button type="button" color="studioBlue" radius="xl" onClick={() => insertIngredientAt(flatIngredients.length, 'ingredient')}>
              <i className="fa-solid fa-plus" aria-hidden="true" style={{ marginRight: '0.4rem' }} />
              Ingrediens
              </Button>
            </Group>
          <DndContext
            sensors={sensors}
            collisionDetection={closestCenter}
            modifiers={[restrictToVerticalAxis, restrictToParentElement]}
            onDragStart={(event: DragStartEvent) => {
              const id = event.active.id as string;
              setActiveDragId(id);
              setActiveDragWidth(event.active.rect.current.initial?.width ?? null);
            }}
            onDragEnd={(event: DragEndEvent) => {
              const over = event.over?.id as string | undefined;
              const activeId = event.active.id as string;
              const activeIndex = indexById.get(activeId);
              const overIndex = over ? indexById.get(over) : null;
              setActiveDragId(null);
              setActiveDragWidth(null);
              if (activeIndex == null || overIndex == null || activeIndex === overIndex) return;
              moveIngredient(activeIndex, overIndex);
            }}
            onDragCancel={() => {
              setActiveDragId(null);
              setActiveDragWidth(null);
            }}
          >
            <SortableContext items={flatIngredients.map((i) => i.id)} strategy={verticalListSortingStrategy}>
              <div className="stack" style={{ gap: 0 }}>
                {flatIngredients.map((item, index) => (
                  <SortableIngredientRow
                    key={item.id}
                    item={item}
                    index={index}
                    onUpdateIngredient={updateIngredient}
                    onSetKind={(kind) =>
                      setFlatAndRecipe((prev) => {
                        const next = [...prev];
                        next[index] = {
                          ...next[index],
                          kind,
                          amount: kind === 'heading' ? '' : next[index].amount,
                        };
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

        <Paper className="workspace-card stack" withBorder radius="xl" p="xl" shadow="sm">
          <Stack gap="lg">
            <Group justify="space-between" align="center" gap="md">
              <Title order={3}>Gör så här</Title>
              <Button type="button" color="studioBlue" radius="xl" onClick={addStep}>
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
            <Alert color="red" variant="light" mt="md">
              Ogiltig JSON: {errors.join('; ')}
            </Alert>
          )}
        </div>
      </div>
      <div className="preview-grid__right">
        <Button className="preview-grid__save" color="studioBlue" radius="xl" size="lg" onClick={submit} disabled={saveDisabled} loading={saving}>
            {saving ? 'Sparar…' : 'Spara recept'}
        </Button>
        {formReady && (
          <Button type="button" variant="subtle" color="red" className="preview-grid__delete" onClick={() => setShowDeleteModal(true)}>
              <i className="fa-solid fa-trash-can" aria-hidden="true" /> Radera recept
          </Button>
        )}
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
      </div>
      <Modal
        opened={showDeleteModal && Boolean(formRecipe)}
        onClose={() => setShowDeleteModal(false)}
        title="Radera recept"
        centered
        radius="xl"
      >
        {formRecipe && (
          <Stack gap="md">
            <Text>
              Detta kommer att radera &quot;{formRecipe.title}&quot;. Är du säker?
            </Text>
            <Group justify="flex-end">
              <Button type="button" variant="default" onClick={() => setShowDeleteModal(false)}>
                Avbryt
              </Button>
              <Button type="button" color="red" onClick={handleDelete} loading={deleting}>
                {deleting ? 'Raderar…' : 'Radera'}
              </Button>
            </Group>
          </Stack>
        )}
      </Modal>
    </div>
  );
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
              : 'ingredient-row__name',
        }}
        ref={setInputRef}
        value={item.label}
        onChange={(event) => onUpdateIngredient(index, 'label', event.currentTarget.value)}
        placeholder={item.kind === 'heading' ? 'Rubrik' : 't.ex. Smör'}
        variant="default"
        radius="md"
        size="md"
        readOnly={readOnly}
      />
      {item.kind !== 'heading' && (
        <TextInput
          classNames={{ input: 'ingredient-row__amount' }}
          value={item.amount ?? ''}
          onChange={(event) => onUpdateIngredient(index, 'amount', event.currentTarget.value)}
          placeholder="1 dl"
          variant="filled"
          radius="md"
          size="md"
          readOnly={readOnly}
        />
      )}
      {item.kind === 'heading' && <div className="ingredient-row__amount-spacer" aria-hidden="true" />}
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

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  const rowClass = [
    'ingredient-row',
    item.kind === 'heading' ? 'ingredient-row--heading' : 'ingredient-row--item',
    isDragging ? 'ingredient-row--dragging' : '',
  ]
    .filter(Boolean)
    .join(' ');

  return (
    <>
      <div ref={setNodeRef} className={rowClass} style={style}>
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
    </>
  );
}
