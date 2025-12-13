import { commitRecipe, fetchFileSha, isLoginAllowed } from '@/lib/github';
import { parseRecipe } from '@/lib/recipes';
import { getSessionLogin } from '@/lib/session';

const isStaticExport = process.env.NEXT_STATIC_EXPORT === 'true';

export const runtime = 'nodejs';
export const dynamic = isStaticExport ? 'force-static' : 'force-dynamic';

const jsonHeaders = { 'Content-Type': 'application/json' };

export async function POST(request: Request) {
  try {
    if (isStaticExport) {
      return new Response(JSON.stringify({ error: 'GitHub commits disabled in static export.' }), {
        status: 503,
        headers: jsonHeaders,
      });
    }
    const body = await request.json();
    const { content, message } = body as { content?: string; message?: string };
    if (!content) {
      return new Response(JSON.stringify({ error: 'Missing recipe content' }), { status: 400, headers: jsonHeaders });
    }

    const parsed = parseRecipe(content);
    if (!parsed.recipe) {
      return new Response(JSON.stringify({ error: parsed.errors }), { status: 400, headers: jsonHeaders });
    }

    const login = getSessionLogin(request);
    if (!isLoginAllowed(login)) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401, headers: jsonHeaders });
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
      headers: jsonHeaders,
    });
  } catch (error) {
    const message = (error as Error).message ?? 'Unexpected server error';
    return new Response(JSON.stringify({ error: message }), {
      status: 500,
      headers: jsonHeaders,
    });
  }
}
