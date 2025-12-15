'use client';

import { FormEvent, useEffect, useMemo, useRef, useState } from 'react';
import { onAuthStateChanged, signInWithEmailAndPassword, signOut, type User } from 'firebase/auth';
import { ChatPromptCard } from './ChatPromptCard';
import { EditorShell } from './EditorShell';
import { WordPressImportCard } from './WordPressImportCard';
import { getFirebaseAuth } from '@/lib/firebaseClient';

interface Props {
  initialJson: string;
  initialTitle: string;
}

type ImportView = 'wordpress' | 'chatgpt' | 'manual' | 'preview';

function ManualJsonCard({ onImport }: { onImport: (json: string, title: string) => void }) {
  const [value, setValue] = useState('');
  const [status, setStatus] = useState<string | null>(null);

  const handleLoad = () => {
    if (!value.trim()) {
      setStatus('Klistra in JSON först.');
      return;
    }
    onImport(value, 'Manuell JSON');
    setStatus('JSON laddad i editorn.');
  };

  return (
    <div className="workspace-card stack">
      <div>
        <h3 className="card-title">Klistra in JSON</h3>
        <p className="card-subtitle">Hoppa över importflöden och klistra in JSON direkt.</p>
      </div>
      <textarea
        rows={10}
        value={value}
        onChange={(event) => setValue(event.target.value)}
        placeholder='{ "title": "Ny rätt", ... }'
      />
      <div className="flex" style={{ gap: '0.5rem', alignItems: 'center', flexWrap: 'wrap' }}>
        <button type="button" className="button-primary" onClick={handleLoad}>
          Ladda i editor
        </button>
        {status && <span className="text-sm text-muted">{status}</span>}
      </div>
    </div>
  );
}

export function NewRecipeSection({ initialJson, initialTitle }: Props) {
  const [editorPayload, setEditorPayload] = useState({ json: initialJson, title: initialTitle });
  const [editorKey, setEditorKey] = useState(0);
  const [activeView, setActiveView] = useState<ImportView>('wordpress');
  const [authStatus, setAuthStatus] = useState<'loading' | 'authenticated' | 'unauthenticated'>('loading');
  const [user, setUser] = useState<User | null>(null);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [authSubmitting, setAuthSubmitting] = useState(false);
  const [authError, setAuthError] = useState<string | null>(null);
  const emailInputRef = useRef<HTMLInputElement | null>(null);

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

  const handleImport = (json: string, title: string) => {
    setEditorPayload({ json, title });
    setEditorKey((value) => value + 1);
    setActiveView('preview');
  };

  const navSections = useMemo(
    () => [
      {
        id: 'import',
        label: 'Importera',
        iconClass: 'fa-solid fa-file-import',
        children: [
          { id: 'wordpress' as const, label: 'WordPress', description: 'Klistra in länk' },
          { id: 'chatgpt' as const, label: 'ChatGPT', description: 'Prompt + text' },
          { id: 'manual' as const, label: 'JSON', description: 'Klistra in manuellt' },
        ],
      },
      {
        id: 'workspace',
        label: 'Workspace',
        iconClass: 'fa-solid fa-laptop-code',
        children: [{ id: 'preview' as const, label: 'Preview', description: 'Redigera & spara' }],
      },
    ],
    [],
  );

  const userAliases: Record<string, string> = {
    'marcusboberg@icloud.com': 'Marcus',
    'philip.ottosson@gmail.com': 'Philip',
  };

  const quickEmails = [
    { label: 'Marcus', value: 'marcusboberg@icloud.com' },
    { label: 'Philip', value: 'philip.ottosson@gmail.com' },
  ];

  const currentAlias = userAliases[user?.email ?? ''];
  const profileName = currentAlias ?? user?.email ?? user?.uid ?? 'User';
  const profileInitial = profileName.charAt(0).toUpperCase();

  const handleBack = () => {
    if (typeof window !== 'undefined') {
      window.location.hash = '#/';
    }
  };

  const handleLogin = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setAuthError(null);
    setAuthSubmitting(true);
    try {
      const auth = getFirebaseAuth();
      await signInWithEmailAndPassword(auth, email.trim(), password);
      setEmail('');
      setPassword('');
    } catch (error) {
      setAuthError((error as Error).message ?? 'Fel vid inloggning.');
    } finally {
      setAuthSubmitting(false);
    }
  };

  const handleLogout = async () => {
    const auth = getFirebaseAuth();
    await signOut(auth);
  };

  const isAuthenticated = authStatus === 'authenticated';

  const contentClass =
    activeView === 'preview' ? 'new-recipe-shell__content new-recipe-shell__content--locked' : 'new-recipe-shell__content';

  return (
    <div className="new-recipe-shell">
      <aside className="new-recipe-shell__sidebar">
        <div className="new-recipe-brand">
          <div className="new-recipe-brand__logo">R</div>
          <div className="new-recipe-brand__copy">
            <p className="new-recipe-brand__name">Recept</p>
            <p className="new-recipe-brand__section">Studio</p>
          </div>
          <span className="new-recipe-brand__pill">v1.0</span>
        </div>
        <h1 className="new-recipe-title">Ny rätt</h1>
        <nav className="new-recipe-nav">
          {navSections.map((section) => (
            <div key={section.id} className="new-recipe-nav__section">
              <div className="new-recipe-nav__parent">
                <span className="nav-icon-badge">
                  <i className={`nav-icon ${section.iconClass}`} aria-hidden="true"></i>
                </span>
                <span className="nav-copy">
                  <span className="nav-label">{section.label}</span>
                </span>
              </div>
              <div className="new-recipe-nav__children">
                {section.children.map((item) => (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => setActiveView(item.id)}
                    className={activeView === item.id ? 'new-recipe-nav__child is-active' : 'new-recipe-nav__child'}
                  >
                    <span>{item.label}</span>
                    <span className="nav-description">{item.description}</span>
                  </button>
                ))}
              </div>
            </div>
          ))}
        </nav>
        <div className="new-recipe-footer">
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
                <input className="input" type="password" value={password} onChange={(event) => setPassword(event.target.value)} required />
              </label>
              <div className="new-recipe-quicklogins">
                {quickEmails.map((account) => (
                  <button
                    type="button"
                    key={account.value}
                    className="chip-button"
                    onClick={() => {
                      setEmail(account.value);
                      setPassword('');
                      emailInputRef.current?.focus();
                    }}
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
              <button type="button" className="nav-action" onClick={handleBack}>
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
        </div>
      </aside>
      <div className={contentClass}>
        {!isAuthenticated && (
          <div className="new-recipe-locked">
            <div className="workspace-card stack" style={{ maxWidth: '520px', textAlign: 'center' }}>
              <h3 className="card-title">Logga in för att använda studion</h3>
              <p className="card-subtitle" style={{ marginBottom: 0 }}>
                Använd fälten i sidopanelen för att logga in med ditt Firebase-konto. Import- och preview-verktygen låses upp direkt.
              </p>
            </div>
          </div>
        )}
        {isAuthenticated && (
          <>
            {activeView === 'wordpress' && (
              <section className="new-recipe-workspace">
                <header className="workspace-hero">
                  <p className="eyebrow">WordPress-import</p>
                  <h2>Klistra in länken, vi hämtar HTML och bygger JSON.</h2>
                  <p>
                    Skriv in en offentlig WordPress-URL så hämtar vi källkoden, tolkar checklistor och flikar och fyller editorn automatiskt.
                    Dubbelkolla alltid tider och portioner i preview-läget.
                  </p>
                </header>
                <div className="workspace-single">
                  <WordPressImportCard onImport={handleImport} className="workspace-card stack" />
                </div>
              </section>
            )}

            {activeView === 'chatgpt' && (
              <section className="new-recipe-workspace">
                <header className="workspace-hero">
                  <p className="eyebrow">ChatGPT</p>
                  <h2>Klistra in text, kör prompten och fyll editorn på sekunder.</h2>
                  <p>Kopiera prompten, lägg in fritexten under och kör i valfri GPT-klient. Klistra sedan in JSON i preview.</p>
                  <div className="workspace-hero__cta">
                    <button type="button" className="button-ghost" onClick={() => setActiveView('preview')}>
                      Gå till preview
                    </button>
                  </div>
                </header>
                <div className="workspace-grid">
                  <article className="workspace-card stack">
                    <h3>Workflow</h3>
                    <ol className="workspace-list workspace-list--numbered">
                      <li>Klistra in originaltexten i promptkortet här.</li>
                      <li>Kopiera prompten (inkl. text) och kör i ChatGPT.</li>
                      <li>Ta JSON-utdata och klistra in i preview-vyn.</li>
                    </ol>
                    <p className="text-sm text-muted">Be GPT alltid svara som ren JSON utan kommentarer.</p>
                  </article>
                  <ChatPromptCard
                    className="workspace-card stack"
                    prompt={`Du är en formatkonverterare som tar ett recept i fritext och svarar med exakt JSON för webbplatsen Recept.

1. Läs texten och hämta titel, beskrivning, tid, portioner, ingredienser, ev. grupper och steg.
2. Ge mig giltig JSON och INGEN annan text. Använd följande struktur och fyll alla fält:
{
  "title": "",
  "slug": "",
  "description": "",
  "imageUrl": "/images/recipes/new-recipe.jpg",
  "tags": [],
  "prepTimeMinutes": 0,
  "cookTimeMinutes": 0,
  "servings": 0,
  "ingredients": [
    { "label": "", "amount": "", "notes": "" }
  ],
  "ingredientGroups": [
    {
      "title": "",
      "items": [{ "label": "", "amount": "", "notes": "" }]
    }
  ],
  "steps": [
    { "title": "", "body": "" }
  ],
  "source": "",
  "createdAt": "",
  "updatedAt": ""
}

Regler:
- "slug" ska vara titeln i kebab-case (små bokstäver, siffror och bindestreck).
- "tags" är 3–5 korta etiketter, skrivna i engelska eller svenska beroende på texten.
- Tider anges i heltal minuter. Sätt 0 om texten saknar information.
- "imageUrl" är en URL. Behåll default-värdet om inget anges.
- Använd ENDAST raka ASCII-citattecken (") runt alla strängar och nycklar.
- Svara som ett rent \`\`\`json ... \`\`\`-block (inga andra tecken före eller efter) så att alla citattecken förblir ASCII.
- "ingredients" är alltid en lista med { label, amount?, notes? }. Lämna bort fält som saknar värde (ingen tom sträng).
- Använd "ingredientGroups" endast om texten har tydliga sektioner; annars utelämna hela fältet.
- "steps" är i rätt ordning. "title" är valfri, "body" ska alltid fyllas.
- "source" ska vara en URL om den finns, annars utelämna fältet.
- "createdAt" och "updatedAt" är ISO 8601 i UTC (t.ex. 2024-01-05T12:00:00.000Z). Använd dagens datum om texten saknar datum.
- Svara aldrig med kommentarer eller Markdown, endast ren JSON.`}
                  />
                </div>
              </section>
            )}

            {activeView === 'manual' && (
              <section className="new-recipe-workspace">
                <header className="workspace-hero">
                  <p className="eyebrow">Manuell JSON</p>
                  <h2>Pasta in JSON direkt om du redan har den färdig.</h2>
                  <p>Vi validerar när du sparar, men här kan du snabbtesta strukturen och hoppa direkt till editor.</p>
                  <div className="workspace-hero__cta">
                    <button type="button" className="button-ghost" onClick={() => setActiveView('preview')}>
                      Till preview
                    </button>
                  </div>
                </header>
                <div className="workspace-grid">
                  <ManualJsonCard onImport={handleImport} />
                  <article className="workspace-card stack">
                    <h3>Tips</h3>
                    <ul className="workspace-list">
                      <li>Fyll alltid i <code>createdAt</code> och <code>updatedAt</code> med ISO-datum.</li>
                      <li>Glöm inte <code>slug</code> – används i URL:en.</li>
                      <li>Om du saknar grupper, ta bort hela <code>ingredientGroups</code>-fältet.</li>
                    </ul>
                    <p className="text-sm text-muted">Obs! Klicka på preview efter import för att redigera fälten visuellt.</p>
                  </article>
                </div>
              </section>
            )}

            {activeView === 'preview' && (
              <section className="preview-wall">
                <EditorShell key={editorKey} initialJson={editorPayload.json} initialTitle={editorPayload.title} mode="new" />
              </section>
            )}
          </>
        )}
      </div>
    </div>
  );
}
