import { getDb } from '@/lib/firebaseAdmin';
import { isLoginAllowed } from '@/lib/auth';
import { getSessionLogin } from '@/lib/session';
import { parseRecipe } from '@/lib/recipes';

const isStaticExport = process.env.NEXT_STATIC_EXPORT === 'true';
const COLLECTION_NAME = 'recipes';

export const runtime = 'nodejs';
export const dynamic = isStaticExport ? 'force-static' : 'force-dynamic';

const jsonHeaders = { 'Content-Type': 'application/json' } as const;

export async function POST(request: Request) {
  if (isStaticExport) {
    return new Response(JSON.stringify({ error: 'Recipe editing is disabled in static export mode.' }), {
      status: 503,
      headers: jsonHeaders,
    });
  }

  const login = getSessionLogin(request);
  if (!isLoginAllowed(login)) {
    return new Response(JSON.stringify({ error: 'Unauthorized' }), {
      status: 401,
      headers: jsonHeaders,
    });
  }

  try {
    const body = await request.json();
    const { content } = body as { content?: string };
    if (!content) {
      return new Response(JSON.stringify({ error: 'Missing recipe content' }), { status: 400, headers: jsonHeaders });
    }

    const parsed = parseRecipe(content);
    if (!parsed.recipe) {
      return new Response(JSON.stringify({ error: parsed.errors }), { status: 400, headers: jsonHeaders });
    }

    const db = getDb();
    const docRef = db.collection(COLLECTION_NAME).doc(parsed.recipe.slug);
    const existing = await docRef.get();
    const now = new Date().toISOString();
    const createdAt = parsed.recipe.createdAt
      ?? (existing.exists ? (existing.data()?.createdAt as string | undefined) : undefined)
      ?? now;

    const payload = {
      ...parsed.recipe,
      createdAt,
      updatedAt: now,
    };

    await docRef.set(payload);

    return new Response(JSON.stringify({ ok: true, slug: parsed.recipe.slug }), {
      status: 200,
      headers: jsonHeaders,
    });
  } catch (error) {
    return new Response(JSON.stringify({ error: (error as Error).message }), {
      status: 500,
      headers: jsonHeaders,
    });
  }
}
