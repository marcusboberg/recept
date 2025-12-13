'use client';

import Link from 'next/link';
import Image from 'next/image';
import { useEffect, useMemo, useState } from 'react';
import { DEFAULT_RECIPE_IMAGE } from '@/lib/images';
import type { Recipe } from '@/schema/recipeSchema';

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
  const [checkedIngredients, setCheckedIngredients] = useState<Record<string, boolean>>({});
  const [checkedSteps, setCheckedSteps] = useState<Record<number, boolean>>({});

  useEffect(() => {
    document.body.classList.add('is-recipe-view');
    return () => {
      document.body.classList.remove('is-recipe-view');
    };
  }, []);

  const ingredientGroups = useMemo(() => toIngredientGroups(recipe), [recipe]);
  const heroImage = recipe.imageUrl?.trim() ? recipe.imageUrl : DEFAULT_RECIPE_IMAGE;
  const totalTime = recipe.prepTimeMinutes + recipe.cookTimeMinutes;

  const toggleIngredient = (key: string) => {
    setCheckedIngredients((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  const toggleStep = (index: number) => {
    setCheckedSteps((prev) => ({ ...prev, [index]: !prev[index] }));
  };

  return (
    <div className="recipe-shell">
      <div className="recipe-hero full-bleed">
        <div className="recipe-hero__media">
          <Image src={heroImage} alt={recipe.title} fill sizes="100vw" priority />
        </div>
        <div className="recipe-hero__overlay">
          <Link href="/" className="back-button">
            ← Back
          </Link>
          <div className="recipe-hero__title">{recipe.title}</div>
          <div className="recipe-hero__meta">
            <span className="pill">{recipe.servings} portioner</span>
            <span className="pill">{formatMinutes(totalTime)} totalt</span>
            {recipe.cookTimeMinutes > 0 && <span className="pill">{formatMinutes(recipe.cookTimeMinutes)} i värmen</span>}
            {recipe.tags.slice(0, 2).map((tag) => (
              <span key={tag} className="pill ghost">
                {tag}
              </span>
            ))}
          </div>
        </div>
      </div>

      <div className="recipe-body">
        <div className={activeView === 'ingredients' ? 'recipe-section recipe-section--ingredients is-active' : 'recipe-section recipe-section--ingredients'}>
          {ingredientGroups.map((group, groupIndex) => (
            <div key={group.title ?? groupIndex} className="recipe-block">
              <div className="recipe-block__title">{group.title ?? 'Ingredienser'}</div>
              <ul className="checklist" aria-label={`${group.title ?? 'Ingredienser'}`}>
                {group.items.map((item, itemIndex) => {
                  const id = `${groupIndex}-${item.label}-${itemIndex}`;
                  const isChecked = Boolean(checkedIngredients[id]);
                  const amount = item.amount?.trim();
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
                          <div className="checklist__line">
                            <span className="checklist__label">{item.label}</span>
                            {amount && <span className="checklist__amount">{amount}</span>}
                          </div>
                        </div>
                      </label>
                    </li>
                  );
                })}
              </ul>
            </div>
          ))}
        </div>

        <div className={activeView === 'steps' ? 'recipe-section recipe-section--steps is-active' : 'recipe-section recipe-section--steps'}>
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
