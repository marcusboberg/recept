import Image from 'next/image';
import { DEFAULT_RECIPE_IMAGE } from '@/lib/images';
import type { Recipe } from '@/schema/recipeSchema';

interface Props {
  recipe: Recipe;
}

export function RecipeCard({ recipe }: Props) {
  const hero = recipe.imageUrl?.trim() || DEFAULT_RECIPE_IMAGE;
  const segments =
    recipe.titleSegments && recipe.titleSegments.length > 0
      ? recipe.titleSegments
      : [
          ...(recipe.titlePrefix ? [{ text: recipe.titlePrefix, size: 'small' as const }] : []),
          { text: recipe.title, size: 'big' as const },
          ...(recipe.titleSuffix ? [{ text: recipe.titleSuffix, size: 'small' as const }] : []),
        ];

  return (
    <a href={`#/recipe/${recipe.slug}`} className="recipe-card">
      <div className="recipe-card__image">
        <div className="recipe-card__media">
          <Image src={hero} alt={recipe.title} fill sizes="320px" />
        </div>
        <div className="recipe-card__overlay recipe-card__overlay--center">
          <div className="recipe-card__titleblock">
            {segments.map((segment, idx) =>
              segment.size === 'big' ? (
                <div key={idx} className="recipe-card__title-main recipe-title-segment recipe-title-segment--big">
                  {segment.text}
                </div>
              ) : (
                <div key={idx} className="recipe-card__title-small recipe-title-segment recipe-title-segment--small">
                  {segment.text}
                </div>
              ),
            )}
          </div>
        </div>
      </div>
    </a>
  );
}
