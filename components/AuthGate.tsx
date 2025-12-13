'use client';

import { ReactNode, useEffect, useState } from 'react';
import { usePathname, useSearchParams } from 'next/navigation';

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
  const pathname = usePathname() ?? '/';
  const searchParams = useSearchParams();
  const nextPath = searchParams && searchParams.toString().length > 0
    ? `${pathname}?${searchParams.toString()}`
    : pathname;
  const loginUrl = `/api/auth/login?next=${encodeURIComponent(nextPath)}`;

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
        <p className="card-subtitle">Endast godkända GitHub-konton kan skapa eller redigera recept.</p>
        <a className="button-primary" href={loginUrl}>Logga in med GitHub</a>
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
