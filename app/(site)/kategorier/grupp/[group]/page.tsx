import { notFound } from 'next/navigation';
import { PublicRecipesView } from '@/components/public/PublicRecipesView';
import { getPublicRecipesSnapshot } from '@/lib/publicRecipes.server';

export const dynamic = 'force-dynamic';

export default async function CategoryGroupPage({ params }: { params: Promise<{ group: string }> }) {
  const { group } = await params;
  if (group !== 'place' && group !== 'base') {
    notFound();
  }

  const recipes = await getPublicRecipesSnapshot();
  return <PublicRecipesView recipes={recipes} view={{ type: 'categoryGroup', group }} />;
}
