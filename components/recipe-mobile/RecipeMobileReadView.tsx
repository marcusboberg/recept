'use client';

import { getIngredientKey, getRecipeStepLabel } from '@/lib/recipePresentation';
import type { Recipe } from '@/schema/recipeSchema';

interface IngredientGroupView {
  title?: string;
  items: Recipe['ingredients'];
}

interface Props {
  activeView: 'ingredients' | 'steps';
  checkedIngredients: Record<string, boolean>;
  checkedSteps: Record<number, boolean>;
  currentRecipe: Recipe;
  ingredientGroups: IngredientGroupView[];
  setActiveView: (view: 'ingredients' | 'steps') => void;
  toggleDirection: 'left' | 'right';
  toggleIngredient: (id: string) => void;
  toggleStep: (index: number) => void;
}

export function RecipeMobileReadView({
  activeView,
  checkedIngredients,
  checkedSteps,
  currentRecipe,
  ingredientGroups,
  setActiveView,
  toggleDirection,
  toggleIngredient,
  toggleStep,
}: Props) {
  return (
    <>
      {activeView === 'ingredients' ? (
        <div className="recipe-panel">
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
                            {amount ? <span className="checklist__amount">{amount}</span> : null}
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
      ) : (
        <div className="recipe-panel">
          <div className="recipe-block">
            <div className="recipe-block__title">Gör så här</div>
            <ol className="checklist" aria-label="Gör så här">
              {currentRecipe.steps.map((step, index) => {
                const isChecked = Boolean(checkedSteps[index]);
                const displayTitle = getRecipeStepLabel(step, index);
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
      )}
      <div className="recipe-toggle-mobile recipe-toggle-mobile--floating" role="tablist" aria-label="Visa innehåll">
        <span className={`recipe-toggle-mobile__bg ${activeView === 'ingredients' ? 'is-left' : 'is-right'}`} aria-hidden="true">
          <span className={`recipe-toggle-mobile__bg-inner ${toggleDirection === 'right' ? 'wobble-right' : 'wobble-left'}`} />
        </span>
        <button
          className={activeView === 'ingredients' ? 'recipe-toggle-mobile__tab is-active' : 'recipe-toggle-mobile__tab'}
          onClick={() => setActiveView('ingredients')}
          role="tab"
          aria-selected={activeView === 'ingredients'}
          type="button"
        >
          Ingredienser
        </button>
        <button
          className={activeView === 'steps' ? 'recipe-toggle-mobile__tab is-active' : 'recipe-toggle-mobile__tab'}
          onClick={() => setActiveView('steps')}
          role="tab"
          aria-selected={activeView === 'steps'}
          type="button"
        >
          Gör så här
        </button>
      </div>
    </>
  );
}
