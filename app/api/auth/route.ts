import { isLoginAllowed } from '@/lib/auth';
import { getSessionLogin } from '@/lib/session';

const isStaticExport = process.env.NEXT_STATIC_EXPORT === 'true';

export const runtime = 'nodejs';
export const dynamic = isStaticExport ? 'force-static' : 'force-dynamic';

export async function GET(request: Request) {
  if (isStaticExport) {
    return new Response(JSON.stringify({ authenticated: false, message: 'Auth disabled in static export.' }), {
      status: 503,
      headers: { 'Content-Type': 'application/json' },
    });
  }
  const login = getSessionLogin(request);
  if (!isLoginAllowed(login)) {
    return new Response(JSON.stringify({ authenticated: false }), {
      status: 401,
      headers: { 'Content-Type': 'application/json' },
    });
  }
  return new Response(JSON.stringify({ authenticated: true, user: { login } }), {
    status: 200,
    headers: { 'Content-Type': 'application/json' },
  });
}
