import Link from 'next/link';
import { loadRecipe, listLocalRecipeSlugs } from '@/lib/data';
import { RecipePreview } from '@/components/RecipePreview';

interface Params {
  params: { slug: string };
}

export async function generateStaticParams() {
  const slugs = await listLocalRecipeSlugs();
  return slugs.map((slug) => ({ slug }));
}

export default async function RecipePage({ params }: Params) {
  const recipe = await loadRecipe(params.slug);
  return (
    <div className="space-y-4">
      <Link href="/" className="button-ghost">← Back</Link>
      <RecipePreview recipe={recipe} />
      <div className="flex" style={{ gap: '0.5rem' }}>
        <Link className="button-primary" href={`/edit/${recipe.slug}`}>
          Edit JSON
        </Link>
      </div>
    </div>
  );
}
