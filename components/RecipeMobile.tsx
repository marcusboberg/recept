'use client';

import Image from 'next/image';
import { useEffect, useMemo, useState, type CSSProperties } from 'react';
import { doc, onSnapshot } from 'firebase/firestore';
import { DEFAULT_RECIPE_IMAGE } from '@/lib/images';
import { getFirestoreClient } from '@/lib/firebaseClient';
import { recipeSchema, type Recipe } from '@/schema/recipeSchema';

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

function getIngredientKey(groupIndex: number, item: Recipe['ingredients'][number], itemIndex: number) {
  return `${groupIndex}-${item.label}-${itemIndex}`;
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

  useEffect(() => {
    if (!slug) return undefined;
    setLiveRecipe(initialRecipe ?? null);
    setError(null);
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
  }, [slug, initialRecipe]);

  const ingredientGroups = useMemo(() => (liveRecipe ? toIngredientGroups(liveRecipe) : []), [liveRecipe]);
  const heroImage = liveRecipe?.imageUrl?.trim() ? liveRecipe.imageUrl : DEFAULT_RECIPE_IMAGE;
  const totalTime = liveRecipe ? liveRecipe.prepTimeMinutes + liveRecipe.cookTimeMinutes : 0;

  const toggleIngredient = (key: string) => {
    setCheckedIngredients((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  const toggleStep = (index: number) => {
    setCheckedSteps((prev) => ({ ...prev, [index]: !prev[index] }));
  };

  const heroStyle = {
    '--recipe-hero-image': `url(${heroImage})`,
  } as CSSProperties;

  if (!liveRecipe) {
    return (
      <div className="page-shell space-y-4">
        <a href="#/" className="button-ghost">← Tillbaka</a>
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
      <div className="recipe-mobile-only">
        <div className="recipe-hero full-bleed">
          <div className="recipe-hero__media">
            <Image src={heroImage} alt={liveRecipe.title} fill sizes="100vw" priority />
          </div>
          <div className="recipe-hero__overlay">
            <div className="recipe-hero__actions">
              <a href="#/" className="back-button">
                ← Tillbaka
              </a>
              <a href={`#/edit/${liveRecipe.slug}`} className="recipe-edit-button">
                Redigera
              </a>
            </div>
            <div className="recipe-hero__title">{liveRecipe.title}</div>
            <div className="recipe-hero__meta">
              <span className="pill">{liveRecipe.servings} portioner</span>
              <span className="pill">{formatMinutes(totalTime)} totalt</span>
              {liveRecipe.cookTimeMinutes > 0 && <span className="pill">{formatMinutes(liveRecipe.cookTimeMinutes)} i värmen</span>}
              {liveRecipe.tags.slice(0, 2).map((tag) => (
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

        <div className={activeView === 'steps' ? 'recipe-section recipe-section--steps is-active' : 'recipe-section recipe-section--steps'}>
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

      <div className="recipe-desktop-only">
        <div className="recipe-desktop-background" />
        <div className="recipe-desktop-content">
          <div className="recipe-desktop-hero">
            <div className="recipe-hero__actions recipe-hero__actions--desktop">
              <a href="#/" className="back-button desktop">
                ← Tillbaka
              </a>
              <a href={`#/edit/${liveRecipe.slug}`} className="recipe-edit-button recipe-edit-button--desktop">
                Redigera
              </a>
            </div>
            <h1 className="recipe-desktop-title">{liveRecipe.title}</h1>
            <p className="recipe-desktop-meta">
              {liveRecipe.tags.slice(0, 3).join(', ')}
              {liveRecipe.tags.length > 0 && ' · '}
              {liveRecipe.servings} portioner · {formatMinutes(totalTime)}
            </p>
          </div>
          <div className="recipe-desktop-card">
            <div className="recipe-desktop-card__ingredients">
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
                          className={isChecked ? 'recipe-desktop-ingredient is-checked' : 'recipe-desktop-ingredient'}
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
            <div className="recipe-desktop-card__image">
              <Image src={heroImage} alt={liveRecipe.title} fill sizes="50vw" priority className="desk-image" />
            </div>
          </div>
          <div className="recipe-desktop-steps">
            <h2>Gör så här</h2>
            <ol className="recipe-desktop-steps__list">
              {liveRecipe.steps.map((step, index) => {
                const isChecked = Boolean(checkedSteps[index]);
                return (
                  <li key={index} className={isChecked ? 'recipe-desktop-step is-checked' : 'recipe-desktop-step'}>
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
        </div>
      </div>
    </div>
  );
}
