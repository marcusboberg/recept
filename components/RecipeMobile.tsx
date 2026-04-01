'use client';

import Image from 'next/image';
import { useEffect, useMemo, useRef, useState, type CSSProperties } from 'react';
import { onAuthStateChanged, type User } from 'firebase/auth';
import { doc, onSnapshot, setDoc } from 'firebase/firestore';
import { useRecipeChecklistState } from '@/components/useRecipeChecklistState';
import { DEFAULT_RECIPE_IMAGE } from '@/lib/images';
import { getFirebaseAuth, getFirestoreClient } from '@/lib/firebaseClient';
import { normalizeLegacyRecipeForRead } from '@/lib/legacyRecipes';
import {
  applyEditableIngredientGroups,
  cloneRecipe,
  getEditableIngredientGroups,
  getEditableTitleSegments,
  getIngredientKey,
  getRecipeHeroImage,
  getRecipeStepLabel,
  getTitleSegments,
  toIngredientGroups,
  type IngredientGroup,
} from '@/lib/recipePresentation';
import { resolveRecipeSlugByHistory } from '@/lib/slugHistory';
import { recipeSchema, type Recipe } from '@/schema/recipeSchema';

interface Props {
  slug: string;
  initialRecipe?: Recipe;
}

export function RecipeMobile({ slug, initialRecipe }: Props) {
  const [liveRecipe, setLiveRecipe] = useState<Recipe | null>(initialRecipe ?? null);
  const [error, setError] = useState<string | null>(null);
  const [isQuickEditing, setIsQuickEditing] = useState(false);
  const [draftRecipe, setDraftRecipe] = useState<Recipe | null>(null);
  const [authStatus, setAuthStatus] = useState<'loading' | 'authenticated' | 'unauthenticated'>('loading');
  const [authUser, setAuthUser] = useState<User | null>(null);
  const [editStatus, setEditStatus] = useState<string | null>(null);
  const [isSavingEdit, setIsSavingEdit] = useState(false);
  const [shareStatus, setShareStatus] = useState<string | null>(null);
  const wakeLockRef = useRef<WakeLockSentinel | null>(null);
  const shareStatusTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const editStatusTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const redirectAttemptedRef = useRef(false);

  useEffect(() => {
    redirectAttemptedRef.current = false;
  }, [slug]);

  useEffect(() => {
    if (!slug) return undefined;
    const db = getFirestoreClient();
    const ref = doc(db, 'recipes', slug);
    const unsubscribe = onSnapshot(ref, async (snapshot) => {
      if (!snapshot.exists()) {
        if (!redirectAttemptedRef.current) {
          redirectAttemptedRef.current = true;
          try {
            const resolved = await resolveRecipeSlugByHistory(db, slug);
            if (resolved && resolved !== slug && typeof window !== 'undefined') {
              window.location.hash = `#/recipe/${resolved}`;
              return;
            }
          } catch {
            // fall through to error state
          }
        }
        setError('Receptet hittades inte.');
        setLiveRecipe(null);
        return;
      }
      const parsed = recipeSchema.safeParse(normalizeLegacyRecipeForRead(snapshot.data()));
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

  useEffect(() => {
    const auth = getFirebaseAuth();
    const unsubscribe = onAuthStateChanged(auth, (current) => {
      if (current) {
        setAuthUser(current);
        setAuthStatus('authenticated');
      } else {
        setAuthUser(null);
        setAuthStatus('unauthenticated');
      }
    });
    return unsubscribe;
  }, []);

  useEffect(() => {
    if (!isQuickEditing) {
      setDraftRecipe(null);
    }
  }, [isQuickEditing]);

  useEffect(() => {
    if (editStatus !== 'Sparat.') {
      return undefined;
    }
    editStatusTimerRef.current = setTimeout(() => setEditStatus(null), 2200);
    return () => {
      if (editStatusTimerRef.current) {
        clearTimeout(editStatusTimerRef.current);
      }
    };
  }, [editStatus]);

  const displayRecipe = isQuickEditing && draftRecipe ? draftRecipe : liveRecipe;
  const ingredientGroups = useMemo(() => (displayRecipe ? toIngredientGroups(displayRecipe) : []), [displayRecipe]);
  const heroImage = displayRecipe ? getRecipeHeroImage(displayRecipe) : DEFAULT_RECIPE_IMAGE;
  const titleSegments = displayRecipe
    ? isQuickEditing
      ? getEditableTitleSegments(displayRecipe)
      : getTitleSegments(displayRecipe)
    : [];
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
    stepCount: displayRecipe?.steps.length ?? 0,
  });
  const handleBack = () => {
    if (typeof window === 'undefined') return;
    if (window.history.length > 1) {
      window.history.back();
    } else {
      window.location.href = '#/';
    }
  };

  useEffect(() => {
    if (!heroImage || typeof document === 'undefined') {
      return;
    }
    document.documentElement.style.setProperty('--recipe-blur-image', `url(${heroImage})`);
    return () => {
      document.documentElement.style.removeProperty('--recipe-blur-image');
    };
  }, [heroImage]);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const isStandalone =
      window.matchMedia?.('(display-mode: standalone)')?.matches ||
      window.matchMedia?.('(display-mode: fullscreen)')?.matches ||
      // iOS PWA flag
      (typeof (window.navigator as any).standalone !== 'undefined' && (window.navigator as any).standalone);

    if (isStandalone) {
      document.documentElement.classList.add('pwa-mode');
      return () => {
        document.documentElement.classList.remove('pwa-mode');
      };
    }
    return undefined;
  }, []);

  useEffect(() => {
    return () => {
      if (shareStatusTimerRef.current) {
        clearTimeout(shareStatusTimerRef.current);
      }
      if (editStatusTimerRef.current) {
        clearTimeout(editStatusTimerRef.current);
      }
    };
  }, []);

  useEffect(() => {
    if (typeof document === 'undefined' || typeof navigator === 'undefined') {
      return;
    }
    if (!('wakeLock' in navigator)) {
      return;
    }
    let cancelled = false;

    const requestLock = async () => {
      try {
        const sentinel = await (navigator as Navigator & { wakeLock: WakeLock }).wakeLock.request('screen');
        if (cancelled) {
          await sentinel.release();
          return;
        }
        wakeLockRef.current = sentinel;
      } catch {
        // Wake lock can fail due to permissions or unsupported contexts.
      }
    };

    const handleVisibility = () => {
      if (document.visibilityState === 'visible') {
        requestLock();
      }
    };

    requestLock();
    document.addEventListener('visibilitychange', handleVisibility);
    return () => {
      cancelled = true;
      document.removeEventListener('visibilitychange', handleVisibility);
      if (wakeLockRef.current) {
        wakeLockRef.current.release().catch(() => undefined);
        wakeLockRef.current = null;
      }
    };
  }, []);

  const updateDraftRecipe = (updater: (prev: Recipe) => Recipe) => {
    setDraftRecipe((prev) => (prev ? updater(prev) : prev));
  };

  const updateDraftIngredientGroups = (updater: (prev: IngredientGroup[]) => IngredientGroup[]) => {
    updateDraftRecipe((prev) => applyEditableIngredientGroups(prev, updater(getEditableIngredientGroups(prev))));
  };

  const handleStartQuickEdit = () => {
    if (!liveRecipe) {
      return;
    }

    if (authStatus !== 'authenticated') {
      if (typeof window !== 'undefined') {
        window.location.hash = `#/edit/${liveRecipe.slug}`;
      }
      return;
    }

    setDraftRecipe(cloneRecipe(liveRecipe));
    setEditStatus(null);
    setIsQuickEditing(true);
  };

  const handleCancelQuickEdit = () => {
    setEditStatus(null);
    setIsQuickEditing(false);
  };

  const handleSaveQuickEdit = async () => {
    if (!draftRecipe || !liveRecipe) {
      return;
    }

    if (authStatus !== 'authenticated' || !authUser) {
      setEditStatus('Logga in för att spara ändringar.');
      return;
    }

    setIsSavingEdit(true);
    setEditStatus(null);

    try {
      const db = getFirestoreClient();
      const now = new Date().toISOString();
      const payload = recipeSchema.parse({
        ...draftRecipe,
        slug: liveRecipe.slug,
        slugHistory: liveRecipe.slugHistory ?? draftRecipe.slugHistory ?? [],
        titleSegments: getEditableTitleSegments(draftRecipe),
        createdAt: draftRecipe.createdAt ?? liveRecipe.createdAt ?? now,
        updatedAt: now,
      });

      await setDoc(doc(db, 'recipes', liveRecipe.slug), payload);
      setEditStatus('Sparat.');
      setIsQuickEditing(false);
    } catch (saveError) {
      setEditStatus((saveError as Error).message || 'Kunde inte spara ändringarna.');
    } finally {
      setIsSavingEdit(false);
    }
  };

  const setShareFeedback = (value: string) => {
    setShareStatus(value);
    if (shareStatusTimerRef.current) {
      clearTimeout(shareStatusTimerRef.current);
    }
    shareStatusTimerRef.current = setTimeout(() => setShareStatus(null), 2200);
  };

  const handleShare = async () => {
    if (!liveRecipe || typeof window === 'undefined') return;
    const shareUrl = `${window.location.origin}/share/${liveRecipe.slug}`;
    const nav = window.navigator as Navigator & {
      share?: (data?: ShareData) => Promise<void>;
      clipboard?: { writeText?: (value: string) => Promise<void> };
    };
    try {
      if (typeof nav.share === 'function') {
        await nav.share({
          title: liveRecipe.title,
          text: `Kolla receptet: ${liveRecipe.title}`,
          url: shareUrl,
        });
        return;
      }
      if (typeof nav.clipboard?.writeText === 'function') {
        await nav.clipboard.writeText(shareUrl);
        setShareFeedback('Delningslank kopierad.');
        return;
      }
      setShareFeedback(`Kopiera denna lank: ${shareUrl}`);
    } catch {
      // User cancelled share or clipboard failed.
    }
  };

  const renderQuickEditIngredients = () => {
    if (!draftRecipe) return null;
    const groups = getEditableIngredientGroups(draftRecipe);
    const showGroupTitles = groups.length > 1 || groups.some((group) => Boolean(group.title?.trim() && group.title.trim() !== 'Ingredienser'));

    return (
      <div className="recipe-quick-edit__section">
        {groups.map((group, groupIndex) => (
          <div key={`${groupIndex}-${group.title ?? 'group'}`} className="recipe-quick-edit__group">
            {showGroupTitles ? (
              <input
                className="recipe-quick-edit__group-title"
                value={group.title ?? ''}
                onChange={(event) =>
                  updateDraftIngredientGroups((prev) =>
                    prev.map((entry, idx) =>
                      idx === groupIndex ? { ...entry, title: event.target.value } : entry,
                    ),
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
    );
  };

  const renderQuickEditSteps = () => {
    if (!draftRecipe) return null;

    return (
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
    );
  };

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

  const currentRecipe = displayRecipe ?? liveRecipe;

  return (
    <div className="recipe-shell" style={heroStyle}>
      <div className="recipe-mobile-only recipe-mobile-simple">
        <div className="recipe-cover__media2">
          <Image src={heroImage} alt={currentRecipe.title} fill sizes="100vw" priority className="recipe-cover__image-background" />
          <section className="recipe-cover">
            <div className="recipe-cover__media">
              <Image src={heroImage} alt={currentRecipe.title} fill sizes="100vw" priority className="recipe-cover__image" />
            </div>
            <div className="recipe-cover__overlay">
              <button type="button" className="back-button back-button--mobile-icon" onClick={handleBack} aria-label="Tillbaka">
                <i className="fa-solid fa-arrow-left" aria-hidden="true" />
              </button>
              {!isQuickEditing ? (
                <button
                  type="button"
                  className="recipe-edit-button recipe-edit-button--mobile"
                  onClick={handleStartQuickEdit}
                  aria-label="Redigera recept"
                  title="Redigera recept"
                >
                  <i className="fa-solid fa-pen-to-square" aria-hidden="true" />
                </button>
              ) : null}
              <button
                type="button"
                className="recipe-share-button recipe-share-button--mobile"
                onClick={handleShare}
                aria-label="Dela recept"
                title="Dela recept"
              >
                <i className="fa-solid fa-arrow-up-from-bracket" aria-hidden="true" />
              </button>
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
                {shareStatus ? <div className="recipe-share-feedback recipe-share-feedback--mobile">{shareStatus}</div> : null}
                {editStatus ? <div className="recipe-share-feedback recipe-share-feedback--mobile">{editStatus}</div> : null}
              </div>
            </div>
          </section>

          <section className={isQuickEditing ? 'recipe-mobile-main recipe-mobile-main--editing' : 'recipe-mobile-main'}>
            <div className="recipe-mobile-content">
              {isQuickEditing && draftRecipe ? (
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
                  {activeView === 'ingredients' ? renderQuickEditIngredients() : renderQuickEditSteps()}
                </div>
              ) : activeView === 'ingredients' ? (
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
                      {currentRecipe.steps.map((step, index) => {
                        const isChecked = Boolean(checkedSteps[index]);
                        const displayTitle = getRecipeStepLabel(step, index);
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
            {isQuickEditing ? (
              <div className="recipe-quick-edit__actions">
                <button type="button" className="recipe-quick-edit__cancel" onClick={handleCancelQuickEdit}>
                  Avbryt
                </button>
                <button type="button" className="recipe-quick-edit__save" onClick={handleSaveQuickEdit} disabled={isSavingEdit}>
                  {isSavingEdit ? 'Sparar…' : 'Spara'}
                </button>
              </div>
            ) : (
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
            )}
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
                      {liveRecipe.steps.map((step, index) => {
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
              {shareStatus && <div className="recipe-share-feedback">{shareStatus}</div>}
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
