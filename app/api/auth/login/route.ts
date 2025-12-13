import { generateStateToken, sanitizeRedirectPath } from '@/lib/session';

export const runtime = 'nodejs';

export async function GET(request: Request) {
  const clientId = process.env.GITHUB_OAUTH_CLIENT_ID;
  const baseUrl = new URL(request.url);
  if (!clientId) {
    return new Response('GitHub OAuth client ID is missing.', { status: 500 });
  }
  const nextParam = baseUrl.searchParams.get('next');
  const redirectPath = sanitizeRedirectPath(nextParam);
  const state = generateStateToken(redirectPath);
  const callbackUrl = `${baseUrl.origin}/api/auth/callback`;
  const authorize = new URL('https://github.com/login/oauth/authorize');
  authorize.searchParams.set('client_id', clientId);
  authorize.searchParams.set('scope', 'read:user');
  authorize.searchParams.set('redirect_uri', callbackUrl);
  authorize.searchParams.set('state', state);

  return new Response(null, {
    status: 302,
    headers: {
      Location: authorize.toString(),
    },
  });
}
