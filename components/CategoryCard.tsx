import Image from 'next/image';
import { DEFAULT_RECIPE_IMAGE } from '@/lib/images';
import type { CategoryInfo } from '@/lib/categories';

interface Props {
  category: CategoryInfo;
}

export function CategoryCard({ category }: Props) {
  const hero = category.image || DEFAULT_RECIPE_IMAGE;
  return (
    <a href={`#/category/${category.slug}`} className="recipe-card">
      <div className="recipe-card__image">
        <div className="recipe-card__media">
          <Image src={hero} alt={category.name} fill sizes="320px" />
        </div>
        <div className="recipe-card__overlay">
          <h3 className="recipe-card__title">{category.name}</h3>
          <p className="recipe-card__subtitle">{category.count} recept</p>
        </div>
      </div>
    </a>
  );
}
