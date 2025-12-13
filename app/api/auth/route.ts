import { fetchGitHubUser, isUserAllowed } from '@/lib/github';

export const runtime = 'edge';

export async function GET() {
  const user = await fetchGitHubUser();
  if (!isUserAllowed(user)) {
    return new Response(JSON.stringify({ authenticated: false }), { status: 401 });
  }
  return new Response(JSON.stringify({ authenticated: true, user }), {
    status: 200,
    headers: { 'Content-Type': 'application/json' },
  });
}
