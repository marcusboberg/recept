import { isLoginAllowed } from '@/lib/github';
import { getSessionLogin } from '@/lib/session';

export const runtime = 'nodejs';

export async function GET(request: Request) {
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
