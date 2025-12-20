import Image from 'next/image';
import { DEFAULT_RECIPE_IMAGE } from '@/lib/images';
import type { CategoryInfo } from '@/lib/categories';

interface Props {
  category: CategoryInfo;
}

export function CategoryCard({ category }: Props) {
  const hero = category.image || DEFAULT_RECIPE_IMAGE;
  const segments = [{ text: category.name, size: 'big' as const }];
  return (
    <a href={`#/category/${category.slug}`} className="recipe-card recipe-card--category">
      <div className="recipe-card__image">
        <div className="recipe-card__media">
          <Image src={hero} alt={category.name} fill sizes="320px" />
        </div>
        <div className="recipe-card__overlay">
          <div className="recipe-card__titleblock">
            {segments.map((segment, idx) => (
              <div key={idx} className="recipe-card__title-main recipe-title-segment recipe-title-segment--big">
                {segment.text}
              </div>
            ))}
          </div>
          <p className="recipe-card__subtitle">{category.count} recept</p>
        </div>
      </div>
    </a>
  );
}
