import { useCallback, useRef, type PointerEvent as ReactPointerEvent } from 'react';

interface Options {
  axis: 'x' | 'y';
  value: number;
  min: number;
  max: number;
  onChange: (next: number) => void;
}

export function usePointerResize({ axis, value, min, max, onChange }: Options) {
  const dragRef = useRef<{ startPos: number; startValue: number } | null>(null);

  const onPointerDown = useCallback(
    (event: ReactPointerEvent<HTMLElement>) => {
      event.preventDefault();
      event.stopPropagation();
      const target = event.currentTarget;
      target.setPointerCapture(event.pointerId);
      dragRef.current = {
        startPos: axis === 'x' ? event.clientX : event.clientY,
        startValue: value,
      };
    },
    [axis, value],
  );

  const onPointerMove = useCallback(
    (event: ReactPointerEvent<HTMLElement>) => {
      if (!dragRef.current) {
        return;
      }
      const current = axis === 'x' ? event.clientX : event.clientY;
      const delta = current - dragRef.current.startPos;
      const next = Math.min(max, Math.max(min, Math.round(dragRef.current.startValue + delta)));
      onChange(next);
    },
    [axis, max, min, onChange],
  );

  const endDrag = useCallback((event: ReactPointerEvent<HTMLElement>) => {
    if (!dragRef.current) {
      return;
    }
    dragRef.current = null;
    try {
      event.currentTarget.releasePointerCapture(event.pointerId);
    } catch {
      // ignore
    }
  }, []);

  return { onPointerDown, onPointerMove, onPointerUp: endDrag };
}
