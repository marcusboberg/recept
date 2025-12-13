'use client';

import { ChangeEvent, useEffect, useState } from 'react';
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
  const [uploading, setUploading] = useState(false);
  const [uploadMessage, setUploadMessage] = useState<string | null>(null);
  const [uploadError, setUploadError] = useState<string | null>(null);

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

  const updateImageUrl = (url: string) => {
    try {
      const parsed = JSON.parse(content);
      parsed.imageUrl = url;
      setContent(JSON.stringify(parsed, null, 2));
      setUploadMessage(`Bilden laddades upp och imageUrl sattes till ${url}. Förhandsvisningen kan sakna bilden tills den nya filen finns lokalt/deployerats.`);
      setUploadError(null);
    } catch (error) {
      setUploadMessage(`Bilden laddades upp: ${url}`);
      setUploadError('Kunde inte uppdatera JSON automatiskt. Klistra in URL:en manuellt.');
    }
  };

  const handleFileUpload = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    setUploading(true);
    setUploadMessage(null);
    setUploadError(null);
    const formData = new FormData();
    formData.append('file', file);
    try {
      const response = await fetch('/api/upload', {
        method: 'POST',
        body: formData,
      });
      const payload = await response.json().catch(() => null);
      if (!response.ok) {
        throw new Error(payload?.error ?? 'Kunde inte ladda upp bilden.');
      }
      if (!payload?.url) {
        throw new Error('Servern returnerade ingen bildadress.');
      }
      updateImageUrl(payload.url as string);
    } catch (error) {
      setUploadError((error as Error).message);
    } finally {
      setUploading(false);
      event.target.value = '';
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
          <div className="card space-y-2">
            <h3 className="card-title">Recipe image</h3>
            <p className="card-subtitle">Ladda upp en JPG, PNG eller WebP så uppdaterar vi fältet imageUrl.</p>
            <input
              type="file"
              accept="image/png,image/jpeg,image/webp"
              onChange={handleFileUpload}
              disabled={uploading}
            />
            {uploading && <span className="text-sm text-muted">Laddar upp…</span>}
            {uploadMessage && <span className="text-sm">{uploadMessage}</span>}
            {uploadError && (
              <span className="text-sm" style={{ color: '#b91c1c' }}>
                {uploadError}
              </span>
            )}
          </div>
          {preview ? <RecipePreview recipe={preview} /> : <div className="alert error">Invalid JSON</div>}
        </div>
      </div>
    </div>
  );
}
