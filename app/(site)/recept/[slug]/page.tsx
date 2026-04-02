import { notFound, redirect } from 'next/navigation';
import { RecipeMobile } from '@/components/RecipeMobile';
import { getPublicRecipeBySlug } from '@/lib/publicRecipes.server';
import { getRecipePath } from '@/lib/routes';

export default async function RecipePage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const { recipe, canonicalSlug } = await getPublicRecipeBySlug(slug);

  if (canonicalSlug && canonicalSlug !== slug) {
    redirect(getRecipePath(canonicalSlug));
  }

  if (!recipe) {
    notFound();
  }

  return <RecipeMobile slug={recipe.slug} initialRecipe={recipe} />;
}
