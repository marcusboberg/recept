import { notFound, redirect } from 'next/navigation';
import { RecipeMobile } from '@/components/RecipeMobile';
import { getPublicRecipeBySlug } from '@/lib/publicRecipes.server';
import { getRecipePath, getRecipeQuickEditPath, RECIPE_QUICK_EDIT_SEARCH_PARAM } from '@/lib/routes';

export const dynamic = 'force-dynamic';

export default async function RecipePage({
  params,
  searchParams,
}: {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
  const { slug } = await params;
  const resolvedSearchParams = await searchParams;
  const { recipe, canonicalSlug } = await getPublicRecipeBySlug(slug);
  const quickEditParam = resolvedSearchParams[RECIPE_QUICK_EDIT_SEARCH_PARAM];
  const wantsQuickEdit =
    quickEditParam === '1' || (Array.isArray(quickEditParam) && quickEditParam.includes('1'));

  if (canonicalSlug && canonicalSlug !== slug) {
    redirect(wantsQuickEdit ? getRecipeQuickEditPath(canonicalSlug) : getRecipePath(canonicalSlug));
  }

  if (!recipe) {
    notFound();
  }

  return <RecipeMobile slug={recipe.slug} initialRecipe={recipe} />;
}
