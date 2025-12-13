'use client';

import Image from 'next/image';
import { useEffect, useMemo, useState } from 'react';
import type { Recipe } from '@/schema/recipeSchema';

const DEFAULT_HERO_IMAGE =
  'data:image/svg+xml;utf8,' +
  encodeURIComponent(`
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 800 600" role="img" aria-labelledby="title desc">
      <title id="title">Recipe hero placeholder</title>
      <desc id="desc">Muted abstract backdrop used when no recipe image is provided</desc>
      <defs>
        <linearGradient id="g" x1="0" x2="1" y1="0" y2="1">
          <stop offset="0%" stop-color="#f8fafc" />
          <stop offset="50%" stop-color="#e2e8f0" />
          <stop offset="100%" stop-color="#cbd5e1" />
        </linearGradient>
      </defs>
      <rect width="800" height="600" fill="url(#g)" />
      <g fill="#94a3b8" opacity="0.55">
        <circle cx="120" cy="160" r="70" />
        <circle cx="360" cy="140" r="110" />
        <circle cx="600" cy="200" r="90" />
        <circle cx="520" cy="420" r="120" />
        <circle cx="220" cy="400" r="100" />
      </g>
    </svg>
  `);

interface IngredientGroup {
  title?: string;
  items: Recipe['ingredients'];
}

type ViewMode = 'ingredients' | 'steps';

function formatMinutes(minutes: number) {
  return `${minutes} min`;
}

function toIngredientGroups(recipe: Recipe): IngredientGroup[] {
  if (recipe.ingredientGroups?.length) {
    return recipe.ingredientGroups;
  }
  return [
    {
      title: 'Ingredienser',
      items: recipe.ingredients,
    },
  ];
}

export function RecipeMobile({ recipe }: { recipe: Recipe }) {
  const [activeView, setActiveView] = useState<ViewMode>('ingredients');
  const [collapsedHero, setCollapsedHero] = useState(false);
  const [checkedIngredients, setCheckedIngredients] = useState<Record<string, boolean>>({});
  const [checkedSteps, setCheckedSteps] = useState<Record<number, boolean>>({});

  const ingredientGroups = useMemo(() => toIngredientGroups(recipe), [recipe]);
  const heroImage = recipe.imageUrl?.trim() ? recipe.imageUrl : DEFAULT_HERO_IMAGE;
  const totalTime = recipe.prepTimeMinutes + recipe.cookTimeMinutes;

  useEffect(() => {
    const onScroll = () => {
      setCollapsedHero(window.scrollY > 80);
    };
    window.addEventListener('scroll', onScroll, { passive: true });
    onScroll();
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  const toggleIngredient = (key: string) => {
    setCheckedIngredients((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  const toggleStep = (index: number) => {
    setCheckedSteps((prev) => ({ ...prev, [index]: !prev[index] }));
  };

  return (
    <div className="recipe-shell">
      <div className={`recipe-hero full-bleed ${collapsedHero ? 'is-collapsed' : ''}`}>
        <div className="recipe-hero__media">
          <Image src={heroImage} alt={recipe.title} fill sizes="100vw" priority />
        </div>
        <div className="recipe-hero__overlay">
          <div className="recipe-hero__title">{recipe.title}</div>
          <div className="recipe-hero__meta">
            <span className="pill">{recipe.servings} portioner</span>
            <span className="pill">{formatMinutes(totalTime)} totalt</span>
            {recipe.cookTimeMinutes > 0 && (
              <span className="pill">{formatMinutes(recipe.cookTimeMinutes)} i värmen</span>
            )}
            {recipe.tags.slice(0, 2).map((tag) => (
              <span key={tag} className="pill ghost">
                {tag}
              </span>
            ))}
          </div>
        </div>
      </div>

      <div className="recipe-body">
        <div className={activeView === 'ingredients' ? 'recipe-section is-active' : 'recipe-section'}>
          {ingredientGroups.map((group, groupIndex) => (
            <div key={group.title ?? groupIndex} className="recipe-block">
              <div className="recipe-block__title">{group.title ?? 'Ingredienser'}</div>
              <ul className="checklist" aria-label={`${group.title ?? 'Ingredienser'}`}>
                {group.items.map((item, itemIndex) => {
                  const id = `${groupIndex}-${item.label}-${itemIndex}`;
                  const isChecked = Boolean(checkedIngredients[id]);
                  const detail = [item.amount, item.notes].filter(Boolean).join(' • ');
                  return (
                    <li key={id} className={isChecked ? 'checklist__item is-checked' : 'checklist__item'}>
                      <label className="checklist__row">
                        <input
                          type="checkbox"
                          checked={isChecked}
                          onChange={() => toggleIngredient(id)}
                          aria-label={item.label}
                        />
                        <div className="checklist__text">
                          <span className="checklist__label">{item.label}</span>
                          {detail && <span className="checklist__meta">{detail}</span>}
                        </div>
                      </label>
                    </li>
                  );
                })}
              </ul>
            </div>
          ))}
        </div>

        <div className={activeView === 'steps' ? 'recipe-section is-active' : 'recipe-section'}>
          <div className="recipe-block">
            <div className="recipe-block__title">Gör så här</div>
            <ol className="checklist" aria-label="Gör så här">
              {recipe.steps.map((step, index) => {
                const isChecked = Boolean(checkedSteps[index]);
                return (
                  <li key={index} className={isChecked ? 'checklist__item is-checked' : 'checklist__item'}>
                    <label className="checklist__row">
                      <input
                        type="checkbox"
                        checked={isChecked}
                        onChange={() => toggleStep(index)}
                        aria-label={`Steg ${index + 1}`}
                      />
                      <div className="checklist__text">
                        <span className="checklist__label">
                          Steg {index + 1}
                          {step.title ? `: ${step.title}` : ''}
                        </span>
                        <span className="checklist__meta">{step.body}</span>
                      </div>
                    </label>
                  </li>
                );
              })}
            </ol>
          </div>
        </div>
      </div>

      <div className="recipe-toggle full-bleed" role="tablist" aria-label="Visa innehåll">
        <button
          className={activeView === 'ingredients' ? 'toggle-button is-active' : 'toggle-button'}
          onClick={() => setActiveView('ingredients')}
          role="tab"
          aria-selected={activeView === 'ingredients'}
        >
          Ingredienser
        </button>
        <button
          className={activeView === 'steps' ? 'toggle-button is-active' : 'toggle-button'}
          onClick={() => setActiveView('steps')}
          role="tab"
          aria-selected={activeView === 'steps'}
        >
          Gör så här
        </button>
      </div>
    </div>
  );
}
