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
        <div className="recipe-card__overlay recipe-card__overlay--center">
          <div className="recipe-card__titleblock">
            {recipe.titlePrefix && <div className="recipe-card__title-small">{recipe.titlePrefix}</div>}
            <h3 className="recipe-card__title-main">{recipe.title}</h3>
            {recipe.titleSuffix && <div className="recipe-card__title-small">{recipe.titleSuffix}</div>}
          </div>
        </div>
      </div>
    </a>
  );
}
