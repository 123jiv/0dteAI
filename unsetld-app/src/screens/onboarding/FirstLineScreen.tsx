import { useEffect, useState } from 'react';
import { AccessibilityInfo, Animated, Text, useWindowDimensions, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { breakBeats, catalogueNo, lineSize, typo } from '../../core/typography';
import { chapterLabel, COLORWAY_BY_ID, ONBOARDING_LINE } from '../../content';
import { COPY } from '../../content/copy';
import type { RootProps } from '../../navigation/types';
import { Button } from '../../ui/kit';
import { T, useSerifScale } from '../../ui/text';
import { color as C, ease, font, MARGIN } from '../../ui/tokens';

const BLACK = COLORWAY_BY_ID.black;

/** O2: line 0001, set like the page it is. A real line within one tap of launch. */
export function FirstLineScreen({ navigation }: RootProps<'FirstLine'>) {
  const insets = useSafeAreaInsets();
  const { height } = useWindowDimensions();
  const scale = useSerifScale();
  const line = ONBOARDING_LINE;
  const [lineIn] = useState(() => new Animated.Value(0));
  const [buttonIn] = useState(() => new Animated.Value(0));
  const [ready, setReady] = useState(false);
  // Reduce Motion: the line fades in without the rise.
  const [reduce, setReduce] = useState(false);

  useEffect(() => {
    AccessibilityInfo.isReduceMotionEnabled()
      .then(setReduce)
      .catch(() => {})
      .finally(() => Animated.timing(lineIn, { toValue: 1, duration: 500, easing: ease.out, useNativeDriver: true }).start());
    const t = setTimeout(() => {
      setReady(true);
      Animated.timing(buttonIn, { toValue: 1, duration: 300, easing: ease.out, useNativeDriver: true }).start();
    }, 2500);
    return () => clearTimeout(t);
  }, [lineIn, buttonIn]);

  if (!line) return null;
  const size = lineSize(line.text, scale);
  return (
    <View style={{ flex: 1, backgroundColor: BLACK.bg }}>
      <View style={{ position: 'absolute', top: insets.top + 5, left: MARGIN, right: MARGIN, height: 44, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
        <T v="label" color={BLACK.secondary}>
          {chapterLabel(line.chapter)}
        </T>
        <T v="mono" color={BLACK.secondary}>
          {catalogueNo(line.no)}
        </T>
      </View>
      <Animated.View
        style={{
          position: 'absolute',
          top: Math.round(height * 0.32),
          left: MARGIN,
          right: MARGIN,
          opacity: lineIn,
          transform: reduce ? [] : [{ translateY: lineIn.interpolate({ inputRange: [0, 1], outputRange: [8, 0] }) }],
        }}>
        <Text allowFontScaling={false} lineBreakStrategyIOS="push-out" accessibilityRole="header" style={{ fontFamily: font.serif, color: BLACK.ink, ...size }}>
          {breakBeats(typo(line.text))}
        </Text>
        <T v="body" color={C.stone} style={{ marginTop: 24 }}>
          {COPY.o2.caption}
        </T>
      </Animated.View>
      <Animated.View
        pointerEvents={ready ? 'auto' : 'none'}
        style={{ position: 'absolute', left: MARGIN, right: MARGIN, bottom: insets.bottom + 16, opacity: buttonIn }}>
        <Button title={COPY.o2.continue} onPress={() => navigation.navigate('Standard')} />
      </Animated.View>
    </View>
  );
}
