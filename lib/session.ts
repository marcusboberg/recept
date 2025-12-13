import crypto from 'crypto';

const SESSION_COOKIE = 'recept-session';
const STATE_TTL_SECONDS = 10 * 60; // 10 minutes
const SESSION_TTL_SECONDS = 30 * 24 * 60 * 60; // 30 days

type TokenPayload = {
  type: 'session' | 'state';
  login?: string;
  redirect?: string;
  nonce?: string;
  exp: number; // unix seconds
};

function getSecret(): string {
  const secret = process.env.SESSION_SECRET;
  if (!secret) {
    throw new Error('SESSION_SECRET is not set.');
  }
  return secret;
}

function base64UrlEncode(input: Buffer): string {
  return input.toString('base64url');
}

function base64UrlDecode(input: string): Buffer {
  return Buffer.from(input, 'base64url');
}

function sign(data: string): string {
  return crypto.createHmac('sha256', getSecret()).update(data).digest('base64url');
}

function encodeToken(payload: TokenPayload): string {
  const data = base64UrlEncode(Buffer.from(JSON.stringify(payload), 'utf8'));
  const signature = sign(data);
  return `${data}.${signature}`;
}

function decodeToken(token: string | null): TokenPayload | null {
  if (!token) return null;
  const [data, signature] = token.split('.');
  if (!data || !signature) return null;
  const expected = sign(data);
  const signatureBuffer = base64UrlDecode(signature);
  const expectedBuffer = base64UrlDecode(expected);
  if (signatureBuffer.length !== expectedBuffer.length || !crypto.timingSafeEqual(signatureBuffer, expectedBuffer)) {
    return null;
  }
  try {
    const payload = JSON.parse(base64UrlDecode(data).toString('utf8')) as TokenPayload;
    if (payload.exp * 1000 < Date.now()) {
      return null;
    }
    return payload;
  } catch (error) {
    return null;
  }
}

function serializeCookie(name: string, value: string, options: { maxAge?: number } = {}): string {
  const parts = [`${name}=${value}`];
  parts.push('Path=/');
  if (typeof options.maxAge === 'number') {
    parts.push(`Max-Age=${options.maxAge}`);
  }
  parts.push('HttpOnly');
  parts.push('SameSite=Lax');
  if (process.env.NODE_ENV !== 'development') {
    parts.push('Secure');
  }
  return parts.join('; ');
}

function parseCookies(header: string | null): Record<string, string> {
  const cookies: Record<string, string> = {};
  if (!header) return cookies;
  header.split(';').forEach((chunk) => {
    const [name, ...rest] = chunk.trim().split('=');
    if (!name) return;
    cookies[name] = rest.join('=');
  });
  return cookies;
}

export function createSessionCookie(login: string): string {
  const payload: TokenPayload = {
    type: 'session',
    login,
    exp: Math.floor(Date.now() / 1000) + SESSION_TTL_SECONDS,
  };
  const token = encodeToken(payload);
  return serializeCookie(SESSION_COOKIE, token, { maxAge: SESSION_TTL_SECONDS });
}

export function clearSessionCookie(): string {
  return serializeCookie(SESSION_COOKIE, '', { maxAge: 0 });
}

export function getSessionLogin(request: Request): string | null {
  const header = request.headers.get('cookie');
  const cookies = parseCookies(header);
  const token = cookies[SESSION_COOKIE];
  const payload = decodeToken(token ?? null);
  if (!payload || payload.type !== 'session' || typeof payload.login !== 'string') {
    return null;
  }
  return payload.login;
}

export function generateStateToken(redirectPath: string): string {
  const payload: TokenPayload = {
    type: 'state',
    nonce: crypto.randomUUID(),
    redirect: redirectPath,
    exp: Math.floor(Date.now() / 1000) + STATE_TTL_SECONDS,
  };
  return encodeToken(payload);
}

export function decodeStateToken(state: string | null): { redirect: string } | null {
  const payload = decodeToken(state ?? null);
  if (!payload || payload.type !== 'state' || typeof payload.redirect !== 'string') {
    return null;
  }
  return { redirect: payload.redirect };
}

export function sanitizeRedirectPath(pathname: string | null | undefined): string {
  if (!pathname) return '/';
  if (!pathname.startsWith('/')) {
    return '/';
  }
  return pathname;
}
