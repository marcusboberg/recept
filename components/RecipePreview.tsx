'use client';

import Image from 'next/image';
import { useMemo, type CSSProperties } from 'react';
import { useRecipeChecklistState } from '@/components/useRecipeChecklistState';
import {
  getIngredientKey,
  getRecipeHeroImage,
  getRecipeStepLabel,
  getTitleSegments,
  toIngredientGroups,
} from '@/lib/recipePresentation';
import type { Recipe } from '@/schema/recipeSchema';

interface Props {
  recipe: Recipe;
}

export function RecipePreview({ recipe }: Props) {
  const ingredientGroups = useMemo(() => toIngredientGroups(recipe), [recipe]);
  const heroImage = getRecipeHeroImage(recipe);
  const titleSegments = useMemo(() => getTitleSegments(recipe), [recipe]);
  const {
    activeView,
    setActiveView,
    checkedIngredients,
    checkedSteps,
    scrollRef,
    showScrollHint,
    toggleDirection,
    toggleIngredient,
    toggleStep,
  } = useRecipeChecklistState({
    ingredientGroupCount: ingredientGroups.length,
    stepCount: recipe.steps.length,
  });

  const heroStyle = {
    '--recipe-hero-image': `url(${heroImage})`,
  } as CSSProperties;

  return (
    <div className="recipe-shell recipe-shell--preview" style={heroStyle}>
      <div className="recipe-mobile-only recipe-mobile-simple">
        <div className="recipe-cover__media2">
          <Image src={heroImage} alt={recipe.title} fill sizes="100vw" priority className="recipe-cover__image-background" />
          <section className="recipe-cover">
            <div className="recipe-cover__media">
              <Image src={heroImage} alt={recipe.title} fill sizes="100vw" priority className="recipe-cover__image" />
            </div>
              <div className="recipe-cover__overlay">
                <div className="recipe-cover__actions">
                  <span className="back-button" aria-hidden="true">
                    ← Tillbaka
                  </span>
                </div>
                <div className="recipe-cover__summary">
                  <div className="recipe-cover__title">
                    {titleSegments.map((segment, idx) =>
                      segment.size === 'big' ? (
                        <div key={idx} className="recipe-cover__title-main recipe-title-segment recipe-title-segment--big">
                          {segment.text}
                        </div>
                      ) : (
                        <div key={idx} className="recipe-cover__title-small recipe-title-segment recipe-title-segment--small">
                          {segment.text}
                        </div>
                      ),
                    )}
                  </div>
            </div>
          </div>
        </section>

          <section className="recipe-mobile-main">
            <div className="recipe-mobile-content">
              {activeView === 'ingredients' ? (
                <div className="recipe-panel recipe-panel--scroll">
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
                      {recipe.steps.map((step, index) => {
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
            </div>
            <div className="recipe-toggle-mobile recipe-toggle-mobile--floating" role="tablist" aria-label="Visa innehåll">
              <span className={`recipe-toggle-mobile__bg ${activeView === 'ingredients' ? 'is-left' : 'is-right'}`} aria-hidden="true">
                <span
                  className={`recipe-toggle-mobile__bg-inner ${toggleDirection === 'right' ? 'wobble-right' : 'wobble-left'}`}
                />
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
          </section>
        </div>
      </div>

      <div className="recipe-desktop-only">
        <div className="recipe-desktop-background" />
        <a href="#/" className="back-button desktop back-button--floating">
          <i className="fa-solid fa-arrow-left" aria-hidden="true" /> Tillbaka
        </a>
        <div className="recipe-desktop-content">
          <div className="recipe-desktop-card">
            <div className="recipe-desktop-card__body recipe-desktop-card__ingredients">
              <div className="recipe-desktop-toggle" role="tablist" aria-label="Visa innehåll">
                <span className={`recipe-desktop-toggle__bg ${activeView === 'ingredients' ? 'is-left' : 'is-right'}`} aria-hidden="true">
                  <span
                    className={`recipe-desktop-toggle__bg-inner ${
                      toggleDirection === 'right' ? 'wobble-right' : 'wobble-left'
                    }`}
                  />
                </span>
                <button
                  className={
                    activeView === 'ingredients'
                      ? `recipe-tab is-active is-active-${toggleDirection}`
                      : 'recipe-tab'
                  }
                  onClick={() => setActiveView('ingredients')}
                  role="tab"
                  aria-selected={activeView === 'ingredients'}
                  type="button"
                >
                  Ingredienser
                </button>
                <button
                  className={
                    activeView === 'steps' ? `recipe-tab is-active is-active-${toggleDirection}` : 'recipe-tab'
                  }
                  onClick={() => setActiveView('steps')}
                  role="tab"
                  aria-selected={activeView === 'steps'}
                  type="button"
                >
                  Gör så här
                </button>
              </div>

              <div className="recipe-desktop-scroll" ref={scrollRef}>
                {activeView === 'ingredients' ? (
                  <div className="recipe-desktop-groups">
                    {ingredientGroups.map((group, groupIndex) => (
                      <div key={group.title ?? groupIndex} className="recipe-desktop-group">
                        <p className="recipe-desktop-group__title">{group.title ?? 'Ingredienser'}</p>
                        <ul>
                          {group.items.map((item, itemIndex) => {
                            const id = getIngredientKey(groupIndex, item, itemIndex);
                            const isChecked = Boolean(checkedIngredients[id]);
                            const amount = item.amount?.trim();

                            return (
                              <li
                                key={id}
                                className={
                                  isChecked ? 'recipe-desktop-ingredient is-checked' : 'recipe-desktop-ingredient'
                                }
                              >
                                <label className="recipe-desktop-ingredient__row">
                                  <input
                                    type="checkbox"
                                    checked={isChecked}
                                    onChange={() => toggleIngredient(id)}
                                    aria-label={item.label}
                                  />
                                  <span className="recipe-desktop-ingredient__name">{item.label}</span>
                                  {amount && <span className="recipe-desktop-ingredient__amount">{amount}</span>}
                                </label>
                              </li>
                            );
                          })}
                        </ul>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="recipe-desktop-steps recipe-desktop-steps--card">
                    <ol className="recipe-desktop-steps__list">
                      {recipe.steps.map((step, index) => {
                        const isChecked = Boolean(checkedSteps[index]);
                        const displayLabel = getRecipeStepLabel(step, index);
                        return (
                          <li
                            key={index}
                            className={isChecked ? 'recipe-desktop-step is-checked' : 'recipe-desktop-step'}
                          >
                            <label className="recipe-desktop-step__row">
                              <input
                                type="checkbox"
                                checked={isChecked}
                                onChange={() => toggleStep(index)}
                                aria-label={displayLabel}
                              />
                              <div className="recipe-desktop-step__text">
                                <span className="recipe-desktop-step__label">{displayLabel}</span>
                                <p>{step.body}</p>
                              </div>
                            </label>
                          </li>
                        );
                      })}
                    </ol>
                  </div>
                )}
              </div>
              <div className={showScrollHint ? 'scroll-indicator is-visible' : 'scroll-indicator'} aria-hidden="true">
                <span className="scroll-indicator__icon">
                  <i className="fa-solid fa-arrow-down" aria-hidden="true" />
                </span>
              </div>
            </div>
            <div className="recipe-desktop-card__image">
              <Image src={heroImage} alt={recipe.title} fill sizes="50vw" priority className="desk-image" />
              <div className="recipe-desktop-image-overlay">
                {recipe.slug && (
                  <a
                    href={`#/edit/${recipe.slug}`}
                    className="recipe-edit-button recipe-edit-button--fab"
                    aria-label="Redigera"
                    title="Redigera"
                  >
                    <i className="fa-solid fa-pen-to-square" aria-hidden="true" />
                  </a>
                )}
                <div className="recipe-cover__title recipe-cover__title--desktop">
                  {titleSegments.map((segment, idx) =>
                    segment.size === 'big' ? (
                      <div key={idx} className="recipe-cover__title-main recipe-title-segment recipe-title-segment--big">
                        {segment.text}
                      </div>
                    ) : (
                      <div key={idx} className="recipe-cover__title-small recipe-title-segment recipe-title-segment--small">
                        {segment.text}
                      </div>
                    ),
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
