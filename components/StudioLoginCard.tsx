'use client';

import { FormEvent, useRef, useState } from 'react';
import { signInWithEmailAndPassword } from 'firebase/auth';
import { getFirebaseAuth } from '@/lib/firebaseClient';

type AuthStatus = 'loading' | 'authenticated' | 'unauthenticated';

type QuickAccount = { id: string; label: string; value: string };

interface Props {
  status: AuthStatus;
  onBack?: () => void;
  title?: string;
  subtitle?: string;
  quickAccounts?: QuickAccount[];
}

const DEFAULT_QUICK_ACCOUNTS: QuickAccount[] = [
  { id: 'philip', label: 'Philip', value: 'philip.ottosson@gmail.com' },
  { id: 'marcus', label: 'Marcus', value: 'marcusboberg@icloud.com' },
];

export function StudioLoginCard({
  status,
  onBack,
  title = 'Logga in för att använda studion',
  subtitle = 'Snabbinloggning med färdiga konton eller valfri e-post. Lösenord krävs alltid.',
  quickAccounts = DEFAULT_QUICK_ACCOUNTS,
}: Props) {
  const [activeQuick, setActiveQuick] = useState<string>(quickAccounts[0]?.id ?? 'primary');
  const [email, setEmail] = useState<string>(quickAccounts[0]?.value ?? '');
  const [showCustomEmail, setShowCustomEmail] = useState(false);
  const [password, setPassword] = useState('');
  const [authSubmitting, setAuthSubmitting] = useState(false);
  const [authError, setAuthError] = useState<string | null>(null);
  const emailInputRef = useRef<HTMLInputElement | null>(null);

  const handleSelectQuick = (id: string) => {
    const account = quickAccounts.find((item) => item.id === id);
    if (!account) return;
    setActiveQuick(id);
    setShowCustomEmail(false);
    setEmail(account.value);
    setPassword('');
  };

  const handleLogin = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setAuthError(null);
    setAuthSubmitting(true);
    try {
      const auth = getFirebaseAuth();
      await signInWithEmailAndPassword(auth, email.trim(), password);
      setPassword('');
    } catch (error) {
      setAuthError((error as Error).message ?? 'Fel vid inloggning.');
    } finally {
      setAuthSubmitting(false);
    }
  };

  if (status === 'authenticated') {
    return null;
  }

  return (
    <div className="new-recipe-locked">
      <div className="workspace-card login-card">
        <div className="login-grid">
          <div className="login-pane">
            <div className="login-header">
              <h3 className="card-title">{title}</h3>
              <p className="card-subtitle" style={{ marginBottom: 0 }}>
                {subtitle}
              </p>
            </div>
            {status === 'loading' ? (
              <p className="text-sm text-muted" style={{ margin: 0 }}>Kontrollerar behörighet…</p>
            ) : (
              <form className="new-recipe-auth login-form" onSubmit={handleLogin}>
                <div className="login-block login-block--quick">
                  <div className="login-toggle" role="tablist" aria-label="Snabbinloggning">
                    {quickAccounts.map((account) => (
                      <button
                        key={account.id}
                        type="button"
                        role="tab"
                        aria-selected={activeQuick === account.id}
                        className={activeQuick === account.id ? 'login-toggle__item is-active' : 'login-toggle__item'}
                        onClick={() => handleSelectQuick(account.id)}
                      >
                        {account.label}
                      </button>
                    ))}
                  </div>
                </div>
                <div className="login-block login-block--fields">
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
                </div>
                <button type="submit" className="button-primary login-submit" disabled={authSubmitting}>
                  {authSubmitting ? 'Loggar in…' : 'Logga in'}
                </button>
                {authError && (
                  <p className="text-sm" style={{ color: '#b91c1c', margin: 0 }}>
                    {authError}
                  </p>
                )}
                <div className="login-divider">
                  <span>eller</span>
                </div>
                {showCustomEmail ? (
                  <div className="login-block login-block--custom">
                    <label className="space-y-1" style={{ width: '100%' }}>
                      <span className="text-sm text-muted">Annan e-postadress</span>
                      <input
                        className="input"
                        type="email"
                        value={email}
                        onChange={(event) => setEmail(event.target.value)}
                        required
                        ref={emailInputRef}
                      />
                    </label>
                    <div className="login-secondary">
                      <button
                        type="button"
                        className="nav-action login-back"
                        onClick={() => {
                          handleSelectQuick(quickAccounts[0]?.id ?? 'primary');
                          setShowCustomEmail(false);
                        }}
                      >
                        <i className="fa-solid fa-xmark" aria-hidden="true"></i>
                        <span>Avbryt annan adress</span>
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="login-secondary">
                    <p className="text-sm text-muted" style={{ margin: 0 }}>Behöver du en annan e-postadress?</p>
                    <button
                      type="button"
                      className="nav-action login-secondary__link"
                      onClick={() => {
                        setShowCustomEmail(true);
                        setActiveQuick('custom');
                        setEmail('');
                        setPassword('');
                        setTimeout(() => emailInputRef.current?.focus(), 0);
                      }}
                    >
                      <i className="fa-solid fa-envelope" aria-hidden="true"></i>
                      <span>Annan e-postadress</span>
                    </button>
                  </div>
                )}
                {onBack && (
                  <div className="new-recipe-footer__actions login-footer" style={{ alignItems: 'center' }}>
                    <button type="button" className="nav-action login-back" onClick={onBack}>
                      <i className="fa-solid fa-right-left" aria-hidden="true"></i>
                      <span>Tillbaka</span>
                    </button>
                  </div>
                )}
              </form>
            )}
          </div>
          <div className="login-visual" aria-hidden="true">
            <div className="login-visual__blur"></div>
          </div>
        </div>
      </div>
    </div>
  );
}
