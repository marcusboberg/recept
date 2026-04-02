import { PublicRecipesView } from '@/components/public/PublicRecipesView';
import { getPublicRecipesSnapshot } from '@/lib/publicRecipes.server';

export const dynamic = 'force-dynamic';

export default async function CategoryPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const recipes = await getPublicRecipesSnapshot();
  return <PublicRecipesView recipes={recipes} view={{ type: 'category', slug }} />;
}
