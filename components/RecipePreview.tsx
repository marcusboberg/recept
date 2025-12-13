import type { Recipe } from '@/schema/recipeSchema';
import { summarizeRecipe } from '@/lib/recipes';

interface Props {
  recipe: Recipe;
}

export function RecipePreview({ recipe }: Props) {
  return (
    <div className="card">
      <div className="flex" style={{ justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <div className="text-2xl font-semibold">{recipe.title}</div>
          <div className="text-sm text-muted">{recipe.description}</div>
        </div>
        <div className="badge">{summarizeRecipe(recipe)}</div>
      </div>
      <div className="divider" />
      <div className="two-col">
        <section className="stack">
          <h3 className="text-lg font-semibold">Ingredients</h3>
          <ul className="stack" style={{ padding: 0, margin: 0, listStyle: 'none' }}>
            {recipe.ingredients.map((item) => (
              <li key={item.label} className="card" style={{ padding: '0.65rem 0.75rem' }}>
                <div className="font-medium">{item.label}</div>
                <div className="text-sm text-muted">
                  {[item.amount, item.notes].filter(Boolean).join(' • ')}
                </div>
              </li>
            ))}
          </ul>
        </section>
        <section className="stack">
          <h3 className="text-lg font-semibold">Steps</h3>
          <ol className="stack" style={{ padding: 0, margin: 0, listStyle: 'none' }}>
            {recipe.steps.map((step, index) => (
              <li key={index} className="card" style={{ padding: '0.75rem 0.85rem' }}>
                <div className="text-sm text-muted">Step {index + 1}</div>
                {step.title && <div className="font-medium">{step.title}</div>}
                <div>{step.body}</div>
              </li>
            ))}
          </ol>
        </section>
      </div>
      {recipe.tags.length > 0 && (
        <div className="divider" />
      )}
      {recipe.tags.length > 0 && (
        <div className="list-inline">
          {recipe.tags.map((tag) => (
            <span key={tag} className="tag">{tag}</span>
          ))}
        </div>
      )}
    </div>
  );
}
