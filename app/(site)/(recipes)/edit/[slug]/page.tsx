import Link from 'next/link';
import { EditorShell } from '@/components/EditorShell';
import { loadRecipe, listLocalRecipeSlugs } from '@/lib/data';
import { recipeToJson } from '@/lib/recipes';

interface Params {
  params: { slug: string };
}

export async function generateStaticParams() {
  const slugs = await listLocalRecipeSlugs();
  return slugs.map((slug) => ({ slug }));
}

export default async function EditRecipePage({ params }: Params) {
  const recipe = await loadRecipe(params.slug);
  return (
    <div className="page-shell space-y-4">
      <Link href={`/${recipe.slug}`} className="button-ghost">← Back</Link>
      <div className="space-y-2">
        <h2 className="text-2xl font-semibold">Editing {recipe.title}</h2>
        <p className="text-muted">Paste updated JSON. Invalid files never reach main.</p>
      </div>
      <EditorShell initialJson={recipeToJson(recipe)} initialTitle={recipe.title} mode="edit" />
    </div>
  );
}
