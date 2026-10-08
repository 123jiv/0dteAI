import { useEffect, useState, type ReactNode } from 'react';
import { Animated, Pressable, StyleSheet, useWindowDimensions, View, type GestureResponderEvent } from 'react-native';
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
}

/**
 * Bottom sheet drawn like an iOS form sheet: raise background, 14pt corners,
 * a grabber, drag the grabber down or tap outside to close. Renders over the
 * whole screen, so place it at the screen's root.
 */
export function Sheet({ visible, onClose, detent, dim = 0.45, children, footer, accessibilityLabel }: Props) {
  const { height } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const sheetH = Math.round(height * detent);
  const [mounted, setMounted] = useState(visible);
  const [y] = useState(() => new Animated.Value(sheetH));
  const [dragFrom, setDragFrom] = useState<number | null>(null);

  // Mount as soon as it should show; unmount after the closing slide.
  if (visible && !mounted) setMounted(true);

  useEffect(() => {
    if (visible) {
      y.setValue(sheetH);
      Animated.timing(y, { toValue: 0, duration: 320, easing: ease.out, useNativeDriver: true }).start();
    } else {
      Animated.timing(y, { toValue: sheetH, duration: 240, easing: ease.in, useNativeDriver: true }).start(({ finished }) => {
        if (finished) setMounted(false);
      });
    }
  }, [visible, sheetH, y]);

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
  return (
    <View style={StyleSheet.absoluteFill} pointerEvents={visible ? 'box-none' : 'none'} accessibilityViewIsModal>
      <Animated.View style={[StyleSheet.absoluteFill, { backgroundColor: '#000', opacity: scrim }]}>
        <Pressable style={StyleSheet.absoluteFill} onPress={onClose} accessibilityLabel="Close" accessibilityRole="button" />
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
}
