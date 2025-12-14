'use client';

import { useEffect, useState } from 'react';
import { doc, getDoc } from 'firebase/firestore';
import { AuthGate } from '@/components/AuthGate';
import { EditorShell } from '@/components/EditorShell';
import { getFirestoreClient } from '@/lib/firebaseClient';
import { recipeToJson } from '@/lib/recipes';
import { recipeSchema } from '@/schema/recipeSchema';

interface Props {
  slug: string;
}

export function EditRecipeSection({ slug }: Props) {
  const [json, setJson] = useState<string | null>(null);
  const [title, setTitle] = useState('');
  const [status, setStatus] = useState<'loading' | 'error' | 'ready'>('loading');
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let isMounted = true;
    const fetchRecipe = async () => {
      try {
        setStatus('loading');
        setError(null);
        const db = getFirestoreClient();
        const snapshot = await getDoc(doc(db, 'recipes', slug));
        if (!snapshot.exists()) {
          throw new Error('Receptet kunde inte hittas.');
        }
        const parsed = recipeSchema.parse(snapshot.data());
        if (!isMounted) return;
        setJson(recipeToJson(parsed));
        setTitle(parsed.title);
        setStatus('ready');
      } catch (fetchError) {
        if (!isMounted) return;
        setStatus('error');
        setError((fetchError as Error).message);
      }
    };
    fetchRecipe();
    return () => {
      isMounted = false;
    };
  }, [slug]);

  return (
    <div className="page-shell space-y-4">
      <a href="#/" className="button-ghost">← Tillbaka</a>
      {status === 'loading' && <div className="card"><p className="card-subtitle" style={{ marginBottom: 0 }}>Laddar recept…</p></div>}
      {status === 'error' && (
        <div className="alert error">
          <p style={{ margin: 0 }}>{error ?? 'Kunde inte läsa receptet.'}</p>
        </div>
      )}
      {status === 'ready' && json && (
        <AuthGate>
          <EditorShell initialJson={json} initialTitle={title} mode="edit" />
        </AuthGate>
      )}
    </div>
  );
}
