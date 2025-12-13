import { clearSessionCookie, sanitizeRedirectPath } from '@/lib/session';

const isStaticExport = process.env.NEXT_STATIC_EXPORT === 'true';

export const runtime = 'nodejs';
export const dynamic = isStaticExport ? 'force-static' : 'force-dynamic';

export async function GET(request: Request) {
  if (isStaticExport) {
    return new Response('Logout disabled in static export.', { status: 503 });
  }
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
