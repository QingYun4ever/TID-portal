import { useLayoutEffect, useState } from 'react';

/** Keep a closing surface mounted while CSS transitions retarget its visual state. */
export function useMotionPresence(open: boolean, duration = 240): { present: boolean; active: boolean } {
  const [presence, setPresence] = useState({ present: false, active: false });

  useLayoutEffect(() => {
    if (!open && !presence.present) return;
    const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
    let frame = 0;
    let timer: number | undefined;

    const cancelScheduled = () => {
      cancelAnimationFrame(frame);
      window.clearTimeout(timer);
    };
    const finishImmediately = () => {
      cleanup();
      setPresence({ present: open, active: open });
    };
    const scheduleExit = () => {
      cancelScheduled();
      timer = window.setTimeout(
        finishImmediately,
        reducedMotion.matches ? Math.min(duration, 160) : duration
      );
    };
    const onPreferenceChange = () => {
      if (!open && presence.present) scheduleExit();
    };
    const instant = document.documentElement.dataset.motionInput === 'keyboard' || duration <= 0;
    const cleanup = () => {
      cancelScheduled();
      reducedMotion.removeEventListener('change', onPreferenceChange);
      document.removeEventListener('keydown', finishImmediately, true);
    };

    reducedMotion.addEventListener('change', onPreferenceChange);
    document.addEventListener('keydown', finishImmediately, true);

    if (open) {
      // Reopening during exit keeps the same DOM and reverses from its current transform.
      const active = instant || presence.present;
      setPresence({ present: true, active });
      if (!active) {
        frame = requestAnimationFrame(() => {
          frame = requestAnimationFrame(() => setPresence({ present: true, active: true }));
        });
      }
    } else {
      setPresence((current) => ({ ...current, active: false }));
      if (instant || !presence.present) finishImmediately();
      else scheduleExit();
    }

    return cleanup;
  }, [open, duration]);

  return { present: open || presence.present, active: open && presence.active };
}
