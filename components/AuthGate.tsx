'use client';

import { FormEvent, ReactNode, useEffect, useState } from 'react';
import { onAuthStateChanged, signInWithEmailAndPassword, signOut, type User } from 'firebase/auth';
import { getFirebaseAuth } from '@/lib/firebaseClient';

type Status = 'loading' | 'authenticated' | 'unauthenticated';

interface Props {
  children: ReactNode;
}

export function AuthGate({ children }: Props) {
  const [status, setStatus] = useState<Status>('loading');
  const [user, setUser] = useState<User | null>(null);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    const auth = getFirebaseAuth();
    const unsubscribe = onAuthStateChanged(auth, (current) => {
      if (current) {
        setUser(current);
        setStatus('authenticated');
      } else {
        setUser(null);
        setStatus('unauthenticated');
      }
    });
    return unsubscribe;
  }, []);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setErrorMessage(null);
    setSubmitting(true);
    try {
      const auth = getFirebaseAuth();
      await signInWithEmailAndPassword(auth, email.trim(), password);
    } catch (error) {
      setErrorMessage((error as Error).message ?? 'Kunde inte logga in.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleLogout = async () => {
    const auth = getFirebaseAuth();
    await signOut(auth);
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
        <p className="card-subtitle">Logga in med ditt Firebase-konto för att skapa eller redigera recept.</p>
        <form className="space-y-2" onSubmit={handleSubmit}>
          <label className="space-y-1" style={{ display: 'block' }}>
            <span className="text-sm text-muted">E-postadress</span>
            <input
              type="text"
              className="input"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              required
            />
          </label>
          <label className="space-y-1" style={{ display: 'block' }}>
            <span className="text-sm text-muted">Lösenord</span>
            <input
              type="password"
              className="input"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
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
          <p className="card-title" style={{ marginBottom: 0 }}>{user?.email ?? user?.uid}</p>
        </div>
        <button className="button-ghost" type="button" onClick={handleLogout}>
          Logga ut
        </button>
      </div>
      {children}
    </div>
  );
}
