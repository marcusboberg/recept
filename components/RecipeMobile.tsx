'use client';

import dynamic from 'next/dynamic';
import Image from 'next/image';
import Link from 'next/link';
import type { CSSProperties } from 'react';
import { RecipeMobileHero } from '@/components/recipe-mobile/RecipeMobileHero';
import { RecipeMobileReadView } from '@/components/recipe-mobile/RecipeMobileReadView';
import { useRecipeMobileState } from '@/components/recipe-mobile/useRecipeMobileState';
import { getIngredientKey, getRecipeStepLabel } from '@/lib/recipePresentation';
import { getHomePath, getStudioEditHref } from '@/lib/routes';
import type { Recipe } from '@/schema/recipeSchema';

interface Props {
  slug: string;
  initialRecipe?: Recipe;
}

const RecipeQuickEditPanel = dynamic(
  () => import('@/components/recipe-mobile/RecipeQuickEditPanel').then((module) => module.RecipeQuickEditPanel),
  {
    ssr: false,
    loading: () => <div className="recipe-quick-edit-loading">Laddar redigeringsverktyg…</div>,
  },
);

export function RecipeMobile({ slug, initialRecipe }: Props) {
  const {
    activeView,
    checkedIngredients,
    checkedSteps,
    currentRecipe,
    draftRecipe,
    editStatus,
    error,
    handleBack,
    handleCancelQuickEdit,
    handleSaveQuickEdit,
    handleShare,
    handleStartQuickEdit,
    heroImage,
    ingredientGroups,
    isQuickEditing,
    isSavingEdit,
    liveRecipe,
    scrollRef,
    setActiveView,
    shareStatus,
    showScrollHint,
    titleSegments,
    toggleDirection,
    toggleIngredient,
    toggleStep,
    updateDraftIngredientGroups,
    updateDraftRecipe,
  } = useRecipeMobileState({ slug, initialRecipe });

  const heroStyle = {
    '--recipe-hero-image': `url(${heroImage})`,
  } as CSSProperties;

  if (!liveRecipe) {
    return (
      <div className="page-shell space-y-4">
        <a href={getHomePath()} className="button-ghost">
          <i className="fa-solid fa-arrow-left" aria-hidden="true" /> Tillbaka
        </a>
        <div className="card">
          <p className="card-subtitle" style={{ marginBottom: 0 }}>
            {error ?? 'Laddar recept…'}
          </p>
        </div>
      </div>
    );
  }

  const displayRecipe = currentRecipe ?? liveRecipe;

  return (
    <div className="recipe-shell" style={heroStyle}>
      <div className="recipe-mobile-only recipe-mobile-simple">
        <div className="recipe-cover__media2">
          <Image
            src={heroImage}
            alt={displayRecipe.title}
            fill
            sizes="100vw"
            priority
            className="recipe-cover__image-background"
          />
          <RecipeMobileHero
            editStatus={editStatus}
            heroImage={heroImage}
            isQuickEditing={isQuickEditing}
            onBack={handleBack}
            onEdit={handleStartQuickEdit}
            onShare={handleShare}
            shareStatus={shareStatus}
            title={displayRecipe.title}
            titleSegments={titleSegments}
          />

          <section className={isQuickEditing ? 'recipe-mobile-main recipe-mobile-main--editing' : 'recipe-mobile-main'}>
            <div className="recipe-mobile-content">
              {isQuickEditing && draftRecipe ? (
                <RecipeQuickEditPanel
                  activeView={activeView}
                  draftRecipe={draftRecipe}
                  isSavingEdit={isSavingEdit}
                  onCancel={handleCancelQuickEdit}
                  onSave={handleSaveQuickEdit}
                  setActiveView={setActiveView}
                  toggleDirection={toggleDirection}
                  updateDraftIngredientGroups={updateDraftIngredientGroups}
                  updateDraftRecipe={updateDraftRecipe}
                />
              ) : (
                <RecipeMobileReadView
                  activeView={activeView}
                  checkedIngredients={checkedIngredients}
                  checkedSteps={checkedSteps}
                  currentRecipe={displayRecipe}
                  ingredientGroups={ingredientGroups}
                  setActiveView={setActiveView}
                  toggleDirection={toggleDirection}
                  toggleIngredient={toggleIngredient}
                  toggleStep={toggleStep}
                />
              )}
            </div>
          </section>
        </div>
      </div>

      <div className="recipe-desktop-only">
        <div className="recipe-desktop-background" />
        <a href={getHomePath()} className="back-button desktop back-button--floating">
          <i className="fa-solid fa-arrow-left" aria-hidden="true" /> Tillbaka
        </a>
        <div className="recipe-desktop-content">
          <div className="recipe-desktop-card">
            <div className="recipe-desktop-card__body recipe-desktop-card__ingredients">
              <div className="recipe-desktop-toggle" role="tablist" aria-label="Visa innehåll">
                <span className={`recipe-desktop-toggle__bg ${activeView === 'ingredients' ? 'is-left' : 'is-right'}`} aria-hidden="true">
                  <span className={`recipe-desktop-toggle__bg-inner ${toggleDirection === 'right' ? 'wobble-right' : 'wobble-left'}`} />
                </span>
                <button
                  className={activeView === 'ingredients' ? `recipe-tab is-active is-active-${toggleDirection}` : 'recipe-tab'}
                  onClick={() => setActiveView('ingredients')}
                  role="tab"
                  aria-selected={activeView === 'ingredients'}
                  type="button"
                >
                  Ingredienser
                </button>
                <button
                  className={activeView === 'steps' ? `recipe-tab is-active is-active-${toggleDirection}` : 'recipe-tab'}
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
                              <li key={id} className={isChecked ? 'recipe-desktop-ingredient is-checked' : 'recipe-desktop-ingredient'}>
                                <label className="recipe-desktop-ingredient__row">
                                  <input
                                    type="checkbox"
                                    checked={isChecked}
                                    onChange={() => toggleIngredient(id)}
                                    aria-label={item.label}
                                  />
                                  <span className="recipe-desktop-ingredient__name">{item.label}</span>
                                  {amount ? <span className="recipe-desktop-ingredient__amount">{amount}</span> : null}
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
                      {liveRecipe.steps.map((step, index) => {
                        const isChecked = Boolean(checkedSteps[index]);
                        const displayLabel = getRecipeStepLabel(step, index);
                        return (
                          <li key={index} className={isChecked ? 'recipe-desktop-step is-checked' : 'recipe-desktop-step'}>
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
              {shareStatus ? <div className="recipe-share-feedback">{shareStatus}</div> : null}
            </div>
            <div className="recipe-desktop-card__image">
              <Image src={heroImage} alt={liveRecipe.title} fill sizes="50vw" priority className="desk-image" />
              <div className="recipe-desktop-image-overlay">
                <button
                  type="button"
                  className="recipe-share-button recipe-share-button--fab"
                  onClick={handleShare}
                  aria-label="Dela recept"
                  title="Dela recept"
                >
                  <i className="fa-solid fa-arrow-up-from-bracket" aria-hidden="true" />
                </button>
                <Link
                  href={getStudioEditHref(liveRecipe.slug)}
                  className="recipe-edit-button recipe-edit-button--fab"
                  aria-label="Redigera"
                  title="Redigera"
                >
                  <i className="fa-solid fa-pen-to-square" aria-hidden="true" />
                </Link>
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
