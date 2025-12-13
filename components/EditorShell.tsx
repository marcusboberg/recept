'use client';

import { useEffect, useState } from 'react';
import { JsonEditor } from '@/components/JsonEditor';
import { RecipePreview } from '@/components/RecipePreview';
import { parseRecipe } from '@/lib/recipes';
import type { Recipe } from '@/schema/recipeSchema';

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
      const res = await fetch('/api/github', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content, message: `${mode === 'new' ? 'Add' : 'Update'} recipe: ${initialTitle}` }),
      });
      if (!res.ok) {
        const payload = await res.json();
        throw new Error(payload.error ?? 'Unable to save');
      }
      setStatus('Saved to GitHub main branch.');
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
          {saving ? 'Saving…' : 'Commit to GitHub'}
        </button>
        {errors.length > 0 && <span className="text-sm text-muted">Fix validation errors before saving.</span>}
        {status && <span className="text-sm">{status}</span>}
      </div>
      <div className="two-col">
        <JsonEditor value={content} onChange={setContent} errors={errors} />
        <div className="space-y-4">
          <div className="card">
            <h3 className="card-title">Live preview</h3>
            <p className="card-subtitle">Paste full JSON. Invalid JSON is rejected before commit.</p>
          </div>
          {preview ? <RecipePreview recipe={preview} /> : <div className="alert error">Invalid JSON</div>}
        </div>
      </div>
    </div>
  );
}
