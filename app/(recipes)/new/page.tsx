import Link from 'next/link';
import { EditorShell } from '@/components/EditorShell';
import { recipeToJson } from '@/lib/recipes';
import { emptyRecipe } from '@/lib/templates';

export default function NewRecipePage() {
  return (
    <div className="space-y-4">
      <Link href="/" className="button-ghost">← Back</Link>
      <div className="space-y-2">
        <h2 className="text-2xl font-semibold">New recipe</h2>
        <p className="text-muted">Paste full JSON. Validation happens before committing to GitHub.</p>
      </div>
      <EditorShell initialJson={recipeToJson(emptyRecipe)} initialTitle={emptyRecipe.title} mode="new" />
    </div>
  );
}
