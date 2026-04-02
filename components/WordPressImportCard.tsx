'use client';

import { useState } from 'react';
import { Alert, Badge, Button, Group, List, SegmentedControl, SimpleGrid, Stack, Text, TextInput, ThemeIcon } from '@mantine/core';
import { buildCategoryOptions } from '@/lib/categoryOptions';
import { finalizeImportedRecipe } from '@/lib/importRecipes';
import { recipeToJson } from '@/lib/recipes';
import { useLiveRecipes } from '@/lib/useLiveRecipes';
import { type Recipe } from '@/schema/recipeSchema';
import { editorSegmentedClassNames } from './editor/types';
import { StudioCategoryField } from './StudioCategoryField';
import { StudioSectionCard } from './StudioSectionCard';

interface Props {
  onImport: (json: string, title: string) => void;
  className?: string;
}

interface IngredientItem {
  label: string;
  amount?: string;
  notes?: string;
  kind?: 'ingredient' | 'heading';
}

interface IngredientGroup {
  title?: string;
  items: IngredientItem[];
}

export function WordPressImportCard({ onImport, className }: Props) {
  const [url, setUrl] = useState('');
  const [categoryPlace, setCategoryPlace] = useState('');
  const [categoryBase, setCategoryBase] = useState('');
  const [recipeKind, setRecipeKind] = useState<'mat' | 'drink'>('mat');
  const [status, setStatus] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [preview, setPreview] = useState<Recipe | null>(null);
  const liveRecipes = useLiveRecipes();
  const categoryOptions = buildCategoryOptions(liveRecipes);

  const handleConvert = async () => {
    setStatus(null);
    setError(null);
    const trimmedUrl = url.trim();
    if (!trimmedUrl) {
      setError('Ange en WordPress-länk att importera.');
      return;
    }
    const normalizedUrl = /^https?:\/\//i.test(trimmedUrl) ? trimmedUrl : `https://${trimmedUrl}`;
    try {
      setIsProcessing(true);
      const proxyUrl = process.env.NEXT_PUBLIC_WORDPRESS_PROXY_URL ?? '/api/fetch-wordpress';
      const response = await fetch(proxyUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url: normalizedUrl }),
      });
      const contentType = response.headers.get('content-type') ?? '';
      const payload = contentType.includes('application/json')
        ? ((await response.json()) as { html?: string; error?: string; details?: string })
        : { error: await response.text() };
      if (!response.ok) {
          const detail = payload.details ? `\n${payload.details}` : '';
        throw new Error((payload.error ?? 'Kunde inte hämta sidan.') + detail);
      }
      const recipe = convertWordPressHtml(payload.html ?? '');
      const parsed = finalizeImportedRecipe(recipe, {
        categoryPlace,
        categoryBase,
        isDrink: recipeKind === 'drink',
      });
      const json = recipeToJson(parsed);
      onImport(json, parsed.title);
      setPreview(parsed);
      setStatus('WordPress-länken importerades och receptet laddades i editorn.');
    } catch (conversionError) {
      setPreview(null);
      setError((conversionError as Error).message);
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <StudioSectionCard
      className={className}
      iconClass="fa-brands fa-wordpress"
      title="Importera från WordPress"
      description="Klistra in en länk från recept.marcusboberg.se. Vi hämtar HTML, tolkar receptet och öppnar resultatet direkt i editorn."
    >
      <SimpleGrid cols={{ base: 1, xl: 2 }} spacing="xl">
        <Stack gap="md">
          <TextInput
            label="1. WordPress-länk"
          type="url"
            radius="md"
          placeholder="https://recept.marcusboberg.se/vegetariskt/black-bean-burger/"
          value={url}
            onChange={(event) => setUrl(event.currentTarget.value)}
          />
          <SimpleGrid cols={{ base: 1, sm: 3 }} spacing="sm">
            <StudioCategoryField
              label="2. Plats"
              placeholder="t.ex. Italien"
              value={categoryPlace}
              options={categoryOptions.place}
              onChange={setCategoryPlace}
            />
            <StudioCategoryField
              label="3. Basvara"
              placeholder="t.ex. Kyckling"
              value={categoryBase}
              options={categoryOptions.base}
              onChange={setCategoryBase}
            />
            <Stack gap={6}>
              <Text size="sm" fw={600} c="dimmed">
                4. Recept
              </Text>
              <SegmentedControl
                value={recipeKind}
                onChange={(value) => setRecipeKind(value as 'mat' | 'drink')}
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
          </SimpleGrid>
          <Group gap="sm" align="center">
            <Button type="button" color="studioBlue" radius="xl" onClick={handleConvert} disabled={isProcessing || url.trim().length === 0} loading={isProcessing}>
              {isProcessing ? 'Analyserar…' : 'Importera till editorn'}
            </Button>
            <Badge variant="light" color="grape" radius="xl">
              HTML + checklistor
            </Badge>
          </Group>
          {status ? (
            <Alert color="studioBlue" variant="light">
              {status}
            </Alert>
          ) : null}
          {error ? (
            <Alert color="red" variant="light">
              {error}
            </Alert>
          ) : null}
        </Stack>

        <Stack gap="md">
          <Text size="sm" fw={700} c="dimmed" tt="uppercase" style={{ letterSpacing: '0.08em' }}>
            Vad som händer
          </Text>
          <List
            spacing="sm"
            icon={
              <ThemeIcon color="studioBlue" size={22} radius="xl" variant="light">
                <i className="fa-solid fa-check" aria-hidden="true" />
              </ThemeIcon>
            }
          >
            <List.Item>Vi hämtar HTML via den säkrade proxyn.</List.Item>
            <List.Item>Checklistor och rubriker blir ingredienser och sektioner.</List.Item>
            <List.Item>Du landar direkt i editorn och kan justera allt innan sparning.</List.Item>
          </List>

          {preview ? (
            <Alert color="studioBlue" variant="light" title={preview.title}>
              <Text size="sm">
                {preview.ingredients.length} ingredienser, {preview.steps.length} steg
              </Text>
              <Text size="sm" c="dimmed">
                {preview.categories?.length ? preview.categories.join(', ') : 'Inga kategorier satta'}
              </Text>
            </Alert>
          ) : (
            <Alert color="gray" variant="light" title="Tips före import">
              <Text size="sm" c="dimmed">
                Fyll i kategorierna först. De följer med direkt in i receptet och sparar tid i editorn.
              </Text>
            </Alert>
          )}

          <Group gap="xs">
            <Badge variant="dot" color="studioBlue">
              Endast recept.marcusboberg.se
            </Badge>
            <Badge variant="dot" color="gray">
              Kategorier krävs
            </Badge>
          </Group>
        </Stack>
      </SimpleGrid>
    </StudioSectionCard>
  );
}

function convertWordPressHtml(html: string): Recipe {
  if (!html || html.trim().length === 0) {
    throw new Error('Kunde inte läsa HTML från WordPress-länken.');
  }

  if (typeof DOMParser === 'undefined') {
    throw new Error('DOMParser saknas i miljön. Kör importen i webbläsaren.');
  }

  const parser = new DOMParser();
  const doc = parser.parseFromString(html, 'text/html');

  const title = firstNonEmpty([
    doc.querySelector('meta[property="og:title"]')?.getAttribute('content'),
    doc.querySelector('title')?.textContent,
    doc.querySelector('h1')?.textContent,
  ]) ?? 'Importerad rätt';

  const description = firstNonEmpty([
    doc.querySelector('meta[name="description"]')?.getAttribute('content'),
    doc.querySelector('meta[property="og:description"]')?.getAttribute('content'),
  ]) ?? 'Uppdatera beskrivningen efter import.';

  const imageUrl = firstNonEmpty([
    doc.querySelector('meta[property="og:image"]')?.getAttribute('content'),
    doc.querySelector('meta[name="twitter:image"]')?.getAttribute('content'),
  ]) ?? '/images/recipes/new-recipe.jpg';

  const source = firstNonEmpty([
    doc.querySelector('link[rel="canonical"]')?.getAttribute('href'),
    doc.querySelector('meta[property="og:url"]')?.getAttribute('content'),
  ]);

  const createdAt = parseDate(firstNonEmpty([
    doc.querySelector('meta[property="article:published_time"]')?.getAttribute('content'),
  ])) ?? new Date().toISOString();

  const updatedAt = parseDate(firstNonEmpty([
    doc.querySelector('meta[property="article:modified_time"]')?.getAttribute('content'),
  ])) ?? createdAt;

  const ingredientGroups = collectIngredientGroups(doc).map((group) => ({
    ...group,
    title: group.title ?? '',
    items: group.items.map((item) => ({
      ...item,
      kind: (item.kind ?? 'ingredient') as 'ingredient' | 'heading',
    })),
  }));
  if (ingredientGroups.length === 0) {
    throw new Error('Hittade inga ingredientslistor i HTML:en. Säkerställ att WordPress-inlägget använder checklistor.');
  }

  const flatIngredients = ingredientGroups.flatMap((group) => group.items).map((item) => ({
    ...item,
    kind: item.kind ?? 'ingredient',
  }));
  const steps = collectSteps(doc);
  if (steps.length === 0) {
    throw new Error('Hittade inga tillagningssteg att importera.');
  }

  return {
    title: cleanText(title),
    titleSegments: [{ text: cleanText(title), size: 'big' as const }],
    slug: slugify(title),
    slugHistory: [],
    description: cleanText(description),
    imageUrl,
    categoryPlace: '',
    categoryBase: '',
    categories: [],
    isDrink: false,
    prepTimeMinutes: 0,
    cookTimeMinutes: 0,
    servings: 4,
    ingredients: flatIngredients,
    ingredientGroups: ingredientGroups.length > 1 ? ingredientGroups : undefined,
    steps,
    source: source ?? undefined,
    createdAt,
    updatedAt,
  };
}

function collectIngredientGroups(doc: Document): IngredientGroup[] {
  const groups: IngredientGroup[] = [];
  const wrappers = Array.from(doc.querySelectorAll('.fusion-column-wrapper'));

  wrappers.forEach((wrapper) => {
    if (!wrapper.querySelector('.fusion-checklist')) return;

    let currentTitle: string | undefined;
    Array.from(wrapper.children).forEach((child) => {
      if (child.classList.contains('fusion-title')) {
        const heading = child.querySelector('h1, h2, h3, h4, h5, h6');
        currentTitle = heading ? cleanText(heading.textContent ?? '') : undefined;
        return;
      }

      const list = child.matches('ul.fusion-checklist') ? child : child.querySelector('ul.fusion-checklist');
      if (list) {
        const items = collectIngredientsFromList(list);
        if (items.length > 0) {
          groups.push({ title: normalizeGroupTitle(currentTitle) ?? '', items });
        }
        currentTitle = undefined;
      }
    });
  });

  return groups.filter((group) => group.items.length > 0);
}

function collectIngredientsFromList(listEl: Element): IngredientItem[] {
  const list = listEl.tagName === 'UL' ? listEl : listEl.querySelector('ul');
  if (!list) return [];
  return Array.from(list.querySelectorAll('li'))
    .map((li) => li.querySelector('.fusion-li-item-content')?.textContent ?? li.textContent ?? '')
    .map((raw) => parseIngredientLine(raw))
    .filter((item): item is IngredientItem => Boolean(item.label));
}

function parseIngredientLine(raw: string): IngredientItem {
  const trimmed = cleanText(raw);
  if (!trimmed) {
    return { label: '' };
  }

  let text = trimmed;
  let notes: string | undefined;
  const noteMatch = text.match(/\(([^)]+)\)/);
  if (noteMatch) {
    notes = cleanText(noteMatch[1]);
    text = text.replace(noteMatch[0], '').trim();
  }

  const looksLikeAmount = (candidate: string) => {
    const normalized = candidate.trim().toLowerCase();
    if (!normalized) return false;
    if (/^[0-9¼½¾]/.test(normalized)) return true;
    return /^(en|ett|halv)/.test(normalized);
  };

  let label = text;
  let amount: string | undefined;

  const multiplierMatch = text.match(/^(.*?)\s*[×x]\s*(.+)$/i);
  if (multiplierMatch) {
    label = multiplierMatch[1];
    amount = multiplierMatch[2];
  } else {
    const dashMatch = text.match(/^(.*?)\s*[-–—:]\s*(.+)$/);
    if (dashMatch && looksLikeAmount(dashMatch[2])) {
      label = dashMatch[1];
      amount = dashMatch[2];
    }
  }

  label = cleanText(label) ?? '';
  amount = amount ? cleanText(amount) : undefined;

  return {
    label,
    amount,
    notes,
  };
}

function collectSteps(doc: Document): Recipe['steps'] {
  const panes = Array.from(doc.querySelectorAll('.fusion-tabs .tab-pane'));
  const fromTabs = panes
    .map((pane, index) => {
      const text = cleanText(pane.textContent ?? '');
      if (!text) return null;
      return {
        title: panes.length > 1 ? `Steg ${index + 1}` : undefined,
        body: text,
      };
    })
    .filter((step): step is { title: string | undefined; body: string } => Boolean(step));

  if (fromTabs.length > 0) {
    return fromTabs;
  }

  const paragraphs = Array.from(doc.querySelectorAll('.post-content p'))
    .map((p) => cleanText(p.textContent ?? ''))
    .filter((text): text is string => Boolean(text));

  return paragraphs.map((text, index) => ({
    title: paragraphs.length > 1 ? `Steg ${index + 1}` : undefined,
    body: text,
  }));
}

function cleanText(input: string | null | undefined): string {
  if (!input) return '';
  return input.replace(/\s+/g, ' ').trim();
}

function firstNonEmpty(values: Array<string | null | undefined>): string | null {
  for (const value of values) {
    const cleaned = cleanText(value ?? '');
    if (cleaned) return cleaned;
  }
  return null;
}

function parseDate(value: string | null): string | null {
  if (!value) return null;
  const timestamp = Date.parse(value);
  if (Number.isNaN(timestamp)) {
    return null;
  }
  return new Date(timestamp).toISOString();
}

function slugify(value: string): string {
  return cleanText(value)
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, '')
    .trim()
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-');
}

function normalizeGroupTitle(title?: string): string | undefined {
  if (!title) return undefined;
  const cleaned = title.toLowerCase();
  if (cleaned === 'ingredienser' || cleaned === 'ingredients') {
    return undefined;
  }
  return title;
}
