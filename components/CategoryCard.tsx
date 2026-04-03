'use client';

import Image from 'next/image';
import Link from 'next/link';
import { DEFAULT_RECIPE_IMAGE } from '@/lib/images';
import type { CategoryInfo } from '@/lib/categories';
import { getCategoryPath } from '@/lib/routes';

interface Props {
  category: CategoryInfo;
  onNavigate?: (slug: string) => void;
}

export function CategoryCard({ category, onNavigate }: Props) {
  const hero = category.image || DEFAULT_RECIPE_IMAGE;
  const segments = [{ text: category.name, size: 'big' as const }];
  const href = getCategoryPath(category.slug);
  return (
    <Link
      href={href}
      className="recipe-card recipe-card--category"
      prefetch
      onClick={(event) => {
        if (!onNavigate || event.defaultPrevented || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) {
          return;
        }

        event.preventDefault();
        onNavigate(category.slug);
      }}
    >
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
