'use client';

import { useState } from 'react';
import { recipeSchema, type Recipe } from '@/schema/recipeSchema';
import { recipeToJson } from '@/lib/recipes';

interface Props {
  onImport: (json: string, title: string) => void;
  className?: string;
}

interface IngredientItem {
  label: string;
  amount?: string;
  notes?: string;
}

interface IngredientGroup {
  title?: string;
  items: IngredientItem[];
}

export function WordPressImportCard({ onImport, className }: Props) {
  const [url, setUrl] = useState('');
  const [categoriesInput, setCategoriesInput] = useState('');
  const [status, setStatus] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [preview, setPreview] = useState<Recipe | null>(null);

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
      const categories = categoriesInput.split(',').map((c) => c.trim()).filter(Boolean);
      if (categories.length > 0) {
        recipe.categories = categories;
      }
      const parsed = recipeSchema.parse(recipe);
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
    <div className={`card space-y-3 ${className ?? ''}`}>
      <div className="space-y-1">
        <h3 className="card-title">WordPress-import</h3>
        <p className="card-subtitle">Klistra in en WordPress-URL så hämtar vi HTML och bygger JSON åt dig.</p>
      </div>
      <label className="stack">
        <span className="text-sm text-muted">WordPress-länk</span>
        <input
          type="url"
          className="input"
          placeholder="https://recept.marcusboberg.se/vegetariskt/black-bean-burger/"
          value={url}
          onChange={(event) => setUrl(event.target.value)}
        />
      </label>
      <label className="stack">
        <span className="text-sm text-muted">Kategorier (komma-separerade, valfritt)</span>
        <input
          type="text"
          className="input"
          placeholder="Middag, Vegetariskt"
          value={categoriesInput}
          onChange={(event) => setCategoriesInput(event.target.value)}
        />
      </label>
      <div className="flex" style={{ gap: '0.5rem', flexWrap: 'wrap', alignItems: 'center' }}>
        <button
          type="button"
          className="button-primary"
          onClick={handleConvert}
          disabled={isProcessing || url.trim().length === 0}
        >
          {isProcessing ? 'Analyserar…' : 'Konvertera och fyll editor'}
        </button>
        {status && <span className="text-sm">{status}</span>}
        {error && (
          <span className="text-sm" style={{ color: '#b91c1c' }}>
            {error}
          </span>
        )}
      </div>
      {preview && (
        <div className="text-sm text-muted">
          <p style={{ marginBottom: '0.25rem' }}>
            {preview.title} • {preview.ingredients.length} ingredienser • {preview.steps.length} steg
          </p>
          <p style={{ marginBottom: 0 }}>
            Tags: {preview.tags.length === 0 ? '—' : preview.tags.join(', ')} • Kategorier:{' '}
            {preview.categories?.length ? preview.categories.join(', ') : '—'}
          </p>
        </div>
      )}
    </div>
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

  const ingredientGroups = collectIngredientGroups(doc);
  if (ingredientGroups.length === 0) {
    throw new Error('Hittade inga ingredientslistor i HTML:en. Säkerställ att WordPress-inlägget använder checklistor.');
  }

  const flatIngredients = ingredientGroups.flatMap((group) => group.items);
  const steps = collectSteps(doc);
  if (steps.length === 0) {
    throw new Error('Hittade inga tillagningssteg att importera.');
  }

  return {
    title: cleanText(title),
    slug: slugify(title),
    description: cleanText(description),
    imageUrl,
    tags: collectTags(doc),
    categories: [],
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
          groups.push({ title: normalizeGroupTitle(currentTitle), items });
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

function collectTags(doc: Document): string[] {
  const selectors = ['a[href*="/tag/"]', 'a[href*="/recept/"]'];
  const seen = new Map<string, string>();
  selectors.forEach((selector) => {
    doc.querySelectorAll(selector).forEach((element) => {
      const text = cleanText(element.textContent ?? '');
      if (!text) return;
      const key = text.toLowerCase();
      if (!seen.has(key)) {
        seen.set(key, text);
      }
    });
  });

  return Array.from(seen.values()).slice(0, 5);
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
