import { loadRecipe, listLocalRecipeSlugs } from '@/lib/data';
import { RecipeMobile } from '@/components/RecipeMobile';

interface Params {
  params: { slug: string };
}

export async function generateStaticParams() {
  const slugs = await listLocalRecipeSlugs();
  return slugs.map((slug) => ({ slug }));
}

export default async function RecipePage({ params }: Params) {
  const recipe = await loadRecipe(params.slug);
  return <RecipeMobile recipe={recipe} />;
}
