import { useRef, type MouseEvent, type PointerEvent } from 'react';

/** Ignores click if pointer moved significantly (drag-scroll / text selection). */
export function useSafeClick(onClick: () => void, thresholdPx = 6) {
  const start = useRef<{ x: number; y: number } | null>(null);

  return {
    onPointerDown: (event: PointerEvent) => {
      start.current = { x: event.clientX, y: event.clientY };
    },
    onClick: (event: MouseEvent) => {
      if (start.current) {
        const dx = Math.abs(event.clientX - start.current.x);
        const dy = Math.abs(event.clientY - start.current.y);
        start.current = null;
        if (dx > thresholdPx || dy > thresholdPx) {
          event.preventDefault();
          return;
        }
      }
      onClick();
    },
  };
}
