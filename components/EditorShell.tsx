'use client';

import { useEffect, useState } from 'react';
import { doc, setDoc } from 'firebase/firestore';
import { deriveCategoriesArray } from '@/lib/categories';
import { JsonEditor } from '@/components/JsonEditor';
import { RecipePreview } from '@/components/RecipePreview';
import { parseRecipe, recipeToJson } from '@/lib/recipes';
import type { Recipe } from '@/schema/recipeSchema';
import { getFirestoreClient } from '@/lib/firebaseClient';

interface Props {
  initialJson: string;
  initialTitle: string;
  mode: 'new' | 'edit';
}

interface EditorShellProps extends Props {
  forcedTab?: 'form' | 'json';
}

export function EditorShell({ initialJson, initialTitle, mode: _mode, forcedTab }: EditorShellProps) {
  const [content, setContent] = useState(initialJson);
  const [errors, setErrors] = useState<string[]>([]);
  const [preview, setPreview] = useState<Recipe | null>(null);
  const [formRecipe, setFormRecipe] = useState<Recipe | null>(null);
  const [saving, setSaving] = useState(false);
  const [status, setStatus] = useState<string | null>(null);
  const view: 'form' | 'json' = forcedTab ?? 'form';

  useEffect(() => {
    const parsed = parseRecipe(content);
    if (parsed.errors) {
      setErrors(parsed.errors);
      setPreview(null);
      return;
    } else if (parsed.recipe) {
      setErrors([]);
      setPreview(parsed.recipe);
      setFormRecipe(parsed.recipe);
    }
  }, [content]);

  const stripNotes = (recipe: Recipe): Recipe => ({
    ...recipe,
    ingredients: recipe.ingredients?.map(({ label, amount }) =>
      amount && amount.length > 0 ? { label, amount } : { label },
    ) ?? [],
    ingredientGroups: recipe.ingredientGroups?.map((group) => ({
      ...group,
      items: group.items?.map(({ label, amount }) => (amount && amount.length > 0 ? { label, amount } : { label })) ?? [],
    })),
  });

  const updateRecipe = (updater: (prev: Recipe) => Recipe) => {
    setFormRecipe((prev) => {
      if (!prev) return prev;
      const next = stripNotes(updater(prev));
      const normalized: Recipe = { ...next, categories: deriveCategoriesArray(next) };
      setContent(recipeToJson(normalized));
      return normalized;
    });
  };

  const addIngredient = () => {
    updateRecipe((prev) => ({
      ...prev,
      ingredients: [...(prev.ingredients ?? []), { label: '', amount: '' }],
    }));
  };

  const updateIngredient = (index: number, field: 'label' | 'amount', value: string) => {
    updateRecipe((prev) => {
      const next = [...(prev.ingredients ?? [])];
      next[index] = { ...next[index], [field]: value };
      return { ...prev, ingredients: next };
    });
  };

  const addGroup = () => {
    updateRecipe((prev) => ({
      ...prev,
      ingredientGroups: [...(prev.ingredientGroups ?? []), { title: '', items: [{ label: '', amount: '' }] }],
    }));
  };

  const updateGroupTitle = (groupIndex: number, title: string) => {
    updateRecipe((prev) => {
      const groups = [...(prev.ingredientGroups ?? [])];
      groups[groupIndex] = { ...groups[groupIndex], title };
      return { ...prev, ingredientGroups: groups };
    });
  };

  const addGroupItem = (groupIndex: number) => {
    updateRecipe((prev) => {
      const groups = [...(prev.ingredientGroups ?? [])];
      const group = groups[groupIndex];
      const items = [...(group.items ?? [])];
      items.push({ label: '', amount: '' });
      groups[groupIndex] = { ...group, items };
      return { ...prev, ingredientGroups: groups };
    });
  };

  const updateGroupItem = (groupIndex: number, itemIndex: number, field: 'label' | 'amount', value: string) => {
    updateRecipe((prev) => {
      const groups = [...(prev.ingredientGroups ?? [])];
      const group = groups[groupIndex];
      const items = [...(group.items ?? [])];
      items[itemIndex] = { ...items[itemIndex], [field]: value };
      groups[groupIndex] = { ...group, items };
      return { ...prev, ingredientGroups: groups };
    });
  };

  const addStep = () => {
    updateRecipe((prev) => ({
      ...prev,
      steps: [...(prev.steps ?? []), { title: '', body: '' }],
    }));
  };

  const updateStep = (index: number, field: 'title' | 'body', value: string) => {
    updateRecipe((prev) => {
      const steps = [...(prev.steps ?? [])];
      steps[index] = { ...steps[index], [field]: value };
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

  const renderForm = () => {
    if (!formRecipe) return null;
    return (
      <div className="workspace-grid">
        <article className="workspace-card stack">
          <h3>Grunddata</h3>
          <label className="stack">
            <span className="text-sm text-muted">Titel</span>
            <input className="input" value={formRecipe.title} onChange={(e) => updateRecipe((prev) => ({ ...prev, title: e.target.value }))} />
          </label>
          <div className="two-col">
            <label className="stack">
              <span className="text-sm text-muted">Titel före (liten)</span>
              <input
                className="input"
                value={formRecipe.titlePrefix ?? ''}
                onChange={(e) => updateRecipe((prev) => ({ ...prev, titlePrefix: e.target.value }))}
                placeholder="t.ex. Chili-"
              />
            </label>
            <label className="stack">
              <span className="text-sm text-muted">Titel efter (liten)</span>
              <input
                className="input"
                value={formRecipe.titleSuffix ?? ''}
                onChange={(e) => updateRecipe((prev) => ({ ...prev, titleSuffix: e.target.value }))}
                placeholder="t.ex. med stekt majs"
              />
            </label>
          </div>
          <label className="stack">
            <span className="text-sm text-muted">Slug</span>
            <input className="input" value={formRecipe.slug} onChange={(e) => updateRecipe((prev) => ({ ...prev, slug: e.target.value }))} />
          </label>
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
          <div className="two-col">
            <label className="stack">
              <span className="text-sm text-muted">Portioner</span>
              <input
                className="input"
                type="number"
                value={formRecipe.servings}
                onChange={(e) => updateRecipe((prev) => ({ ...prev, servings: Number(e.target.value) || 0 }))}
              />
            </label>
            <label className="stack">
              <span className="text-sm text-muted">Förberedelsetid (min)</span>
              <input
                className="input"
                type="number"
                value={formRecipe.prepTimeMinutes}
                onChange={(e) => updateRecipe((prev) => ({ ...prev, prepTimeMinutes: Number(e.target.value) || 0 }))}
              />
            </label>
            <label className="stack">
              <span className="text-sm text-muted">Tillagningstid (min)</span>
              <input
                className="input"
                type="number"
                value={formRecipe.cookTimeMinutes}
                onChange={(e) => updateRecipe((prev) => ({ ...prev, cookTimeMinutes: Number(e.target.value) || 0 }))}
              />
            </label>
          </div>
          <label className="stack">
            <span className="text-sm text-muted">Beskrivning</span>
            <textarea
              className="input"
              rows={3}
              value={formRecipe.description ?? ''}
              onChange={(e) => updateRecipe((prev) => ({ ...prev, description: e.target.value }))}
            />
          </label>
        </article>

        <article className="workspace-card stack">
          <h3>Kategorier</h3>
          <label className="stack">
            <span className="text-sm text-muted">Plats (land/region/kontinent)</span>
            <input
              className="input"
              value={formRecipe.categoryPlace ?? ''}
              onChange={(e) => updateRecipe((prev) => ({ ...prev, categoryPlace: e.target.value }))}
            />
          </label>
          <label className="stack">
            <span className="text-sm text-muted">Basvara</span>
            <input
              className="input"
              value={formRecipe.categoryBase ?? ''}
              onChange={(e) => updateRecipe((prev) => ({ ...prev, categoryBase: e.target.value }))}
            />
          </label>
          <label className="stack">
            <span className="text-sm text-muted">Typ</span>
            <input
              className="input"
              value={formRecipe.categoryType ?? ''}
              onChange={(e) => updateRecipe((prev) => ({ ...prev, categoryType: e.target.value }))}
            />
          </label>
        </article>

        <article className="workspace-card stack">
          <h3>Ingredienser (utan grupp)</h3>
          <div className="stack" style={{ gap: '1rem' }}>
            {(formRecipe.ingredients ?? []).map((item, index) => (
              <div key={index} className="two-col">
                <label className="stack">
                  <span className="text-sm text-muted">Namn</span>
                  <input className="input" value={item.label} onChange={(e) => updateIngredient(index, 'label', e.target.value)} />
                </label>
                <label className="stack">
                  <span className="text-sm text-muted">Mängd</span>
                  <input className="input" value={item.amount ?? ''} onChange={(e) => updateIngredient(index, 'amount', e.target.value)} />
                </label>
              </div>
            ))}
            <button type="button" className="button-primary" onClick={addIngredient}>
              Lägg till ingrediens
            </button>
          </div>
        </article>

        <article className="workspace-card stack">
          <div className="flex" style={{ justifyContent: 'space-between', alignItems: 'center', gap: '1rem' }}>
            <h3>Ingrediensgrupper</h3>
            <button type="button" className="button-primary" onClick={addGroup}>
              Lägg till grupp
            </button>
          </div>
          <div className="stack" style={{ gap: '1.25rem' }}>
            {(formRecipe.ingredientGroups ?? []).map((group, groupIndex) => (
              <div key={groupIndex} className="stack" style={{ border: '1px solid #e5e7eb', borderRadius: '16px', padding: '1rem' }}>
                <label className="stack">
                  <span className="text-sm text-muted">Gruppens rubrik</span>
                  <input
                    className="input"
                    value={group.title ?? ''}
                    onChange={(e) => updateGroupTitle(groupIndex, e.target.value)}
                    placeholder="Sås, Garnityr, etc."
                  />
                </label>
                <div className="stack" style={{ gap: '1rem' }}>
                  {(group.items ?? []).map((item, itemIndex) => (
                    <div key={itemIndex} className="two-col">
                      <label className="stack">
                        <span className="text-sm text-muted">Namn</span>
                        <input
                          className="input"
                          value={item.label}
                          onChange={(e) => updateGroupItem(groupIndex, itemIndex, 'label', e.target.value)}
                        />
                      </label>
                      <label className="stack">
                        <span className="text-sm text-muted">Mängd</span>
                        <input
                          className="input"
                          value={item.amount ?? ''}
                          onChange={(e) => updateGroupItem(groupIndex, itemIndex, 'amount', e.target.value)}
                        />
                      </label>
                    </div>
                  ))}
                  <button type="button" className="button-primary" onClick={() => addGroupItem(groupIndex)}>
                    Lägg till ingrediens i grupp
                  </button>
                </div>
              </div>
            ))}
          </div>
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
              JSON måste vara giltig innan formuläret kan visas.
            </div>
          )}
        </div>
      </div>
      <div className="preview-grid__right">
        <button className="button-primary button-hero preview-grid__save" onClick={submit} disabled={saveDisabled}>
          {saving ? 'Sparar…' : 'Spara recept'}
        </button>
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
    </div>
  );
}
