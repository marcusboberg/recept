'use client';

import Image from 'next/image';
import Link from 'next/link';
import { DEFAULT_RECIPE_IMAGE } from '@/lib/images';
import type { CategoryInfo } from '@/lib/categories';
import { getCategoryPath } from '@/lib/routes';

interface Props {
  category: CategoryInfo;
}

export function CategoryCard({ category }: Props) {
  const hero = category.image || DEFAULT_RECIPE_IMAGE;
  const segments = [{ text: category.name, size: 'big' as const }];
  return (
    <Link href={getCategoryPath(category.slug)} className="recipe-card recipe-card--category" prefetch>
      <div className="recipe-card__image">
        <div className="recipe-card__media">
          <Image src={hero} alt={category.name} fill sizes="(max-width: 640px) 92vw, (max-width: 1024px) 44vw, 320px" />
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
    </Link>
  );
}
