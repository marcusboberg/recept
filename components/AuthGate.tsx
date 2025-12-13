'use client';

import { FormEvent, ReactNode, useEffect, useState } from 'react';

type Status = 'loading' | 'authenticated' | 'unauthenticated';

interface Props {
  children: ReactNode;
}

interface AuthResponse {
  authenticated: boolean;
  user?: { login: string };
}

export function AuthGate({ children }: Props) {
  const [status, setStatus] = useState<Status>('loading');
  const [login, setLogin] = useState<string | null>(null);
  const [nameInput, setNameInput] = useState('');
  const [codeInput, setCodeInput] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    let isMounted = true;
    const checkAuth = async () => {
      try {
        const response = await fetch('/api/auth', { cache: 'no-store' });
        if (!response.ok) {
          throw new Error('unauthorized');
        }
        const payload = (await response.json()) as AuthResponse;
        if (!payload.authenticated || !payload.user?.login) {
          throw new Error('unauthorized');
        }
        if (!isMounted) return;
        setLogin(payload.user.login);
        setStatus('authenticated');
      } catch (error) {
        if (!isMounted) return;
        setStatus('unauthenticated');
      }
    };
    checkAuth();
    return () => {
      isMounted = false;
    };
  }, []);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setErrorMessage(null);
    setSubmitting(true);
    try {
      const response = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ login: nameInput.trim(), code: codeInput }),
      });
      if (!response.ok) {
        const payload = await response.json().catch(() => null);
        throw new Error(payload?.error ?? 'Kunde inte logga in.');
      }
      window.location.reload();
    } catch (error) {
      setErrorMessage((error as Error).message);
    } finally {
      setSubmitting(false);
    }
  };

  if (status === 'loading') {
    return (
      <div className="card">
        <p className="card-subtitle" style={{ marginBottom: 0 }}>Kontrollerar behörighet…</p>
      </div>
    );
  }

  if (status === 'unauthenticated') {
    return (
      <div className="card space-y-3">
        <h3 className="card-title">Inloggning krävs</h3>
        <p className="card-subtitle">Endast personer med en hemlig kod kan skapa eller redigera recept.</p>
        <form className="space-y-2" onSubmit={handleSubmit}>
          <label className="space-y-1" style={{ display: 'block' }}>
            <span className="text-sm text-muted">Namn</span>
            <input
              type="text"
              className="input"
              value={nameInput}
              onChange={(event) => setNameInput(event.target.value)}
              required
            />
          </label>
          <label className="space-y-1" style={{ display: 'block' }}>
            <span className="text-sm text-muted">Hemlig kod</span>
            <input
              type="password"
              className="input"
              value={codeInput}
              onChange={(event) => setCodeInput(event.target.value)}
              required
            />
          </label>
          <button type="submit" className="button-primary" disabled={submitting}>
            {submitting ? 'Loggar in…' : 'Logga in'}
          </button>
          {errorMessage && (
            <p className="text-sm" style={{ color: '#b91c1c', margin: 0 }}>
              {errorMessage}
            </p>
          )}
        </form>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="card" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '0.75rem', flexWrap: 'wrap' }}>
        <div>
          <p className="card-subtitle" style={{ marginBottom: '0.1rem' }}>Inloggad som</p>
          <p className="card-title" style={{ marginBottom: 0 }}>{login}</p>
        </div>
        <a className="button-ghost" href="/api/auth/logout">Logga ut</a>
      </div>
      {children}
    </div>
  );
}
