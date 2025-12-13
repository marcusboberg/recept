import { Suspense } from 'react';
import Link from 'next/link';
import { AuthGate } from '@/components/AuthGate';
import { EditorShell } from '@/components/EditorShell';
import { loadRecipe, listRecipeSlugs } from '@/lib/data';
import { recipeToJson } from '@/lib/recipes';

interface Params {
  params: { slug: string };
}

export async function generateStaticParams() {
  const slugs = await listRecipeSlugs();
  return slugs.map((slug) => ({ slug }));
}

export default async function EditRecipePage({ params }: Params) {
  const recipe = await loadRecipe(params.slug);
  return (
    <div className="page-shell space-y-4">
      <Link href={`/${recipe.slug}`} className="button-ghost">← Back</Link>
      <div className="space-y-2">
        <h2 className="text-2xl font-semibold">Editing {recipe.title}</h2>
        <p className="text-muted">Paste updated JSON. Invalid data never reaches Firestore.</p>
      </div>
      <Suspense fallback={<div className="card"><p className="card-subtitle" style={{ marginBottom: 0 }}>Kontrollerar behörighet…</p></div>}>
        <AuthGate>
          <Suspense fallback={<div className="card"><p className="card-subtitle" style={{ marginBottom: 0 }}>Laddar editorn…</p></div>}>
            <EditorShell initialJson={recipeToJson(recipe)} initialTitle={recipe.title} mode="edit" />
          </Suspense>
        </AuthGate>
      </Suspense>
    </div>
  );
}
