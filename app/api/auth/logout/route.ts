import { clearSessionCookie, sanitizeRedirectPath } from '@/lib/session';

export const runtime = 'nodejs';

export async function GET(request: Request) {
  const url = new URL(request.url);
  const nextParam = url.searchParams.get('next');
  const redirectPath = sanitizeRedirectPath(nextParam);
  const target = new URL(redirectPath, url.origin).toString();
  return new Response(null, {
    status: 302,
    headers: {
      'Set-Cookie': clearSessionCookie(),
      Location: target,
    },
  });
}
