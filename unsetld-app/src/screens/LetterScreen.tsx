import { useEffect, useState } from 'react';
import { AccessibilityInfo, Animated, Platform, Pressable, ScrollView, useWindowDimensions, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { letterTier } from '../core/rewards';
import { REWARDS_COPY } from '../content/copy/rewards';
import type { RootProps } from '../navigation/types';
import { soft } from '../services/haptics';
import { useApp } from '../state/store';
import { Icon } from '../ui/icons';
import { Button, TextButton } from '../ui/kit';
import { T } from '../ui/text';
import { color as C, ease, MARGIN } from '../ui/tokens';
import { Walker } from '../ui/Walker';
import { useStatusTiers } from './access';
import { LINING } from './rewards/redeem';

const L = REWARDS_COPY.letter;

/**
 * The status letter: a tier of days proven reached ("7 DAYS PROVEN." / "10% off is yours.").
 * Shown once, on opaque ink, letter-style like a progress moment. Get the code opens the
 * tier's page, where the code is taken; Not now closes it, and the code waits on Status.
 * It's marked shown as it opens, so either way (or the X, or a swipe) it doesn't come back;
 * marking it also covers every lower tier (core/record markLetterShown). The tier is the one
 * at the letter's day in the tiers in effect; when there's none (the config moved it or
 * switched it off since), the letter closes without showing.
 */
export function LetterScreen({ navigation, route }: RootProps<'Letter'>) {
  const { letter } = route.params;
  const { height } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const tiers = useStatusTiers();
  const tier = letterTier(letter, tiers);
  const gone = !tier;
  const [rise] = useState(() => new Animated.Value(0));

  useEffect(() => {
    useApp.getState().letterShown(letter);
  }, [letter]);

  // The page settles in with a soft tap (Reduce Motion: no movement).
  useEffect(() => {
    if (gone) return;
    let live = true;
    soft();
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
  }, [gone, rise]);

  const close = () => {
    if (navigation.canGoBack()) navigation.goBack();
    else navigation.popTo('Main', { screen: 'Today' });
  };
  useEffect(() => {
    if (gone) navigation.goBack();
  }, [gone, navigation]);

  if (!tier) return <View style={{ flex: 1, backgroundColor: C.ink }} />;
  const getCode = () => navigation.replace('Milestone', { id: tier.id });

  return (
    <View style={{ flex: 1, backgroundColor: C.ink }}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ flexGrow: 1, paddingHorizontal: MARGIN, paddingTop: Math.max(insets.top + 72, Math.round(height * 0.24)), paddingBottom: insets.bottom + 40 }}>
        <Animated.View style={{ opacity: rise, transform: [{ translateY: rise.interpolate({ inputRange: [0, 1], outputRange: [12, 0] }) }] }}>
          <T v="kicker" color={C.stone} accessibilityLabel={L.kickerA11y(letter.day)} style={{ marginBottom: 14 }}>
            {L.kicker(letter.day)}
          </T>
          <T v="letter.day" style={LINING} accessibilityRole="header">
            {L.title(tier.title)}
          </T>
          <T v="body" color={C.muted} style={{ marginTop: 20 }}>
            {L.line(tier)}
          </T>
          <Button title={L.primary} onPress={getCode} accessibilityLabel={`${L.primary}: ${tier.title}`} style={{ marginTop: 40 }} />
          <TextButton title={L.secondary} onPress={close} style={{ marginTop: 8 }} />
        </Animated.View>
        <View style={{ flexGrow: 1, minHeight: 48 }} />
        <View style={{ alignItems: 'center' }}>
          <Walker height={49} />
        </View>
      </ScrollView>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={L.close}
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
