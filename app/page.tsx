import { loadAllRecipes } from '@/lib/data';
import type { Recipe } from '@/schema/recipeSchema';
import { RecipesShell } from '@/components/RecipesShell';

export default async function Home() {
  const recipes = await loadAllRecipes();
  return (
    <div className="page-shell space-y-6">
      <section className="hero">
        <div className="hero__copy">
          <p className="eyebrow">Minimal recipes</p>
          <h2 className="hero__title">Cook beautiful food with simple guidance.</h2>
          <p className="hero__subtitle">Browse, search, and open any dish in one tap.</p>
        </div>
      </section>
      <RecipesShell recipes={recipes as Recipe[]} />
    </div>
  );
}
