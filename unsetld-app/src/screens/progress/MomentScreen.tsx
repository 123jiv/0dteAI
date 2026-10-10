import { useEffect, useState } from 'react';
import { AccessibilityInfo, Animated, Platform, Pressable, ScrollView, useWindowDimensions, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { milestones, type MilestoneKey } from '../../core/progress';
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

function markSeen(key: MilestoneKey) {
  const s = useApp.getState();
  if (milestones(s.record, s.currentDay).some(m => m.key === key && m.reached)) s.markMomentShown(key);
}

/** A progress milestone reached: shown once, letter-style, on opaque ink. */
export function MomentScreen({ navigation, route }: RootProps<'Moment'>) {
  const { key } = route.params;
  const routeKey = route.key;
  const { height } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const today = useApp(s => s.currentDay);
  const record = useApp(s => s.record);
  // Null when it isn't reached (a stale link): then no date is claimed.
  const reached = milestones(record, today).find(m => m.key === key)?.reached ?? null;
  const words = M.byKey[key] ?? { title: '', line: '' };
  const [rise] = useState(() => new Animated.Value(0));

  // The page settles in (Reduce Motion: no movement), with a soft tap the first time it shows.
  // Home marks a moment shown as it opens it, so a revisit is told apart by where it was
  // opened from: a reached milestone tapped on Progress.
  useEffect(() => {
    let live = true;
    const { routes } = navigation.getState();
    const at = routes.findIndex(r => r.key === routeKey);
    const revisit = at > 0 && routes[at - 1].name === 'Main' && useApp.getState().momentsShown.includes(key);
    if (!revisit) soft();
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
  }, [key, rise, navigation, routeKey]);

  // However the page is left (Close, the X, a swipe), the moment has been seen. Only once it's
  // reached, though: a moment opened early must still show when the milestone comes.
  useEffect(() => navigation.addListener('beforeRemove', () => markSeen(key)), [navigation, key]);

  const close = () => {
    markSeen(key);
    if (navigation.canGoBack()) navigation.goBack();
    else navigation.navigate('Main', { screen: 'Today' });
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
          {reached ? (
            <T v="kicker" color={C.stone} accessibilityLabel={M.a11yDate(reached)} style={{ marginBottom: 14 }}>
              {M.reached(reached)}
            </T>
          ) : null}
          <T v="letter.day" style={{ fontVariant: ['lining-nums'] }} accessibilityRole="header">
            {words.title}
          </T>
          <T v="body" color={C.muted} style={{ marginTop: 20 }}>
            {words.line}
          </T>
          <T v="letter.sub" color={C.stone} style={{ marginTop: 32 }}>
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
