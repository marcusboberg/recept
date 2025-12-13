import type { Metadata } from 'next';
import { loadRecipe, listRecipeSlugs } from '@/lib/data';
import { RecipeMobile } from '@/components/RecipeMobile';

interface Params {
  params: { slug: string };
}

export async function generateStaticParams() {
  const slugs = await listRecipeSlugs();
  return slugs.map((slug) => ({ slug }));
}

export async function generateMetadata({ params }: Params): Promise<Metadata> {
  const recipe = await loadRecipe(params.slug);
  const description = recipe.description ?? `Kolla in receptet ${recipe.title}.`;
  const imageUrl = recipe.imageUrl?.trim();

  return {
    title: recipe.title,
    description,
    openGraph: {
      title: recipe.title,
      description,
      type: 'article',
      url: `/${recipe.slug}`,
      images: imageUrl
        ? [
            {
              url: imageUrl,
              alt: recipe.title,
            },
          ]
        : undefined,
    },
    twitter: {
      card: imageUrl ? 'summary_large_image' : 'summary',
      title: recipe.title,
      description,
      images: imageUrl ? [imageUrl] : undefined,
    },
  };
}

export default async function RecipePage({ params }: Params) {
  const recipe = await loadRecipe(params.slug);
  return <RecipeMobile recipe={recipe} />;
}
