'use client';

import { useState } from 'react';
import { Alert, Badge, Button, Group, List, SegmentedControl, SimpleGrid, Stack, Text, TextInput, ThemeIcon } from '@mantine/core';
import { getBaseCategoryIconClass } from '@/lib/categoryIcons';
import { buildCategoryOptions } from '@/lib/categoryOptions';
import { finalizeImportedRecipe } from '@/lib/importRecipes';
import type { RecipeKind } from '@/lib/recipeKind';
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

export function IcaImportCard({ onImport, className }: Props) {
  const [url, setUrl] = useState('');
  const [categoryPlace, setCategoryPlace] = useState('');
  const [categoryBase, setCategoryBase] = useState('');
  const [recipeKind, setRecipeKind] = useState<RecipeKind>('mat');
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
      setError('Ange en ICA-länk att importera.');
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
      const payload = (await response.json().catch(() => ({ error: 'Okänt svar från servern.' }))) as {
        html?: string;
        error?: string;
      };
      if (!response.ok) {
        throw new Error(payload.error ?? 'Kunde inte hämta sidan.');
      }
      const html = (payload as { html?: string }).html ?? '';
      const recipe = convertIcaHtml(html, normalizedUrl);
      const parsed = finalizeImportedRecipe(recipe, {
        categoryPlace,
        categoryBase,
        recipeKind,
      });
      const json = recipeToJson(parsed);
      onImport(json, parsed.title);
      setPreview(parsed);
      setStatus('ICA-länken importerades och receptet laddades i editorn.');
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
      iconClass="fa-solid fa-cart-shopping"
      title="Importera från ICA.se"
      description="Klistra in en receptlänk från ICA. Vi plockar ut JSON-LD och förbereder receptet för redigering."
    >
      <SimpleGrid cols={{ base: 1, xl: 2 }} spacing="xl">
        <Stack gap="md">
          <TextInput
            label="1. ICA-länk"
          type="url"
            radius="md"
          placeholder="https://www.ica.se/recept/bakad-blomkal-med-parmesansas-och-citronpesto-750729/"
          value={url}
            onChange={(event) => setUrl(event.currentTarget.value)}
          />
          <SimpleGrid cols={{ base: 1, sm: 3 }} spacing="sm">
            <StudioCategoryField
              label="2. Plats"
              placeholder="t.ex. Sverige"
              value={categoryPlace}
              options={categoryOptions.place}
              onChange={setCategoryPlace}
            />
            <StudioCategoryField
              label="3. Basvara"
              placeholder="t.ex. Blomkål"
              value={categoryBase}
              options={categoryOptions.base}
              getOptionIconClass={getBaseCategoryIconClass}
              onChange={setCategoryBase}
            />
            <Stack gap={6}>
              <Text size="sm" fw={600} c="dimmed">
                4. Typ
              </Text>
              <SegmentedControl
                value={recipeKind}
                onChange={(value) => setRecipeKind(value as RecipeKind)}
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
            </Stack>
          </SimpleGrid>
          <Group gap="sm" align="center">
            <Button type="button" color="studioBlue" radius="xl" onClick={handleConvert} disabled={isProcessing || url.trim().length === 0} loading={isProcessing}>
              {isProcessing ? 'Analyserar…' : 'Importera till editorn'}
            </Button>
            <Badge variant="light" color="orange" radius="xl">
              JSON-LD
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
            <List.Item>Vi läser recipe-data direkt från sidans strukturerade metadata.</List.Item>
            <List.Item>Tider, portioner, ingredienser och steg fylls automatiskt.</List.Item>
            <List.Item>Du finjusterar allt i samma editor som övriga recept.</List.Item>
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
                ICA-data är ofta bra på tider och portioner. Lägg mest energi på rätt kategorier före import.
              </Text>
            </Alert>
          )}

          <Group gap="xs">
            <Badge variant="dot" color="orange">
              Endast ica.se
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

function convertIcaHtml(html: string, sourceUrl: string): Recipe {
  if (!html || html.trim().length === 0) {
    throw new Error('Kunde inte läsa HTML från ICA-länken.');
  }

  if (typeof DOMParser === 'undefined') {
    throw new Error('DOMParser saknas i miljön. Kör importen i webbläsaren.');
  }

  const parser = new DOMParser();
  const doc = parser.parseFromString(html, 'text/html');
  const initialData = extractInitialData(html);
  const initialRecipe = pickInitialRecipe(initialData);
  const ldRecipe = extractRecipeJson(doc);
  const recipeLd = ldRecipe ?? initialRecipe;
  if (!recipeLd && !initialRecipe) {
    throw new Error('Hittade ingen JSON för receptet.');
  }

  const title = cleanText(recipeLd?.name ?? initialRecipe?.title) || fallbackTitle(doc);
  const description =
    cleanText(recipeLd?.description ?? initialRecipe?.preamble) ||
    cleanText(doc.querySelector('meta[name="description"]')?.getAttribute('content') ?? '') ||
    'Uppdatera beskrivningen efter import.';

  const imageUrl = pickImage(recipeLd?.image) ?? '/images/recipes/new-recipe.jpg';
  const createdAt = parseDate(recipeLd?.datePublished ?? initialRecipe?.startDate) ?? new Date().toISOString();
  const updatedAt = parseDate(recipeLd?.dateModified ?? initialRecipe?.modified_date ?? initialRecipe?.lastModified) ?? createdAt;
  const prepTimeMinutes = parseDuration(recipeLd?.prepTime) ?? 0;
  const cookTimeMinutes = parseDuration(recipeLd?.cookTime) ?? 0;
  const servings = parseServings(recipeLd?.recipeYield ?? initialRecipe?.defaultPortions) ?? 4;
  const ldIngredientGroups =
    extractIngredientGroupsFromInitial(initialRecipe) ?? extractIngredientGroupsFromLd(recipeLd) ?? extractIngredientGroupsFromLd(ldRecipe);
  const ingredients =
    ldIngredientGroups?.flatMap((group) => group.items) ??
    buildIngredients(recipeLd?.recipeIngredient ?? initialRecipe?.recipeIngredient);
  if (ingredients.length === 0) {
    throw new Error('Hittade inga ingredienser i JSON-LD.');
  }
  const steps = buildSteps(recipeLd?.recipeInstructions ?? initialRecipe?.cookingSteps);
  if (steps.length === 0) {
    throw new Error('Hittade inga tillagningssteg i JSON-LD.');
  }

  const categories = collectStrings(recipeLd?.recipeCategory ?? initialRecipe?.mdsaCategories);

  return {
    title: cleanText(title) || 'Importerad rätt',
    titleSegments: [{ text: cleanText(title) || 'Importerad rätt', size: 'big' }],
    slug: slugify(title || 'importerad-ratt'),
    slugHistory: [],
    description: cleanText(description),
    imageUrl,
    recipeKind: 'mat',
    categoryPlace: '',
    categoryBase: '',
    categories,
    isDrink: false,
    prepTimeMinutes,
    cookTimeMinutes,
    servings,
    ingredients,
    ingredientGroups: ldIngredientGroups?.length ? ldIngredientGroups : undefined,
    steps,
    source: sourceUrl,
    createdAt,
    updatedAt,
  };
}

function extractRecipeJson(doc: Document): any | null {
  const scripts = Array.from(doc.querySelectorAll('script[type="application/ld+json"]'));
  const candidates: any[] = [];

  scripts.forEach((script) => {
    const json = parseJsonSafe(script.textContent ?? '');
    collectRecipeEntries(json, candidates);
  });

  if (candidates.length === 0) return null;

  // Prefer entries that already provide structured ingredientGroups.
  const scored = candidates.map((candidate) => {
    const hasGroups = Array.isArray(candidate?.ingredientGroups) && candidate.ingredientGroups.length > 0;
    const hasIngredients = Array.isArray(candidate?.recipeIngredient) && candidate.recipeIngredient.length > 0;
    return {
      candidate,
      score: (hasGroups ? 2 : 0) + (hasIngredients ? 1 : 0),
    };
  });

  scored.sort((a, b) => b.score - a.score);
  return scored[0].candidate ?? null;
}

function extractInitialData(html: string): any | null {
  const match = html.match(/window.__INITIAL_DATA__\s*=\s*({[\s\S]*?})\s*;/);
  if (!match) return null;
  const raw = match[1];
  const cleaned = raw
    .replace(/:undefined/g, ':null')
    .replace(/\bundefined\b/g, 'null')
    .replace(/new Map\([^)]*\)/g, '[]');
  const json = parseJsonSafe(cleaned) ?? parseJsonSafe(raw);
  return json ?? null;
}

function pickInitialRecipe(data: any): any | null {
  if (!data) return null;
  if (data.currentRecipeDocument) return data.currentRecipeDocument;
  if (data.recipe?.currentRecipeDocument) return data.recipe.currentRecipeDocument;
  if (data.recipe) return data.recipe;
  return null;
}

function collectRecipeEntries(data: unknown, bucket: any[]): void {
  if (!data) return;
  if (Array.isArray(data)) {
    data.forEach((item) => collectRecipeEntries(item, bucket));
    return;
  }
  if (typeof data === 'object') {
    const obj = data as Record<string, unknown>;
    const type = obj['@type'];
    if (typeof type === 'string' && type.toLowerCase() === 'recipe') {
      bucket.push(obj);
    } else if (Array.isArray(type) && type.map((t) => String(t).toLowerCase()).includes('recipe')) {
      bucket.push(obj);
    }
    if (Array.isArray(obj['@graph'])) {
      collectRecipeEntries(obj['@graph'], bucket);
    }
  }
}

function pickImage(image: unknown): string | null {
  if (!image) return null;
  if (typeof image === 'string') return image;
  if (Array.isArray(image)) {
    const first = image[0];
    if (typeof first === 'string') return first;
    if (typeof first === 'object' && first && 'url' in first && typeof (first as any).url === 'string') {
      return (first as any).url;
    }
  }
  if (typeof image === 'object' && 'url' in (image as any) && typeof (image as any).url === 'string') {
    return (image as any).url as string;
  }
  return null;
}

function buildIngredients(raw: unknown): Recipe['ingredients'] {
  const list = Array.isArray(raw) ? raw : typeof raw === 'string' ? [raw] : [];
  return list
    .map((value) => (typeof value === 'string' ? value : ''))
    .map((line) => parseIngredientLine(line))
    .filter((item) => item.label.length > 0)
    .map((item) => ({ ...item, kind: 'ingredient' as const }));
}

function buildSteps(raw: unknown): Recipe['steps'] {
  if (!raw) return [];

  const asArray = Array.isArray(raw) ? raw : [raw];
  const steps: Recipe['steps'] = [];

  asArray.forEach((item) => {
    if (!item) return;
    if (typeof item === 'string') {
      const text = cleanText(item);
      if (text) steps.push({ body: text });
      return;
    }
    if (typeof item === 'object') {
      const obj = item as Record<string, any>;
      if (Array.isArray(obj.itemListElement)) {
        obj.itemListElement.forEach((entry: any) => {
          const body = cleanText(entry.text ?? entry.name ?? '');
          if (body) {
            steps.push({ title: cleanText(entry.name ?? undefined), body });
          }
        });
        return;
      }
      const body = cleanText(obj.text ?? obj.name ?? '');
      if (body) {
        steps.push({ title: cleanText(obj.name ?? undefined) || undefined, body });
      }
    }
  });

  return steps;
}

function extractIngredientGroupsFromLd(recipeLd: any): Recipe['ingredientGroups'] | null {
  const groups = Array.isArray(recipeLd?.ingredientGroups) ? recipeLd.ingredientGroups : null;
  if (!groups) return null;

  const mapped = groups
    .map((group: any) => {
      const title = cleanText(group.groupName ?? group.title ?? '');
      const items = Array.isArray(group.ingredients)
        ? group.ingredients
            .map((item: any) => {
              let label = cleanText(item.ingredient ?? item.text ?? '');
              if (!label) return null;
              const quantity =
                typeof item.quantity === 'number'
                  ? item.quantity
                  : typeof item.quantity === 'string'
                    ? item.quantity
                    : undefined;
              const unit = cleanText(item.unit ?? '');
              const amountParts: Array<string | number> = [];
              if (quantity !== undefined && quantity !== null && `${quantity}` !== '') amountParts.push(quantity);
              if (unit) {
                amountParts.push(unit);
              }
              let amount =
                amountParts.length && (unit || amountParts.length === 1)
                  ? amountParts.join(' ')
                  : amountParts.length === 1
                    ? `${amountParts[0]}`
                    : undefined;

              // If ICA only provides `text` and we didn't derive amount/label cleanly, try to parse the raw line.
              if ((!amount || label === cleanText(item.text ?? '')) && item.text) {
                const parsed = parseIngredientLine(String(item.text));
                amount = amount ?? parsed.amount;
                label = parsed.label || label;
              }

              return { label: cleanText(label), amount: amount ? cleanText(amount) : undefined, notes: undefined, kind: 'ingredient' as const };
            })
            .filter((item: any): item is { label: string; amount?: string; notes?: string; kind: 'ingredient' } => Boolean(item))
        : [];
      return items.length ? { title: title || undefined, items } : null;
    })
    .filter((group: any): group is NonNullable<(typeof mapped)[number]> => Boolean(group));

  return mapped.length ? mapped : null;
}

function extractIngredientGroupsFromInitial(recipe: any): Recipe['ingredientGroups'] | null {
  if (!recipe || !Array.isArray(recipe.ingredientGroups)) return null;
  return recipe.ingredientGroups
    .map((group: any) => {
      const title = cleanText(group.groupName ?? group.title ?? '');
      if (!Array.isArray(group.ingredients)) return null;
      const items = group.ingredients
        .map((ing: any) => {
          const label = cleanText(ing.ingredient ?? ing.text ?? '');
          if (!label) return null;
          const qty = ing.quantity ?? ing.minQuantity;
          const unit = cleanText(ing.unit ?? '');
          const amountParts: Array<string | number> = [];
          if (qty !== undefined && qty !== null && `${qty}` !== '') amountParts.push(qty);
          if (unit) amountParts.push(unit);
          let amount = amountParts.length ? amountParts.join(' ') : undefined;
          if (!amount && ing.text) {
            const parsed = parseIngredientLine(String(ing.text));
            amount = parsed.amount;
          }
          return { label, amount: amount ? cleanText(amount) : undefined, kind: 'ingredient' as const };
        })
        .filter((item: any): item is { label: string; amount?: string; kind: 'ingredient' } => Boolean(item));
      return items.length ? { title: title || undefined, items } : null;
    })
    .filter((g: any): g is NonNullable<(typeof g)> => Boolean(g));
}

function parseIngredientLine(raw: string) {
  const trimmed = cleanText(raw);
  if (!trimmed) return { label: '' };

  let text = trimmed;
  let notes: string | undefined;
  const noteMatch = text.match(/\(([^)]+)\)/);
  if (noteMatch) {
    notes = cleanText(noteMatch[1]);
    text = text.replace(noteMatch[0], '').trim();
  }

  // Försök plocka ut ledande mängd + enhet (t.ex. "2 msk olivolja")
  let label = text;
  let amount: string | undefined;
  const leadingMatch = text.match(/^([\d.,/ ]+)\s+([^\s]+)\s+(.+)$/);
  if (leadingMatch) {
    amount = cleanText(`${leadingMatch[1]} ${leadingMatch[2]}`);
    label = leadingMatch[3];
  } else {
    const twoPartMatch = text.match(/^([\d.,/ ]+)\s+(.+)$/);
    if (twoPartMatch) {
      amount = cleanText(twoPartMatch[1]);
      label = twoPartMatch[2];
    } else {
      const dashMatch = text.match(/^(.*?)[-–—:]\s*(.+)$/);
      if (dashMatch) {
        label = dashMatch[1];
        amount = dashMatch[2];
      }
    }
  }

  label = cleanText(label);
  amount = amount ? cleanText(amount) : undefined;

  return { label, amount, notes };
}

function cleanText(input: string | null | undefined): string {
  if (!input) return '';
  return input.replace(/\s+/g, ' ').trim();
}

function parseJsonSafe(input: string): unknown {
  try {
    return JSON.parse(input);
  } catch {
    return null;
  }
}

function parseDuration(value: unknown): number | null {
  if (typeof value !== 'string') return null;
  const match = value.match(/P(?:\d+Y)?(?:\d+M)?(?:\d+D)?T?(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?/i);
  if (!match) return null;
  const hours = match[1] ? parseInt(match[1], 10) : 0;
  const minutes = match[2] ? parseInt(match[2], 10) : 0;
  const seconds = match[3] ? parseInt(match[3], 10) : 0;
  return hours * 60 + minutes + Math.round(seconds / 60);
}

function parseServings(value: unknown): number | null {
  if (!value) return null;
  const text = Array.isArray(value) ? value[0] : value;
  if (typeof text === 'number') return text;
  if (typeof text !== 'string') return null;
  const match = text.match(/(\d+)/);
  if (!match) return null;
  const parsed = parseInt(match[1], 10);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : null;
}

function collectStrings(value: unknown): string[] {
  if (!value) return [];
  if (Array.isArray(value)) {
    return value.map((v) => cleanText(String(v))).filter(Boolean);
  }
  if (typeof value === 'string') {
    return value.split(',').map((v) => cleanText(v)).filter(Boolean);
  }
  return [];
}

function slugify(value: string): string {
  const transliterated = value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[åä]/gi, 'a')
    .replace(/ö/gi, 'o');
  return cleanText(transliterated)
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, '')
    .trim()
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-');
}

function fallbackTitle(doc: Document): string {
  return (
    cleanText(doc.querySelector('meta[property="og:title"]')?.getAttribute('content') ?? '') ||
    cleanText(doc.querySelector('title')?.textContent ?? '') ||
    'Importerad rätt'
  );
}

function parseDate(value: unknown): string | null {
  if (typeof value !== 'string') return null;
  const timestamp = Date.parse(value);
  if (Number.isNaN(timestamp)) return null;
  return new Date(timestamp).toISOString();
}
