import { useEffect, useRef, useState } from 'react';
import { Animated, Pressable, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { COPY } from '../../content/copy';
import { Icon } from '../../ui/icons';
import { T } from '../../ui/text';
import { ease, MARGIN } from '../../ui/tokens';

/** Text that crossfades (200 ms) when it changes. */
function Crossfade({ text, color, v }: { text: string; color: string; v: 'label' | 'mono' }) {
  const [shown, setShown] = useState(text);
  const [a] = useState(() => new Animated.Value(1));
  const pending = useRef(text);
  useEffect(() => {
    if (text === shown) return;
    pending.current = text;
    Animated.timing(a, { toValue: 0, duration: 100, easing: ease.in, useNativeDriver: true }).start(() => {
      setShown(pending.current);
      Animated.timing(a, { toValue: 1, duration: 100, easing: ease.out, useNativeDriver: true }).start();
    });
  }, [text, shown, a]);
  return (
    <Animated.View style={{ opacity: a }}>
      <T v={v} color={color} numberOfLines={1}>
        {shown}
      </T>
    </Animated.View>
  );
}

/** Left: chapter label (tap to read only that chapter). Right: mono catalogue number. */
export function RunningHead({
  left,
  right,
  color,
  onPressLeft,
  onClear,
  leftHint,
}: {
  left: string;
  right: string;
  color: string;
  onPressLeft?: () => void;
  /** Shows a × after the label (filtered reading). */
  onClear?: () => void;
  leftHint?: string;
}) {
  const insets = useSafeAreaInsets();
  return (
    <View
      pointerEvents="box-none"
      style={{
        position: 'absolute',
        top: insets.top + 19 - 14,
        left: MARGIN,
        right: MARGIN,
        height: 44,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
      }}>
      <View style={{ flexDirection: 'row', alignItems: 'center' }}>
        <Pressable
          disabled={!onPressLeft}
          onPress={onPressLeft}
          accessibilityRole={onPressLeft ? 'button' : 'text'}
          accessibilityHint={leftHint}
          hitSlop={{ top: 0, bottom: 0, left: 8, right: 8 }}
          style={{ height: 44, justifyContent: 'center' }}>
          <Crossfade text={left} color={color} v="label" />
        </Pressable>
        {onClear ? (
          <Pressable
            onPress={onClear}
            accessibilityRole="button"
            accessibilityLabel={COPY.reader.a11y.showMix}
            style={{ width: 44, height: 44, alignItems: 'center', justifyContent: 'center', marginLeft: -6 }}>
            <Icon name="close" size={16} color={color} />
          </Pressable>
        ) : null}
      </View>
      <Crossfade text={right} color={color} v="mono" />
    </View>
  );
}
