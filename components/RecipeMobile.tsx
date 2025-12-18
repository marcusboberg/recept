'use client';

import Image from 'next/image';
import { useEffect, useMemo, useRef, useState, type CSSProperties } from 'react';
import { doc, onSnapshot } from 'firebase/firestore';
import { DEFAULT_RECIPE_IMAGE } from '@/lib/images';
import { getFirestoreClient } from '@/lib/firebaseClient';
import { recipeSchema, type Recipe } from '@/schema/recipeSchema';

interface IngredientGroup {
  title?: string;
  items: Recipe['ingredients'];
}

type ViewMode = 'ingredients' | 'steps';

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

function getTitleSegments(recipe: Recipe) {
  if (recipe.titleSegments && recipe.titleSegments.length > 0) {
    return recipe.titleSegments;
  }
  return [
    ...(recipe.titlePrefix ? [{ text: recipe.titlePrefix, size: 'small' as const }] : []),
    { text: recipe.title, size: 'big' as const },
    ...(recipe.titleSuffix ? [{ text: recipe.titleSuffix, size: 'small' as const }] : []),
  ];
}

interface Props {
  slug: string;
  initialRecipe?: Recipe;
}

export function RecipeMobile({ slug, initialRecipe }: Props) {
  const [liveRecipe, setLiveRecipe] = useState<Recipe | null>(initialRecipe ?? null);
  const [error, setError] = useState<string | null>(null);
  const [activeView, setActiveView] = useState<ViewMode>('ingredients');
  const [checkedIngredients, setCheckedIngredients] = useState<Record<string, boolean>>({});
  const [checkedSteps, setCheckedSteps] = useState<Record<number, boolean>>({});
  const scrollRef = useRef<HTMLDivElement | null>(null);
  const [showScrollHint, setShowScrollHint] = useState(false);
  const toggleDirection: 'left' | 'right' = activeView === 'ingredients' ? 'left' : 'right';

  useEffect(() => {
    if (!slug) return undefined;
    const db = getFirestoreClient();
    const ref = doc(db, 'recipes', slug);
    const unsubscribe = onSnapshot(ref, (snapshot) => {
      if (!snapshot.exists()) {
        setError('Receptet hittades inte.');
        setLiveRecipe(null);
        return;
      }
      const parsed = recipeSchema.safeParse(snapshot.data());
      if (parsed.success) {
        setLiveRecipe(parsed.data);
        setError(null);
      } else {
        setError('Receptet kunde inte läsas.');
        setLiveRecipe(null);
      }
    });
    return unsubscribe;
  }, [slug]);

  const ingredientGroups = useMemo(() => (liveRecipe ? toIngredientGroups(liveRecipe) : []), [liveRecipe]);
  const heroImage = liveRecipe?.imageUrl?.trim() ? liveRecipe.imageUrl : DEFAULT_RECIPE_IMAGE;
  const titleSegments = liveRecipe ? getTitleSegments(liveRecipe) : [];

  useEffect(() => {
    if (!heroImage || typeof document === 'undefined') {
      return;
    }
    document.documentElement.style.setProperty('--recipe-blur-image', `url(${heroImage})`);
    return () => {
      document.documentElement.style.removeProperty('--recipe-blur-image');
    };
  }, [heroImage]);

  const toggleIngredient = (key: string) => {
    setCheckedIngredients((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  const toggleStep = (index: number) => {
    setCheckedSteps((prev) => ({ ...prev, [index]: !prev[index] }));
  };

  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    const updateHint = () => {
      const hasScroll = el.scrollHeight > el.clientHeight + 1;
      const atBottom = el.scrollTop + el.clientHeight >= el.scrollHeight - 1;
      setShowScrollHint(hasScroll && !atBottom);
    };
    updateHint();
    el.addEventListener('scroll', updateHint);
    window.addEventListener('resize', updateHint);
    return () => {
      el.removeEventListener('scroll', updateHint);
      window.removeEventListener('resize', updateHint);
    };
  }, [activeView, ingredientGroups.length, liveRecipe?.steps.length]);

  useEffect(() => {
    const el = scrollRef.current;
    if (el) {
      el.scrollTop = 0;
      const hasScroll = el.scrollHeight > el.clientHeight + 1;
      const atBottom = el.scrollTop + el.clientHeight >= el.scrollHeight - 1;
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setShowScrollHint(hasScroll && !atBottom);
    }
  }, [activeView, ingredientGroups.length, liveRecipe?.steps.length]);

  const heroStyle = {
    '--recipe-hero-image': `url(${heroImage})`,
  } as CSSProperties;

  if (!liveRecipe) {
    return (
      <div className="page-shell space-y-4">
        <a href="#/" className="button-ghost">
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

  return (
    <div className="recipe-shell" style={heroStyle}>
      <div className="recipe-mobile-only recipe-mobile-simple">
        <div className="recipe-cover__media2">
        <Image src={heroImage} alt={liveRecipe.title} fill sizes="100vw" priority className="recipe-cover__image-background"/>
        <section className="recipe-cover">
          <div className="recipe-cover__media">
            <Image src={heroImage} alt={liveRecipe.title} fill sizes="100vw" priority className="recipe-cover__image" />
            </div>
            <div className="recipe-cover__overlay">
              <div className="recipe-cover__actions">
                <a href="#/" className="back-button">
                  <i className="fa-solid fa-arrow-left" aria-hidden="true" /> Tillbaka
                </a>
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
            ) : (
              <div className="recipe-panel">
                <div className="recipe-block">
                  <div className="recipe-block__title">Gör så här</div>
                  <ol className="checklist" aria-label="Gör så här">
                    {liveRecipe.steps.map((step, index) => {
                      const isChecked = Boolean(checkedSteps[index]);
                      const fallback = `Steg ${index + 1}`;
                      const customTitle = step.title?.trim();
                      const displayTitle = customTitle && customTitle.length > 0 ? customTitle : fallback;
                      return (
                        <li key={index} className={isChecked ? 'checklist__item is-checked' : 'checklist__item'}>
                          <label className="checklist__row">
                            <input
                              type="checkbox"
                              checked={isChecked}
                              onChange={() => toggleStep(index)}
                              aria-label={displayTitle}
                            />
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
          <div className="recipe-floating-tabs" role="tablist" aria-label="Visa innehåll">
            <button
              className={activeView === 'ingredients' ? 'recipe-tab is-active' : 'recipe-tab'}
              onClick={() => setActiveView('ingredients')}
              role="tab"
              aria-selected={activeView === 'ingredients'}
            >
              Ingredienser
            </button>
            <button
              className={activeView === 'steps' ? 'recipe-tab is-active' : 'recipe-tab'}
              onClick={() => setActiveView('steps')}
              role="tab"
              aria-selected={activeView === 'steps'}
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
              <a
                href={`#/edit/${liveRecipe.slug}`}
                className="recipe-edit-button recipe-edit-button--fab"
                aria-label="Redigera"
                title="Redigera"
              >
                <i className="fa-solid fa-pen-to-square" aria-hidden="true" />
              </a>
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
                      {liveRecipe.steps.map((step, index) => {
                        const isChecked = Boolean(checkedSteps[index]);
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
                                aria-label={`Steg ${index + 1}`}
                              />
                              <div className="recipe-desktop-step__text">
                                <span className="recipe-desktop-step__label">
                                  Steg {index + 1}
                                  {step.title ? `: ${step.title}` : ''}
                                </span>
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
              <Image src={heroImage} alt={liveRecipe.title} fill sizes="50vw" priority className="desk-image" />
              <div className="recipe-desktop-image-overlay">
                <a
                  href={`#/edit/${liveRecipe.slug}`}
                  className="recipe-edit-button recipe-edit-button--fab"
                  aria-label="Redigera"
                  title="Redigera"
                >
                  <i className="fa-solid fa-pen-to-square" aria-hidden="true" />
                </a>
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
