// Lines that appear or change in place (a proof's result, the timer's end, a note under a
// field) are marked accessibilityLiveRegion, which only Android reads. VoiceOver on iOS
// ignores it, so there the line is said with announceForAccessibility instead. Never on
// Android (TalkBack reads the live region, and it would be said twice) or in the browser
// preview (react-native-web turns the live region into aria-live).
import { useEffect, useRef } from 'react';
import { AccessibilityInfo, Platform } from 'react-native';

/** Says `text` with VoiceOver after whatever it's saying now. iOS only. */
export function announce(text: string): void {
  if (Platform.OS !== 'ios' || !text) return;
  AccessibilityInfo.announceForAccessibilityWithOptions(text, { queue: true });
}

/**
 * One step of useAnnounce: what to say (if anything) and what counts as said. Nothing while
 * held; a change made meanwhile is said once the hold ends. The same line again says nothing.
 */
export function nextAnnouncement(said: string | null, text: string | null | undefined, hold: boolean): { said: string | null; say: string | null } {
  const t = text || null;
  if (hold || t === said) return { said, say: null };
  return { said: t, say: t };
}

/**
 * Says `text` with VoiceOver when it changes to something new (null says nothing). Not what's
 * there when the screen opens, which VoiceOver reads anyway, unless `onMount`: a stage that
 * replaces the whole screen, like the done stage. `hold` waits, for a screen under another one.
 */
export function useAnnounce(text: string | null | undefined, { onMount = false, hold = false }: { onMount?: boolean; hold?: boolean } = {}): void {
  const said = useRef<string | null>(onMount ? null : text || null);
  useEffect(() => {
    const next = nextAnnouncement(said.current, text, hold);
    said.current = next.said;
    if (next.say) announce(next.say);
  }, [text, hold]);
}
