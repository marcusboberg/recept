import type { Metadata } from 'next';
import { notFound, redirect } from 'next/navigation';
import { RecipeMobile } from '@/components/RecipeMobile';
import { getPublicRecipeBySlug } from '@/lib/publicRecipes.server';
import { getRecipePath, getRecipeQuickEditPath, RECIPE_QUICK_EDIT_SEARCH_PARAM } from '@/lib/routes';

export const dynamic = 'force-dynamic';

const defaultSiteUrl = 'http://localhost:3000';
const rawSiteUrl = process.env.NEXT_PUBLIC_APP_URL ?? defaultSiteUrl;
const siteUrl = rawSiteUrl.startsWith('http') ? rawSiteUrl : `https://${rawSiteUrl}`;

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  const { recipe, canonicalSlug } = await getPublicRecipeBySlug(slug);

  if (!recipe) {
    return {
      title: 'Recept saknas',
      description: 'Det här receptet kunde inte laddas.',
    };
  }

  const resolvedRecipe = recipe;
  const title = resolvedRecipe.title || 'Recept';
  const description = resolvedRecipe.description || 'Ett recept från recept.marcusboberg.se';
  const resolvedSlug = canonicalSlug ?? resolvedRecipe.slug;
  const canonical = `${siteUrl}${getRecipePath(resolvedSlug)}`;
  const shareImage = `${siteUrl}/api/share/${resolvedSlug}`;

  return {
    title,
    description,
    alternates: {
      canonical,
    },
    openGraph: {
      type: 'article',
      title,
      description,
      url: canonical,
      siteName: 'Recept',
      images: [
        {
          url: shareImage,
          width: 1080,
          height: 1920,
          alt: title,
        },
      ],
    },
    twitter: {
      card: 'summary_large_image',
      title,
      description,
      images: [shareImage],
    },
  };
}

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
