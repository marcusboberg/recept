import { NextResponse } from 'next/server';
import { getPublicRecipeBySlug, getPublicRecipesFresh } from '@/lib/publicRecipes.server';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  const url = new URL(request.url);
  const slug = url.searchParams.get('slug')?.trim();

  if (slug) {
    const { recipe, canonicalSlug } = await getPublicRecipeBySlug(slug);
    return NextResponse.json(
      {
        recipe,
        canonicalSlug,
      },
      {
        headers: {
          'cache-control': 'no-store, max-age=0',
        },
      },
    );
  }

  const recipes = await getPublicRecipesFresh();

  return NextResponse.json(
    { recipes },
    {
      headers: {
        'cache-control': 'no-store, max-age=0',
      },
    },
  );
}
