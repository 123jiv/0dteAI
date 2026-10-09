import { useEffect, useState } from 'react';
import { AccessibilityInfo, Animated, Platform, Pressable, ScrollView, useWindowDimensions, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { milestones } from '../../core/progress';
import { shortDate } from '../../core/time';
import { PROGRESS } from '../../content/copy/progress';
import type { RootProps } from '../../navigation/types';
import { soft } from '../../services/haptics';
import { useApp } from '../../state/store';
import { Icon } from '../../ui/icons';
import { Button } from '../../ui/kit';
import { T } from '../../ui/text';
import { color as C, ease, MARGIN } from '../../ui/tokens';
import { Walker } from '../../ui/Walker';

const M = PROGRESS.moment;

/** A progress milestone reached: shown once, letter-style, on opaque ink. */
export function MomentScreen({ navigation, route }: RootProps<'Moment'>) {
  const { key } = route.params;
  const { height } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const today = useApp(s => s.currentDay);
  const record = useApp(s => s.record);
  const reached = milestones(record, today).find(m => m.key === key)?.reached ?? today;
  const words = M.byKey[key] ?? { title: '', line: '' };
  const [rise] = useState(() => new Animated.Value(0));

  // The first time it shows: a soft tap, and the page settles in. Reduce Motion: no movement.
  useEffect(() => {
    let live = true;
    if (!useApp.getState().momentsShown.includes(key)) soft();
    AccessibilityInfo.isReduceMotionEnabled()
      .catch(() => false)
      .then(reduce => {
        if (!live) return;
        if (reduce) rise.setValue(1);
        else Animated.timing(rise, { toValue: 1, duration: 600, easing: ease.out, useNativeDriver: Platform.OS !== 'web' }).start();
      });
    return () => {
      live = false;
    };
  }, [key, rise]);

  // However the page is left (Close, the X, a swipe), the moment has been seen.
  useEffect(() => navigation.addListener('beforeRemove', () => useApp.getState().markMomentShown(key)), [navigation, key]);

  const close = () => {
    useApp.getState().markMomentShown(key);
    if (navigation.canGoBack()) navigation.goBack();
    else navigation.navigate('Today');
  };

  return (
    <View style={{ flex: 1, backgroundColor: C.ink }}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ flexGrow: 1, paddingHorizontal: MARGIN, paddingTop: Math.max(insets.top + 72, Math.round(height * 0.24)), paddingBottom: insets.bottom + 40 }}>
        <Animated.View
          style={{
            opacity: rise,
            transform: [{ translateY: rise.interpolate({ inputRange: [0, 1], outputRange: [12, 0] }) }],
          }}>
          <T v="mono" accessibilityLabel={M.a11yDate(shortDate(reached))}>
            {M.reached(shortDate(reached))}
          </T>
          <T v="letter.day" style={{ marginTop: 12, fontVariant: ['lining-nums'] }} accessibilityRole="header">
            {words.title}
          </T>
          <T v="body" style={{ marginTop: 20 }}>
            {words.line}
          </T>
          <T v="letter.sub" color={C.stone} style={{ marginTop: 28 }}>
            {M.footer}
          </T>
          <Button title={M.close} onPress={close} style={{ marginTop: 40 }} />
        </Animated.View>
        <View style={{ flexGrow: 1, minHeight: 48 }} />
        <View style={{ alignItems: 'center' }}>
          <Walker height={49} />
        </View>
      </ScrollView>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={M.close}
        onPress={close}
        style={({ pressed }) => ({
          position: 'absolute',
          top: insets.top + 8,
          left: MARGIN - 10,
          width: 44,
          height: 44,
          justifyContent: 'center',
          paddingLeft: 6,
          opacity: pressed ? 0.6 : 1,
        })}>
        <Icon name="close" size={24} />
      </Pressable>
    </View>
  );
}
