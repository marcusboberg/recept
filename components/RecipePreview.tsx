'use client';

import Image from 'next/image';
import { useMemo, useState, type CSSProperties } from 'react';
import { DEFAULT_RECIPE_IMAGE } from '@/lib/images';
import type { Recipe } from '@/schema/recipeSchema';

type ViewMode = 'ingredients' | 'steps';

interface IngredientGroup {
  title?: string;
  items: Recipe['ingredients'];
}

interface Props {
  recipe: Recipe;
}

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

function getIngredientKey(groupIndex: number, item: Recipe['ingredients'][number], itemIndex: number) {
  return `${groupIndex}-${item.label}-${itemIndex}`;
}

export function RecipePreview({ recipe }: Props) {
  const [activeView, setActiveView] = useState<ViewMode>('ingredients');
  const [checkedIngredients, setCheckedIngredients] = useState<Record<string, boolean>>({});
  const [checkedSteps, setCheckedSteps] = useState<Record<number, boolean>>({});

  const ingredientGroups = useMemo(() => toIngredientGroups(recipe), [recipe]);
  const heroImage = recipe.imageUrl?.trim() ? recipe.imageUrl : DEFAULT_RECIPE_IMAGE;
  const totalTime = recipe.prepTimeMinutes + recipe.cookTimeMinutes;

  const heroStyle = {
    '--recipe-hero-image': `url(${heroImage})`,
  } as CSSProperties;

  const toggleIngredient = (key: string) => {
    setCheckedIngredients((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  const toggleStep = (index: number) => {
    setCheckedSteps((prev) => ({ ...prev, [index]: !prev[index] }));
  };

  return (
    <div className="recipe-shell" style={heroStyle}>
      <div className="recipe-mobile-only">
        <div className="recipe-hero full-bleed">
          <div className="recipe-hero__media">
            <Image src={heroImage} alt={recipe.title} fill sizes="640px" priority />
          </div>
          <div className="recipe-hero__overlay">
            <div className="recipe-hero__actions">
              <span className="back-button" aria-hidden="true">
                ← Tillbaka
              </span>
              <span className="recipe-edit-button" aria-hidden="true">
                Redigera
              </span>
            </div>
            <div className="recipe-hero__summary">
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
        </div>

        <div className="recipe-body">
          <div className={activeView === 'ingredients' ? 'recipe-section recipe-section--ingredients is-active' : 'recipe-section recipe-section--ingredients'}>
            {ingredientGroups.map((group, groupIndex) => (
              <div key={group.title ?? groupIndex} className="recipe-block">
                <div className="recipe-block__title">{group.title ?? 'Ingredienser'}</div>
                <ul className="checklist" aria-label={`${group.title ?? 'Ingredienser'}`}>
                  {group.items.map((item, itemIndex) => {
                    const id = getIngredientKey(groupIndex, item, itemIndex);
                    const isChecked = Boolean(checkedIngredients[id]);
                    const amount = item.amount?.trim();
                    return (
                      <li key={id} className={isChecked ? 'checklist__item is-checked' : 'checklist__item'}>
                        <label className="checklist__row">
                          <input type="checkbox" checked={isChecked} onChange={() => toggleIngredient(id)} aria-label={item.label} />
                          <div className="checklist__text">
                            <div className="checklist__line">
                              <span className="checklist__label">{item.label}</span>
                              {amount && <span className="checklist__amount">{amount}</span>}
                            </div>
                            {item.notes && <div className="checklist__meta">{item.notes}</div>}
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
                  const fallback = `Steg ${index + 1}`;
                  const customTitle = step.title?.trim();
                  const displayTitle = customTitle && customTitle.length > 0 ? customTitle : fallback;
                  return (
                    <li key={index} className={isChecked ? 'checklist__item is-checked' : 'checklist__item'}>
                      <label className="checklist__row">
                        <input type="checkbox" checked={isChecked} onChange={() => toggleStep(index)} aria-label={displayTitle} />
                        <div className="checklist__text">
                          <span className="checklist__label">{displayTitle}</span>
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
    </div>
  );
}
