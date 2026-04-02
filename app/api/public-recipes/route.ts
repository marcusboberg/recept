import { NextResponse } from 'next/server';
import { getPublicRecipesFresh } from '@/lib/publicRecipes.server';

export const dynamic = 'force-dynamic';

export async function GET() {
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
