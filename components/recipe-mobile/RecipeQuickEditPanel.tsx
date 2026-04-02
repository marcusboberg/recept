'use client';

import type { IngredientGroup } from '@/lib/recipePresentation';
import type { Recipe } from '@/schema/recipeSchema';

interface Props {
  activeView: 'ingredients' | 'steps';
  draftRecipe: Recipe;
  isSavingEdit: boolean;
  onCancel: () => void;
  onSave: () => void;
  setActiveView: (view: 'ingredients' | 'steps') => void;
  toggleDirection: 'left' | 'right';
  updateDraftIngredientGroups: (updater: (prev: IngredientGroup[]) => IngredientGroup[]) => void;
  updateDraftRecipe: (updater: (prev: Recipe) => Recipe) => void;
}

export function RecipeQuickEditPanel({
  activeView,
  draftRecipe,
  isSavingEdit,
  onCancel,
  onSave,
  setActiveView,
  toggleDirection,
  updateDraftIngredientGroups,
  updateDraftRecipe,
}: Props) {
  const groups = draftRecipe.ingredientGroups && draftRecipe.ingredientGroups.length > 0
    ? draftRecipe.ingredientGroups
    : [{ title: 'Ingredienser', items: draftRecipe.ingredients ?? [] }];
  const showGroupTitles = groups.length > 1 || groups.some((group) => Boolean(group.title?.trim() && group.title.trim() !== 'Ingredienser'));

  return (
    <div className="recipe-quick-edit">
      <div className="recipe-quick-edit__meta">
        <label className="recipe-quick-edit__field">
          <span>Rubrik</span>
          <input
            className="recipe-quick-edit__input"
            value={draftRecipe.title}
            onChange={(event) =>
              updateDraftRecipe((prev) => ({
                ...prev,
                title: event.target.value,
              }))
            }
            placeholder="Rubrik"
          />
        </label>
        <label className="recipe-quick-edit__field">
          <span>Bild</span>
          <input
            className="recipe-quick-edit__input"
            value={draftRecipe.imageUrl}
            onChange={(event) =>
              updateDraftRecipe((prev) => ({
                ...prev,
                imageUrl: event.target.value,
              }))
            }
            placeholder="Bild-URL"
          />
        </label>
      </div>
      <div className="recipe-toggle-mobile" role="tablist" aria-label="Redigera innehåll">
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

      {activeView === 'ingredients' ? (
        <div className="recipe-quick-edit__section">
          {groups.map((group, groupIndex) => (
            <div key={`${groupIndex}-${group.title ?? 'group'}`} className="recipe-quick-edit__group">
              {showGroupTitles ? (
                <input
                  className="recipe-quick-edit__group-title"
                  value={group.title ?? ''}
                  onChange={(event) =>
                    updateDraftIngredientGroups((prev) =>
                      prev.map((entry, idx) => (idx === groupIndex ? { ...entry, title: event.target.value } : entry)),
                    )
                  }
                  placeholder="Rubrik"
                />
              ) : null}
              <div className="recipe-quick-edit__rows">
                {group.items.map((item, itemIndex) => (
                  <div key={`${groupIndex}-${itemIndex}`} className="recipe-quick-edit__row">
                    <input
                      className="recipe-quick-edit__input recipe-quick-edit__input--label"
                      value={item.label}
                      onChange={(event) =>
                        updateDraftIngredientGroups((prev) =>
                          prev.map((entry, idx) =>
                            idx === groupIndex
                              ? {
                                  ...entry,
                                  items: entry.items.map((current, currentIndex) =>
                                    currentIndex === itemIndex ? { ...current, label: event.target.value } : current,
                                  ),
                                }
                              : entry,
                          ),
                        )
                      }
                      placeholder="Ingrediens"
                    />
                    <input
                      className="recipe-quick-edit__input recipe-quick-edit__input--amount"
                      value={item.amount ?? ''}
                      onChange={(event) =>
                        updateDraftIngredientGroups((prev) =>
                          prev.map((entry, idx) =>
                            idx === groupIndex
                              ? {
                                  ...entry,
                                  items: entry.items.map((current, currentIndex) =>
                                    currentIndex === itemIndex ? { ...current, amount: event.target.value } : current,
                                  ),
                                }
                              : entry,
                          ),
                        )
                      }
                      placeholder="Mängd"
                    />
                    <button
                      type="button"
                      className="recipe-quick-edit__icon"
                      onClick={() =>
                        updateDraftIngredientGroups((prev) =>
                          prev.map((entry, idx) =>
                            idx === groupIndex
                              ? {
                                  ...entry,
                                  items:
                                    entry.items.length > 1
                                      ? entry.items.filter((_, currentIndex) => currentIndex !== itemIndex)
                                      : [{ label: '', amount: '', kind: 'ingredient' }],
                                }
                              : entry,
                          ),
                        )
                      }
                      aria-label="Ta bort ingrediens"
                    >
                      <i className="fa-solid fa-trash-can" aria-hidden="true" />
                    </button>
                  </div>
                ))}
              </div>
              <button
                type="button"
                className="recipe-quick-edit__add"
                onClick={() =>
                  updateDraftIngredientGroups((prev) =>
                    prev.map((entry, idx) =>
                      idx === groupIndex
                        ? {
                            ...entry,
                            items: [...entry.items, { label: '', amount: '', kind: 'ingredient' }],
                          }
                        : entry,
                    ),
                  )
                }
              >
                + Lägg till ingrediens
              </button>
            </div>
          ))}
        </div>
      ) : (
        <div className="recipe-quick-edit__section recipe-quick-edit__section--steps">
          {(draftRecipe.steps ?? []).map((step, index) => (
            <div key={index} className="recipe-quick-edit__step">
              <div className="recipe-quick-edit__step-header">
                <span className="recipe-quick-edit__step-index">Steg {index + 1}</span>
                <button
                  type="button"
                  className="recipe-quick-edit__text-button"
                  onClick={() =>
                    updateDraftRecipe((prev) => {
                      const nextSteps = [...(prev.steps ?? [])];
                      nextSteps.splice(index, 1);
                      return { ...prev, steps: nextSteps.length > 0 ? nextSteps : [{ title: '', body: '' }] };
                    })
                  }
                >
                  Ta bort
                </button>
              </div>
              <input
                className="recipe-quick-edit__input"
                value={step.title ?? ''}
                onChange={(event) =>
                  updateDraftRecipe((prev) => {
                    const nextSteps = [...(prev.steps ?? [])];
                    nextSteps[index] = { ...nextSteps[index], title: event.target.value };
                    return { ...prev, steps: nextSteps };
                  })
                }
                placeholder="Stegrubrik (valfri)"
              />
              <textarea
                className="recipe-quick-edit__textarea"
                value={step.body}
                onChange={(event) =>
                  updateDraftRecipe((prev) => {
                    const nextSteps = [...(prev.steps ?? [])];
                    nextSteps[index] = { ...nextSteps[index], body: event.target.value };
                    return { ...prev, steps: nextSteps };
                  })
                }
                placeholder="Instruktion"
                rows={4}
              />
            </div>
          ))}
          <button
            type="button"
            className="recipe-quick-edit__add"
            onClick={() =>
              updateDraftRecipe((prev) => ({
                ...prev,
                steps: [...(prev.steps ?? []), { title: '', body: '' }],
              }))
            }
          >
            + Lägg till steg
          </button>
        </div>
      )}

      <div className="recipe-quick-edit__actions">
        <button type="button" className="recipe-quick-edit__cancel" onClick={onCancel}>
          Avbryt
        </button>
        <button type="button" className="recipe-quick-edit__save" onClick={onSave} disabled={isSavingEdit}>
          {isSavingEdit ? 'Sparar…' : 'Spara'}
        </button>
      </div>
    </div>
  );
}
