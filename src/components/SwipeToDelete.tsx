import { useRef, useState, type PointerEvent, type ReactNode } from 'react';
import { TrashIcon } from './icons';

interface SwipeToDeleteProps {
  onDelete: () => void;
  /** Text revealed behind the row while swiping. */
  label: string;
  className?: string;
  children: ReactNode;
}

const LOCK_PX = 8;

/**
 * Swipe a row to the left to delete it. Vertical scrolling keeps working (touch-action: pan-y)
 * and a click is suppressed after a drag. Keyboard and screen-reader users use the row's
 * regular delete button instead.
 */
export function SwipeToDelete({ onDelete, label, className = '', children }: SwipeToDeleteProps) {
  const [dx, setDx] = useState(0);
  const [dragging, setDragging] = useState(false);
  const rowRef = useRef<HTMLDivElement>(null);
  const gesture = useRef<{ x: number; y: number; locked: boolean | null } | null>(null);
  const dragged = useRef(false);

  const onPointerDown = (e: PointerEvent<HTMLDivElement>) => {
    if (e.pointerType === 'mouse' && e.button !== 0) return;
    gesture.current = { x: e.clientX, y: e.clientY, locked: null };
    dragged.current = false;
  };

  const onPointerMove = (e: PointerEvent<HTMLDivElement>) => {
    const g = gesture.current;
    if (!g) return;
    const ddx = e.clientX - g.x;
    const ddy = e.clientY - g.y;
    if (g.locked === null) {
      if (Math.abs(ddx) > LOCK_PX && Math.abs(ddx) > Math.abs(ddy)) {
        g.locked = true;
        e.currentTarget.setPointerCapture(e.pointerId);
        setDragging(true);
      } else if (Math.abs(ddy) > LOCK_PX) {
        g.locked = false; // vertical scroll wins
      }
    }
    if (g.locked) {
      dragged.current = true;
      setDx(Math.min(0, ddx));
    }
  };

  const finish = () => {
    const g = gesture.current;
    gesture.current = null;
    if (!g?.locked) return;
    setDragging(false);
    const width = rowRef.current?.offsetWidth ?? 300;
    if (-dx > Math.min(width * 0.35, 140)) {
      setDx(-width);
      window.setTimeout(onDelete, 180);
    } else {
      setDx(0);
    }
  };

  return (
    <div className={`relative overflow-hidden ${className}`}>
      <div
        aria-hidden="true"
        className={`absolute inset-0 flex items-center justify-end gap-2 bg-neg-solid pr-5 font-semibold text-white transition-opacity ${
          dx < 0 ? 'opacity-100' : 'opacity-0'
        }`}
      >
        <TrashIcon />
        {label}
      </div>
      <div
        ref={rowRef}
        style={{ transform: dx ? `translateX(${dx}px)` : undefined, touchAction: 'pan-y' }}
        className={`relative ${dragging ? '' : 'transition-transform duration-200 ease-out'}`}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={finish}
        onPointerCancel={finish}
        onClickCapture={(e) => {
          if (dragged.current) {
            e.preventDefault();
            e.stopPropagation();
            dragged.current = false;
          }
        }}
        onDragStart={(e) => e.preventDefault()}
      >
        {children}
      </div>
    </div>
  );
}
