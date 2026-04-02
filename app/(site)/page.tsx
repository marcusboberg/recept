import { HomePageClient } from '@/components/public/HomePageClient';
import { getPublicRecipesSnapshot } from '@/lib/publicRecipes.server';

export const dynamic = 'force-dynamic';

export default async function Home() {
  const recipes = await getPublicRecipesSnapshot();
  return <HomePageClient recipes={recipes} />;
}
