'use client';

import { useEffect, useState } from 'react';
import { doc, setDoc } from 'firebase/firestore';
import { JsonEditor } from '@/components/JsonEditor';
import { RecipePreview } from '@/components/RecipePreview';
import { parseRecipe } from '@/lib/recipes';
import type { Recipe } from '@/schema/recipeSchema';
import { getFirestoreClient } from '@/lib/firebaseClient';

interface Props {
  initialJson: string;
  initialTitle: string;
  mode: 'new' | 'edit';
}

export function EditorShell({ initialJson, initialTitle, mode }: Props) {
  const [content, setContent] = useState(initialJson);
  const [errors, setErrors] = useState<string[]>([]);
  const [preview, setPreview] = useState<Recipe | null>(null);
  const [saving, setSaving] = useState(false);
  const [status, setStatus] = useState<string | null>(null);

  useEffect(() => {
    const parsed = parseRecipe(content);
    if (parsed.errors) {
      setErrors(parsed.errors);
      setPreview(null);
    } else if (parsed.recipe) {
      setErrors([]);
      setPreview(parsed.recipe);
    }
  }, [content]);

  const submit = async () => {
    setSaving(true);
    setStatus(null);
    try {
      const parsed = parseRecipe(content);
      if (parsed.errors || !parsed.recipe) {
        throw new Error('Fix validation errors before saving.');
      }
      const db = getFirestoreClient();
      const now = new Date().toISOString();
      const payload: Recipe = {
        ...parsed.recipe,
        createdAt: parsed.recipe.createdAt ?? now,
        updatedAt: now,
      };
      await setDoc(doc(db, 'recipes', payload.slug), payload);
      setStatus('Recipe saved to Firebase.');
    } catch (error) {
      setStatus((error as Error).message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex" style={{ gap: '0.5rem', alignItems: 'center', flexWrap: 'wrap' }}>
        <button className="button-primary" onClick={submit} disabled={saving || errors.length > 0}>
          {saving ? 'Saving…' : 'Save recipe'}
        </button>
        {errors.length > 0 && <span className="text-sm text-muted">Fix validation errors before saving.</span>}
        {status && <span className="text-sm">{status}</span>}
      </div>
      <div className="two-col">
        <JsonEditor value={content} onChange={setContent} errors={errors} />
        <div className="space-y-4">
          <div className="card">
            <h3 className="card-title">Live preview</h3>
            <p className="card-subtitle">Paste full JSON. Invalid JSON is rejected before saving.</p>
          </div>
          <div className="card space-y-2">
            <h3 className="card-title">Images</h3>
            <p className="card-subtitle">Sätt fältet imageUrl till en publik bildadress (t.ex. från egen hosting eller WordPress). Uppladdningar hanteras externt.</p>
          </div>
          {preview ? <RecipePreview recipe={preview} /> : <div className="alert error">Invalid JSON</div>}
        </div>
      </div>
    </div>
  );
}
