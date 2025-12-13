import Link from 'next/link';
import { loadAllRecipes } from '@/lib/data';
import type { Recipe } from '@/schema/recipeSchema';
import { RecipesShell } from '@/components/RecipesShell';

export default async function Home() {
  const recipes = await loadAllRecipes();
  return (
    <div className="space-y-6">
      <div className="flex" style={{ justifyContent: 'space-between', alignItems: 'center' }}>
        <div className="space-y-4">
          <p className="text-sm text-muted">Git is the CMS · JSON is canonical</p>
          <h2 className="text-2xl font-semibold">Recipes</h2>
          <p className="text-muted">Search, filter by tags, and edit via Git-backed JSON files.</p>
        </div>
        <Link className="button-primary" href="/new">New recipe</Link>
      </div>
      <RecipesShell recipes={recipes as Recipe[]} />
    </div>
  );
}
