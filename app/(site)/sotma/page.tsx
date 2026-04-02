import { PublicRecipesView } from '@/components/public/PublicRecipesView';
import { getPublicRecipesSnapshot } from '@/lib/publicRecipes.server';

export default async function SweetnessPage() {
  const recipes = await getPublicRecipesSnapshot();
  return <PublicRecipesView recipes={recipes} view={{ type: 'sweetness' }} />;
}
