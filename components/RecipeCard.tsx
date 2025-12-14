import Image from 'next/image';
import { DEFAULT_RECIPE_IMAGE } from '@/lib/images';
import type { Recipe } from '@/schema/recipeSchema';

interface Props {
  recipe: Recipe;
}

export function RecipeCard({ recipe }: Props) {
  const hero = recipe.imageUrl?.trim() || DEFAULT_RECIPE_IMAGE;

  return (
    <a href={`#/recipe/${recipe.slug}`} className="recipe-card">
      <div className="recipe-card__image">
        <div className="recipe-card__media">
          <Image src={hero} alt={recipe.title} fill sizes="320px" />
        </div>
        <div className="recipe-card__overlay">
          <h3 className="recipe-card__title">{recipe.title}</h3>
          {recipe.description && <p className="recipe-card__subtitle">{recipe.description}</p>}
        </div>
      </div>
    </a>
  );
}
