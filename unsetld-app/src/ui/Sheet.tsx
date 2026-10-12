import { useEffect, useRef, useState, type ReactNode } from 'react';
import { Animated, Modal, Pressable, StyleSheet, useWindowDimensions, View, type GestureResponderEvent } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { color as C, ease, radius } from './tokens';

interface Props {
  visible: boolean;
  onClose: () => void;
  /** Fraction of the screen height. */
  detent: number;
  /** Dim behind the sheet. The colorway sheet keeps the reader visible as a live preview. */
  dim?: number;
  children: ReactNode;
  /** Fixed bar pinned to the bottom of the sheet. */
  footer?: ReactNode;
  accessibilityLabel?: string;
  /**
   * Draw it in a transparent modal, over everything (the tab bar included). For sheets opened
   * from a tab screen whose content doesn't navigate; one that does needs its own modal that
   * waits for the dismissal first (today/ColorwaySheet).
   */
  modal?: boolean;
  /** What the dimmed area behind the sheet says to VoiceOver (it closes the sheet unless onClose does something else). Default "Close". */
  closeLabel?: string;
  closeHint?: string;
}

/**
 * Bottom sheet drawn like an iOS form sheet: raise background, 14pt corners,
 * a grabber, drag the grabber down or tap outside to close. Renders over the
 * whole screen, so place it at the screen's root.
 */
export function Sheet({ visible, onClose, detent, dim = 0.45, children, footer, accessibilityLabel, modal = false, closeLabel = 'Close', closeHint }: Props) {
  const { height } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const sheetH = Math.round(height * detent);
  const [mounted, setMounted] = useState(visible);
  const [y] = useState(() => new Animated.Value(sheetH));
  const [dragFrom, setDragFrom] = useState<number | null>(null);

  // Mount as soon as it should show; unmount after the closing slide.
  if (visible && !mounted) setMounted(true);

  // Slide in or out only when `visible` flips. A new height while it's open (the window resizes,
  // a browser keyboard shrinks the viewport) keeps the sheet where it is instead of replaying the slide.
  const heightNow = useRef(sheetH);
  useEffect(() => {
    heightNow.current = sheetH;
  }, [sheetH]);
  useEffect(() => {
    const h = heightNow.current;
    if (visible) {
      y.setValue(h);
      Animated.timing(y, { toValue: 0, duration: 320, easing: ease.out, useNativeDriver: true }).start();
    } else {
      Animated.timing(y, { toValue: h, duration: 240, easing: ease.in, useNativeDriver: true }).start(({ finished }) => {
        if (finished) setMounted(false);
      });
    }
  }, [visible, y]);

  const grabber = {
    onStartShouldSetResponder: () => true,
    onMoveShouldSetResponder: () => true,
    onResponderGrant: (e: GestureResponderEvent) => setDragFrom(e.nativeEvent.pageY),
    onResponderMove: (e: GestureResponderEvent) => {
      if (dragFrom !== null) y.setValue(Math.max(0, e.nativeEvent.pageY - dragFrom));
    },
    onResponderRelease: (e: GestureResponderEvent) => {
      const dy = dragFrom === null ? 0 : e.nativeEvent.pageY - dragFrom;
      setDragFrom(null);
      if (dy > 90) onClose();
      else Animated.timing(y, { toValue: 0, duration: 200, easing: ease.out, useNativeDriver: true }).start();
    },
  };

  if (!mounted) return null;
  const scrim = y.interpolate({ inputRange: [0, sheetH], outputRange: [dim, 0], extrapolate: 'clamp' });
  const sheet = (
    // Pointer events from a StyleSheet: react-native-web keeps an inline 'none' after it changes back.
    <View style={[StyleSheet.absoluteFill, visible ? S.open : S.closing]} accessibilityViewIsModal>
      <Animated.View style={[StyleSheet.absoluteFill, { backgroundColor: '#000', opacity: scrim }]}>
        <Pressable style={StyleSheet.absoluteFill} onPress={onClose} accessibilityLabel={closeLabel} accessibilityHint={closeHint} accessibilityRole="button" />
      </Animated.View>
      <Animated.View
        accessibilityLabel={accessibilityLabel}
        style={{
          position: 'absolute',
          left: 0,
          right: 0,
          bottom: 0,
          height: sheetH,
          backgroundColor: C.raise,
          borderTopLeftRadius: radius.sheet,
          borderTopRightRadius: radius.sheet,
          overflow: 'hidden',
          transform: [{ translateY: y }],
        }}>
        <View {...grabber} style={{ height: 22, alignItems: 'center', justifyContent: 'center' }}>
          <View style={{ width: 36, height: 5, borderRadius: 2.5, backgroundColor: C.ruleStrong }} />
        </View>
        <View style={{ flex: 1 }}>{children}</View>
        {footer ? <View style={{ paddingBottom: insets.bottom + 12, backgroundColor: C.raise }}>{footer}</View> : null}
      </Animated.View>
    </View>
  );
  if (!modal) return sheet;
  // Up for as long as the sheet is mounted, closing slide included.
  return (
    <Modal visible transparent animationType="none" statusBarTranslucent navigationBarTranslucent onRequestClose={onClose}>
      {sheet}
    </Modal>
  );
}

const S = StyleSheet.create({ open: { pointerEvents: 'box-none' }, closing: { pointerEvents: 'none' } });
