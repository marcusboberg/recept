import { createSessionCookie, decodeStateToken, sanitizeRedirectPath } from '@/lib/session';
import { isLoginAllowed } from '@/lib/github';

const isStaticExport = process.env.NEXT_STATIC_EXPORT === 'true';

export const runtime = 'nodejs';
export const dynamic = isStaticExport ? 'force-static' : 'force-dynamic';

interface GitHubUserResponse {
  login: string;
}

async function exchangeCodeForToken(code: string, redirectUri: string): Promise<string> {
  const clientId = process.env.GITHUB_OAUTH_CLIENT_ID;
  const clientSecret = process.env.GITHUB_OAUTH_CLIENT_SECRET;
  if (!clientId || !clientSecret) {
    throw new Error('GitHub OAuth configuration missing');
  }
  const response = await fetch('https://github.com/login/oauth/access_token', {
    method: 'POST',
    headers: {
      Accept: 'application/json',
    },
    body: new URLSearchParams({
      client_id: clientId,
      client_secret: clientSecret,
      code,
      redirect_uri: redirectUri,
    }),
  });
  const payload = await response.json().catch(() => null);
  if (!response.ok || !payload || typeof payload.access_token !== 'string') {
    throw new Error('Unable to exchange GitHub OAuth code');
  }
  return payload.access_token;
}

async function fetchGitHubProfile(token: string): Promise<GitHubUserResponse> {
  const response = await fetch('https://api.github.com/user', {
    headers: {
      Authorization: `Bearer ${token}`,
      Accept: 'application/vnd.github+json',
      'User-Agent': 'recept-app',
    },
    cache: 'no-store',
  });
  if (!response.ok) {
    throw new Error('Unable to fetch GitHub user profile');
  }
  return response.json() as Promise<GitHubUserResponse>;
}

export async function GET(request: Request) {
  if (isStaticExport) {
    return new Response('OAuth callback disabled in static export.', { status: 503 });
  }
  const url = new URL(request.url);
  const error = url.searchParams.get('error');
  if (error) {
    return new Response(`GitHub OAuth error: ${error}`, { status: 400 });
  }
  const code = url.searchParams.get('code');
  const state = url.searchParams.get('state');
  if (!code || !state) {
    return new Response('Missing OAuth parameters', { status: 400 });
  }
  const parsedState = decodeStateToken(state);
  if (!parsedState) {
    return new Response('Invalid OAuth state', { status: 400 });
  }
  const redirectPath = sanitizeRedirectPath(parsedState.redirect);
  const redirectUri = `${url.origin}/api/auth/callback`;

  try {
    const accessToken = await exchangeCodeForToken(code, redirectUri);
    const profile = await fetchGitHubProfile(accessToken);
    if (!isLoginAllowed(profile.login)) {
      return new Response('Unauthorized user', { status: 403 });
    }
    const cookie = createSessionCookie(profile.login);
    const redirectTarget = new URL(redirectPath, url.origin).toString();
    return new Response(null, {
      status: 302,
      headers: {
        Location: redirectTarget,
        'Set-Cookie': cookie,
      },
    });
  } catch (oauthError) {
    return new Response((oauthError as Error).message ?? 'OAuth callback failed', { status: 500 });
  }
}
