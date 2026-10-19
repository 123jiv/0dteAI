// A note under a text field waits for a pause in typing, so a half-typed word ("gy") or a
// thumb's pause between words doesn't flash one; fixing the text hides it at once (the screen
// shows a note only while both the text and the settled text call for it). Used by the Goal
// screen, the weekly focus "Something else" and a mission of the user's own.
import { useCallback, useEffect, useState } from 'react';

/** How long typing has to pause before a note under the field can appear. */
export const SETTLE_MS = 1200;

/**
 * The text as it was at the last pause in typing, and a way to settle at once (Continue pressed
 * before the pause: the note it was waiting on shows straight away). Emptied text (Clear, or every
 * letter deleted) settles at once, so a note for the old words can't flash on the first new letter.
 */
export function useSettled(text: string, delay = SETTLE_MS): [settled: string, settleNow: () => void] {
  const [settled, setSettled] = useState(text);
  useEffect(() => {
    const t = setTimeout(() => setSettled(text), text.trim() ? delay : 0);
    return () => clearTimeout(t);
  }, [text, delay]);
  const settleNow = useCallback(() => setSettled(text), [text]);
  return [settled, settleNow];
}
