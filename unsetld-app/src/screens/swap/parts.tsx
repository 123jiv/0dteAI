// Pieces the swap sheet's steps share: a raised row, the small back control, what the keyboard
// hides of a sheet (step 3 keeps its field and button in view), a step kept out of reach while
// another is over it, and a quick fade between steps.
import { useEffect, useLayoutEffect, useRef, useState, type ReactNode } from 'react';
import {
  Animated,
  Keyboard,
  LayoutAnimation,
  Platform,
  Pressable,
  StyleSheet,
  View,
  type KeyboardEvent,
  type StyleProp,
  type ViewStyle,
} from 'react-native';
import { Icon } from '../../ui/icons';
import { T } from '../../ui/text';
import { color as C, ease, radius } from '../../ui/tokens';

/** A row on the sheet's raised surface: one step up from it, a little more when pressed. */
export const ROW = C.cardPressed;
export const ROW_DOWN = '#252421';

/** A full-width raised row, the whole of it one button. No icons, no rules. */
export function Row({
  label,
  children,
  onPress,
  accessibilityLabel,
  accessibilityHint,
  outline = false,
  style,
}: {
  /** One line of text; or `children` for more. */
  label?: string;
  children?: ReactNode;
  onPress: () => void;
  accessibilityLabel?: string;
  accessibilityHint?: string;
  /** Drawn as a quiet outline instead of a fill (+ Create my own, under the choices). */
  outline?: boolean;
  style?: StyleProp<ViewStyle>;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel ?? label}
      accessibilityHint={accessibilityHint}
      onPress={onPress}
      style={({ pressed }) => [
        {
          minHeight: 54,
          paddingHorizontal: 18,
          paddingVertical: label ? 14 : 16,
          justifyContent: 'center',
          borderRadius: radius.card,
          backgroundColor: outline ? (pressed ? ROW : 'transparent') : pressed ? ROW_DOWN : ROW,
          borderWidth: outline ? 1 : 0,
          borderColor: C.ruleStrong,
        },
        style,
      ]}>
      {children ?? <T v="row">{label}</T>}
    </Pressable>
  );
}

/** The chevron back to the step before, 44pt square, its glyph on the sheet's margin. */
export function Back({ onPress, label, hint }: { onPress: () => void; label: string; hint: string }) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityHint={hint}
      onPress={onPress}
      hitSlop={4}
      style={({ pressed }) => ({ width: 44, height: 44, marginLeft: -14, justifyContent: 'center', alignItems: 'center', opacity: pressed ? 0.6 : 1 })}>
      <Icon name="chevron-left" size={22} color={C.stone} />
    </Pressable>
  );
}

/** ui/Sheet's grabber bar, above a sheet's content. */
export const SHEET_GRABBER = 22;

export interface KeyboardCut {
  /** How much of the sheet's top is above the screen. */
  top: number;
  /** How much of the sheet's bottom is behind the keyboard. */
  bottom: number;
}

const NO_CUT: KeyboardCut = { top: 0, bottom: 0 };

/**
 * What the keyboard hides of a sheet `sheetHeight` tall, anchored to the bottom of the screen.
 * On iOS the keyboard covers its bottom. In a phone browser the page's visible part shrinks
 * instead (window.visualViewport): most browsers leave the page as it is and the keyboard
 * covers its bottom, some shorten the whole page and push the sheet's top above the screen.
 */
export function useKeyboardInset(sheetHeight: number): KeyboardCut {
  const [cut, setCut] = useState<KeyboardCut>(NO_CUT);
  useEffect(() => {
    if (Platform.OS !== 'ios') return;
    // Moves with the keyboard, the way KeyboardAvoidingView does.
    const follow = (e: KeyboardEvent) => {
      if (!e.duration) return;
      const duration = Math.max(10, e.duration);
      const type = (e.easing && LayoutAnimation.Types[e.easing as keyof typeof LayoutAnimation.Types]) || LayoutAnimation.Types.keyboard;
      LayoutAnimation.configureNext({ duration, update: { duration, type } });
    };
    const show = Keyboard.addListener('keyboardWillShow', e => {
      follow(e);
      setCut({ top: 0, bottom: e.endCoordinates.height });
    });
    const hide = Keyboard.addListener('keyboardWillHide', e => {
      follow(e);
      setCut(NO_CUT);
    });
    return () => {
      show.remove();
      hide.remove();
    };
  }, []);
  useEffect(() => {
    if (Platform.OS !== 'web' || typeof window === 'undefined' || !window.visualViewport) return;
    const shown = window.visualViewport;
    const read = () => {
      // Pinched in, the page isn't short of room: nothing to move.
      if (Math.abs(shown.scale - 1) > 0.01) return setCut(NO_CUT);
      // The sheet sits at the bottom of the page (a fixed layer), whatever part of it shows.
      const page = document.documentElement.clientHeight;
      const top = Math.max(0, Math.round(shown.offsetTop - (page - sheetHeight)));
      const bottom = Math.max(0, Math.round(page - shown.offsetTop - shown.height));
      setCut(c => (c.top === top && c.bottom === bottom ? c : top || bottom ? { top, bottom } : NO_CUT));
    };
    read();
    shown.addEventListener('resize', read);
    shown.addEventListener('scroll', read);
    return () => {
      shown.removeEventListener('resize', read);
      shown.removeEventListener('scroll', read);
    };
  }, [sheetHeight]);
  return cut;
}

/**
 * Keeps a sheet out of reach while another is over it: no screen reader, no Tab key (the
 * browser's `inert`), nothing pressed. Fills the screen, like the sheet inside it.
 */
export function OutOfReach({ when, children }: { when: boolean; children: ReactNode }) {
  const ref = useRef<View>(null);
  useLayoutEffect(() => {
    if (Platform.OS !== 'web') return;
    (ref.current as unknown as HTMLElement | null)?.toggleAttribute?.('inert', when);
  }, [when]);
  return (
    <View
      ref={ref}
      accessibilityElementsHidden={when}
      importantForAccessibility={when ? 'no-hide-descendants' : 'auto'}
      style={when ? reach.out : reach.in}>
      {children}
    </View>
  );
}

// From StyleSheet.create: react-native-web only draws 'box-none' from a compiled style, not an
// inline one (it isn't a CSS value), and would keep the 'none' from before.
const reach = StyleSheet.create({
  in: { position: 'absolute', top: 0, right: 0, bottom: 0, left: 0, pointerEvents: 'box-none' },
  out: { position: 'absolute', top: 0, right: 0, bottom: 0, left: 0, pointerEvents: 'none' },
});

/** Fades its step in. Give it a `key` per step so each new step fades in once. */
export function FadeIn({ children }: { children: ReactNode }) {
  const [opacity] = useState(() => new Animated.Value(0));
  useEffect(() => {
    Animated.timing(opacity, { toValue: 1, duration: 180, easing: ease.out, useNativeDriver: Platform.OS !== 'web' }).start();
  }, [opacity]);
  return <Animated.View style={{ flex: 1, opacity }}>{children}</Animated.View>;
}

/** A quiet sentence-case label over a group of chips ("Area"). */
export function GroupLabel({ children }: { children: string }) {
  return (
    <View style={{ marginTop: 22, marginBottom: 10 }}>
      <T v="meta" color={C.stone}>
        {children}
      </T>
    </View>
  );
}
