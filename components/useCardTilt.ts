'use client';

import { useCallback, useRef } from 'react';

const TILT_MAX_DEG = 8;

export function useCardTilt() {
  const frameRef = useRef<number | null>(null);

  const handlePointerMove = useCallback((event: React.PointerEvent<HTMLElement>) => {
    if (event.pointerType === 'touch') return;
    const card = event.currentTarget as HTMLElement;
    const { clientX, clientY } = event;

    if (frameRef.current) {
      cancelAnimationFrame(frameRef.current);
    }

    frameRef.current = requestAnimationFrame(() => {
      const rect = card.getBoundingClientRect();
      if (!rect.width || !rect.height) return;

      const x = (clientX - rect.left) / rect.width;
      const y = (clientY - rect.top) / rect.height;
      const normX = 0.5 - y;
      const normY = x - 0.5;
      const tiltX = normX * TILT_MAX_DEG;
      const tiltY = normY * TILT_MAX_DEG;
      const light = Math.min(1, Math.max(0, (normX - normY + 1) / 2));
      const magnitude = Math.min(1, Math.hypot(normX, normY) * 1.6);
      const shine = 0.08 + light * magnitude * 0.55;

      card.style.setProperty('--tilt-x', `${tiltX.toFixed(2)}deg`);
      card.style.setProperty('--tilt-y', `${tiltY.toFixed(2)}deg`);
      card.style.setProperty('--shine-opacity', shine.toFixed(2));
    });
  }, []);

  const handlePointerLeave = useCallback((event: React.PointerEvent<HTMLElement>) => {
    const card = event.currentTarget as HTMLElement;

    if (frameRef.current) {
      cancelAnimationFrame(frameRef.current);
    }
    frameRef.current = null;

    card.style.removeProperty('--tilt-x');
    card.style.removeProperty('--tilt-y');
    card.style.removeProperty('--shine-opacity');
  }, []);

  return { handlePointerMove, handlePointerLeave };
}
