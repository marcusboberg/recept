'use client';

import { useEffect, useMemo, useState } from 'react';
import { doc, getDoc } from 'firebase/firestore';
import { EditorShell } from '@/components/EditorShell';
import { StudioSidebar } from '@/components/StudioSidebar';
import { getFirebaseAuth, getFirestoreClient } from '@/lib/firebaseClient';
import { recipeToJson } from '@/lib/recipes';
import { recipeSchema } from '@/schema/recipeSchema';
import { getUserDisplay } from '@/lib/userDisplay';
import { onAuthStateChanged, signOut, type User } from 'firebase/auth';
import { StudioLoginCard } from './StudioLoginCard';

interface Props {
  slug: string;
}

export function EditRecipeSection({ slug }: Props) {
  const [json, setJson] = useState<string | null>(null);
  const [title, setTitle] = useState('');
  const [status, setStatus] = useState<'loading' | 'error' | 'ready'>('loading');
  const [error, setError] = useState<string | null>(null);
  const [activeView, setActiveView] = useState<'preview' | 'json'>('preview');

  const [authStatus, setAuthStatus] = useState<'loading' | 'authenticated' | 'unauthenticated'>('loading');
  const [user, setUser] = useState<User | null>(null);

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

  useEffect(() => {
    const auth = getFirebaseAuth();
    const unsubscribe = onAuthStateChanged(auth, (current) => {
      if (current) {
        setUser(current);
        setAuthStatus('authenticated');
      } else {
        setUser(null);
        setAuthStatus('unauthenticated');
      }
    });
    return unsubscribe;
  }, []);

  const handleLogout = async () => {
    const auth = getFirebaseAuth();
    await signOut(auth);
  };

  const handleBack = () => {
    if (typeof window !== 'undefined') {
      window.location.hash = '#/';
    }
  };

  const { name: profileName, initial: profileInitial } = getUserDisplay(user);

  const navSections = useMemo(
    () => [
      {
        id: 'import',
        label: 'Importera',
        iconClass: 'fa-solid fa-file-import',
        children: [
          { id: 'wordpress', label: 'WordPress', description: 'Klistra in länk', disabled: true },
          { id: 'chatgpt', label: 'ChatGPT', description: 'Prompt + text', disabled: true },
          { id: 'manual', label: 'JSON', description: 'Klistra in manuellt', disabled: true },
        ],
      },
      {
        id: 'workspace',
        label: 'Workspace',
        iconClass: 'fa-solid fa-laptop-code',
        children: [
          { id: 'preview', label: 'Review', description: 'Redigera & spara' },
          { id: 'json', label: 'JSON', description: 'Rådata' },
        ],
      },
    ],
    [],
  );

  const sidebarFooter = (
    <>
      {authStatus === 'loading' && (
        <div className="new-recipe-auth">
          <p className="text-sm text-muted" style={{ marginBottom: 0 }}>Kontrollerar behörighet…</p>
        </div>
      )}
      {authStatus === 'unauthenticated' && (
        <div className="new-recipe-auth">
          <p className="text-sm text-muted" style={{ marginBottom: 0 }}>Logga in i huvudrutan för att låsa upp studion.</p>
          <button type="button" className="nav-action" onClick={handleBack} style={{ marginTop: '0.5rem' }}>
            <i className="fa-solid fa-right-left" aria-hidden="true"></i>
            <span>Tillbaka</span>
          </button>
        </div>
      )}
      {authStatus === 'authenticated' && (
        <div className="new-recipe-auth">
          <div className="new-recipe-profile">
            <div className="new-recipe-profile__avatar">{profileInitial}</div>
            <div className="new-recipe-profile__meta">
              <p>{profileName}</p>
              <span>{user?.email ?? ''}</span>
            </div>
          </div>
          <div className="new-recipe-footer__divider" />
          <div className="new-recipe-footer__actions">
            <button type="button" className="nav-action" onClick={handleBack}>
              <i className="fa-solid fa-right-left" aria-hidden="true"></i>
              <span>Tillbaka</span>
            </button>
            <button type="button" className="nav-action" onClick={handleLogout}>
              <i className="fa-solid fa-arrow-right-from-bracket" aria-hidden="true"></i>
              <span>Logga ut</span>
            </button>
          </div>
        </div>
      )}
    </>
  );

  const contentClass = 'new-recipe-shell__content new-recipe-shell__content--locked';

  return (
    <div className="new-recipe-shell">
      <StudioSidebar
        title="Redigera recept"
        navSections={navSections}
        activeId={activeView}
        onSelect={(id) => setActiveView(id as 'preview' | 'json')}
        footer={sidebarFooter}
      />

      <div className={contentClass}>
        {status === 'loading' && (
          <div className="new-recipe-workspace">
            <div className="workspace-card stack">
              <p className="card-subtitle" style={{ marginBottom: 0 }}>Laddar recept…</p>
            </div>
          </div>
        )}
        {status === 'error' && (
          <div className="new-recipe-workspace">
            <div className="alert error">
              <p style={{ margin: 0 }}>{error ?? 'Kunde inte läsa receptet.'}</p>
            </div>
          </div>
        )}
        {status === 'ready' && json && (
          <>
            {authStatus === 'authenticated' ? (
              <>
                {activeView === 'preview' && (
                  <section className="preview-wall">
                    <EditorShell initialJson={json} initialTitle={title} mode="edit" forcedTab="form" />
                  </section>
                )}
                {activeView === 'json' && (
                  <section className="preview-wall">
                    <EditorShell initialJson={json} initialTitle={title} mode="edit" forcedTab="json" />
                  </section>
                )}
              </>
            ) : (
              <StudioLoginCard
                status={authStatus}
                onBack={handleBack}
                title="Logga in för att redigera"
                subtitle="Snabbinloggning med färdiga konton eller valfri e-post. Lösenord krävs alltid."
              />
            )}
          </>
        )}
      </div>
    </div>
  );
}
