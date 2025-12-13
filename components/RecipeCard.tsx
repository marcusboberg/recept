import Link from 'next/link';
import type { Recipe } from '@/schema/recipeSchema';
import { summarizeRecipe } from '@/lib/recipes';

interface Props {
  recipe: Recipe;
}

export function RecipeCard({ recipe }: Props) {
  return (
    <article className="card">
      <div className="card-title">{recipe.title}</div>
      <div className="card-subtitle">{recipe.description}</div>
      <div className="text-sm text-muted">{summarizeRecipe(recipe)}</div>
      <div className="list-inline" style={{ marginTop: '0.5rem', marginBottom: '0.75rem' }}>
        {recipe.tags.map((tag) => (
          <span key={tag} className="tag">{tag}</span>
        ))}
      </div>
      <div className="flex" style={{ gap: '0.5rem' }}>
        <Link className="button-primary" href={`/${recipe.slug}`}>
          View
        </Link>
        <Link className="button-ghost" href={`/edit/${recipe.slug}`}>
          Edit JSON
        </Link>
      </div>
    </article>
  );
}
