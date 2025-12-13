import { commitRecipe, fetchFileSha, fetchGitHubUser, isUserAllowed } from '@/lib/github';
import { parseRecipe } from '@/lib/recipes';

export const runtime = 'edge';

export async function POST(request: Request) {
  const body = await request.json();
  const { content, message } = body as { content?: string; message?: string };
  if (!content) {
    return new Response(JSON.stringify({ error: 'Missing recipe content' }), { status: 400 });
  }

  const parsed = parseRecipe(content);
  if (!parsed.recipe) {
    return new Response(JSON.stringify({ error: parsed.errors }), { status: 400 });
  }

  const user = await fetchGitHubUser();
  if (!isUserAllowed(user)) {
    return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401 });
  }

  const path = `data/recipes/${parsed.recipe.slug}.json`;
  const sha = await fetchFileSha(path);
  await commitRecipe({
    recipe: parsed.recipe,
    path,
    sha,
    message: message ?? `Update recipe: ${parsed.recipe.title}`,
  });

  return new Response(JSON.stringify({ ok: true, path }), {
    status: 200,
    headers: { 'Content-Type': 'application/json' },
  });
}
