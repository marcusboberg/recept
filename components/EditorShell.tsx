'use client';

import { useEffect, useState } from 'react';
import { doc, setDoc } from 'firebase/firestore';
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

export function EditorShell({ initialJson, initialTitle, mode: _mode }: Props) {
  const [content, setContent] = useState(initialJson);
  const [errors, setErrors] = useState<string[]>([]);
  const [preview, setPreview] = useState<Recipe | null>(null);
  const [saving, setSaving] = useState(false);
  const [status, setStatus] = useState<string | null>(null);
  const [imageInput, setImageInput] = useState('');

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

  useEffect(() => {
    if (preview?.imageUrl && preview.imageUrl !== imageInput) {
      setImageInput(preview.imageUrl);
    }
    if (!preview?.imageUrl && imageInput) {
      setImageInput('');
    }
  }, [preview?.imageUrl, imageInput]);

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

  const handleImageUpdate = (value: string) => {
    setImageInput(value);
    const parsed = parseRecipe(content);
    if (parsed.recipe) {
      const updated: Recipe = {
        ...parsed.recipe,
        imageUrl: value,
      };
      setContent(recipeToJson(updated));
    }
  };

  const saveDisabled = saving || errors.length > 0;

  return (
    <div className="preview-grid">
      <div className="preview-grid__left">
        <div className="preview-grid__copy">
          <p className="eyebrow">Preview</p>
          <h2>Finjustera JSON och se exakt mobilvy innan du sparar.</h2>
          <p>JSON-editorn till vänster är bredare, och förhandsvisningen visar hur receptsidan ser ut på en liten skärm.</p>
        </div>
        <div className="preview-grid__editor">
          <div className="editor-toolbar">
            <div className="editor-toolbar__meta">
              <label className="stack" style={{ width: '100%', maxWidth: '360px' }}>
                <span className="text-sm text-muted">Bild-URL</span>
                <input
                  className="input"
                  type="url"
                  placeholder="https://example.com/bild.jpg"
                  value={imageInput}
                  onChange={(event) => handleImageUpdate(event.target.value)}
                />
              </label>
              <div className="text-sm text-muted">
                {errors.length > 0 ? 'Åtgärda valideringsfel innan du sparar.' : status ?? 'Skicka ändringar till Firebase när allt ser rätt ut.'}
              </div>
            </div>
          </div>
          <div className="preview-grid__json">
            <JsonEditor value={content} onChange={setContent} errors={errors} />
          </div>
        </div>
      </div>
      <div className="preview-grid__right">
        <button className="button-primary button-hero preview-grid__save" onClick={submit} disabled={saveDisabled}>
          {saving ? 'Sparar…' : 'Spara recept'}
        </button>
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
