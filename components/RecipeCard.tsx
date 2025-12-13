import Link from 'next/link';
import type { Recipe } from '@/schema/recipeSchema';

const FALLBACK_IMAGE =
  'data:image/svg+xml;utf8,' +
  encodeURIComponent(`
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 800 560" role="img" aria-labelledby="title desc">
      <title id="title">Recipe preview placeholder</title>
      <desc id="desc">Simple gradient tile used when no recipe image is provided</desc>
      <defs>
        <linearGradient id="g" x1="0" x2="1" y1="0" y2="1">
          <stop offset="0%" stop-color="#f8f5f0" />
          <stop offset="100%" stop-color="#e7dfd6" />
        </linearGradient>
      </defs>
      <rect width="800" height="560" fill="url(#g)" />
      <circle cx="180" cy="180" r="120" fill="#d9c7b4" opacity="0.65" />
      <circle cx="620" cy="360" r="160" fill="#c4b19e" opacity="0.55" />
    </svg>
  `);

interface Props {
  recipe: Recipe;
}

export function RecipeCard({ recipe }: Props) {
  const hero = recipe.imageUrl?.trim() || FALLBACK_IMAGE;

  return (
    <Link href={`/${recipe.slug}`} className="recipe-card">
      <div className="recipe-card__image" style={{ backgroundImage: `url(${hero})` }}>
        <div className="recipe-card__overlay">
          <h3 className="recipe-card__title">{recipe.title}</h3>
          {recipe.description && <p className="recipe-card__subtitle">{recipe.description}</p>}
        </div>
      </div>
    </Link>
  );
}
