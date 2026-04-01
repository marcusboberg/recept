'use client';

import { useEffect, useRef, useState } from 'react';

type ViewMode = 'ingredients' | 'steps';

interface Args {
  ingredientGroupCount: number;
  stepCount: number;
}

export function useRecipeChecklistState({ ingredientGroupCount, stepCount }: Args) {
  const [activeView, setActiveView] = useState<ViewMode>('ingredients');
  const [checkedIngredients, setCheckedIngredients] = useState<Record<string, boolean>>({});
  const [checkedSteps, setCheckedSteps] = useState<Record<number, boolean>>({});
  const scrollRef = useRef<HTMLDivElement | null>(null);
  const [showScrollHint, setShowScrollHint] = useState(false);
  const toggleDirection: 'left' | 'right' = activeView === 'ingredients' ? 'left' : 'right';

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
  }, [activeView, ingredientGroupCount, stepCount]);

  useEffect(() => {
    const el = scrollRef.current;
    if (el) {
      el.scrollTop = 0;
      const frame = window.requestAnimationFrame(() => {
        const hasScroll = el.scrollHeight > el.clientHeight + 1;
        const atBottom = el.scrollTop + el.clientHeight >= el.scrollHeight - 1;
        setShowScrollHint(hasScroll && !atBottom);
      });
      return () => window.cancelAnimationFrame(frame);
    }
    return undefined;
  }, [activeView, ingredientGroupCount, stepCount]);

  return {
    activeView,
    setActiveView,
    checkedIngredients,
    checkedSteps,
    scrollRef,
    showScrollHint,
    toggleDirection,
    toggleIngredient,
    toggleStep,
  };
}
