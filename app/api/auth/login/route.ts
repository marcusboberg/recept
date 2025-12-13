import { isLoginAllowed, verifyLoginCode } from '@/lib/auth';
import { createSessionCookie } from '@/lib/session';

const isStaticExport = process.env.NEXT_STATIC_EXPORT === 'true';

export const runtime = 'nodejs';
export const dynamic = isStaticExport ? 'force-static' : 'force-dynamic';

const jsonHeaders = { 'Content-Type': 'application/json' } as const;

export async function POST(request: Request) {
  if (isStaticExport) {
    return new Response(JSON.stringify({ error: 'Login disabled in static export.' }), {
      status: 503,
      headers: jsonHeaders,
    });
  }

  try {
    const body = await request.json().catch(() => null) as { login?: string; code?: string } | null;
    const login = body?.login?.trim();
    const code = body?.code ?? '';
    if (!login || !code) {
      return new Response(JSON.stringify({ error: 'Login and code are required.' }), {
        status: 400,
        headers: jsonHeaders,
      });
    }

    if (!isLoginAllowed(login) || !verifyLoginCode(login, code)) {
      return new Response(JSON.stringify({ error: 'Invalid credentials.' }), {
        status: 401,
        headers: jsonHeaders,
      });
    }

    const cookie = createSessionCookie(login);
    return new Response(JSON.stringify({ ok: true, login }), {
      status: 200,
      headers: {
        ...jsonHeaders,
        'Set-Cookie': cookie,
      },
    });
  } catch (error) {
    return new Response(JSON.stringify({ error: (error as Error).message }), {
      status: 500,
      headers: jsonHeaders,
    });
  }
}
