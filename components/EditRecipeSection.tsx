'use client';

import { FormEvent, useEffect, useMemo, useRef, useState } from 'react';
import { doc, getDoc } from 'firebase/firestore';
import { EditorShell } from '@/components/EditorShell';
import { StudioSidebar } from '@/components/StudioSidebar';
import { getFirebaseAuth, getFirestoreClient } from '@/lib/firebaseClient';
import { recipeToJson } from '@/lib/recipes';
import { recipeSchema } from '@/schema/recipeSchema';
import { getUserDisplay } from '@/lib/userDisplay';
import { onAuthStateChanged, signInWithEmailAndPassword, signOut, type User } from 'firebase/auth';

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
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [authSubmitting, setAuthSubmitting] = useState(false);
  const [authError, setAuthError] = useState<string | null>(null);
  const emailInputRef = useRef<HTMLInputElement | null>(null);

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

  const handleLogin = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setAuthError(null);
    setAuthSubmitting(true);
    try {
      const auth = getFirebaseAuth();
      await signInWithEmailAndPassword(auth, email.trim(), password);
      setEmail('');
      setPassword('');
    } catch (err) {
      setAuthError((err as Error).message ?? 'Fel vid inloggning.');
    } finally {
      setAuthSubmitting(false);
    }
  };

  const handleLogout = async () => {
    const auth = getFirebaseAuth();
    await signOut(auth);
  };

  const quickEmails = [
    { label: 'Marcus', value: 'marcusboberg@icloud.com' },
    { label: 'Philip', value: 'philip.ottosson@gmail.com' },
  ];

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
        <form className="new-recipe-auth" onSubmit={handleLogin}>
          <p className="nav-label">Logga in</p>
          <label className="space-y-1" style={{ width: '100%' }}>
            <span className="text-sm text-muted">E-post</span>
            <input
              className="input"
              type="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              required
              ref={emailInputRef}
            />
          </label>
          <label className="space-y-1" style={{ width: '100%' }}>
            <span className="text-sm text-muted">Lösenord</span>
            <input
              className="input"
              type="password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              required
            />
          </label>
          <div className="new-recipe-quicklogins">
            {quickEmails.map((account) => (
              <button
                type="button"
                key={account.value}
                className="chip-button"
                onClick={() => setEmail(account.value)}
              >
                {account.label}
              </button>
            ))}
          </div>
          <button type="submit" className="button-primary" disabled={authSubmitting}>
            {authSubmitting ? 'Loggar in…' : 'Logga in'}
          </button>
          {authError && (
            <p className="text-sm" style={{ color: '#b91c1c', margin: 0 }}>
              {authError}
            </p>
          )}
          <button type="button" className="nav-action" onClick={handleBack} style={{ marginTop: '0.5rem' }}>
            <i className="fa-solid fa-right-left" aria-hidden="true"></i>
            <span>Tillbaka</span>
          </button>
        </form>
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
              <div className="new-recipe-workspace">
                <div className="workspace-card stack">
                  <p className="card-title">Logga in för att redigera</p>
                  <p className="card-subtitle" style={{ marginBottom: 0 }}>
                    Använd formuläret i sidopanelen för att logga in med ditt Firebase-konto.
                  </p>
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
