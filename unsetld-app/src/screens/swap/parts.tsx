// Pieces the swap sheet's steps share: a raised row, the small back control, the keyboard's
// height (step 3 keeps its button above it) and a quick fade between steps.
import { useEffect, useState, type ReactNode } from 'react';
import { Animated, Keyboard, LayoutAnimation, Platform, Pressable, View, type KeyboardEvent, type StyleProp, type ViewStyle } from 'react-native';
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

/**
 * How far the keyboard covers a sheet anchored to the bottom of the screen: all of it. iOS only;
 * the browser preview has no keyboard events (and a phone browser resizes the page itself).
 */
export function useKeyboardInset(): number {
  const [inset, setInset] = useState(0);
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
      setInset(e.endCoordinates.height);
    });
    const hide = Keyboard.addListener('keyboardWillHide', e => {
      follow(e);
      setInset(0);
    });
    return () => {
      show.remove();
      hide.remove();
    };
  }, []);
  return inset;
}

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
