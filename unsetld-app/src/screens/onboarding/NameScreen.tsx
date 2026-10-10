import { useEffect, useState } from 'react';
import { AccessibilityInfo, Animated, Text, useWindowDimensions, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { MISSIONS } from '../../content';
import { COPY } from '../../content/copy';
import type { RootProps } from '../../navigation/types';
import { useApp } from '../../state/store';
import { Button } from '../../ui/kit';
import { T, useSerifScale } from '../../ui/text';
import { color as C, ease, font, hairline, MARGIN } from '../../ui/tokens';
import { Walker } from '../../ui/Walker';

// u n s e t [t] l [e] d — the bracketed letters are the two the brand drops.
const GLYPHS: { ch: string; dropped?: boolean }[] = [
  { ch: 'u' },
  { ch: 'n' },
  { ch: 's' },
  { ch: 'e' },
  { ch: 't' },
  { ch: 't', dropped: true },
  { ch: 'l' },
  { ch: 'e', dropped: true },
  { ch: 'd' },
];

/** O1: the name. "unsettled", then the two letters fall out and it closes up to "unsetld". */
export function NameScreen({ navigation }: RootProps<'Name'>) {
  const { height } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const scale = useSerifScale();
  const groundY = Math.round(height * 0.47);
  const figH = Math.min(240, height * 0.28);

  const [fig] = useState(() => new Animated.Value(0));
  const [rows] = useState(() => [0, 1, 2].map(() => new Animated.Value(0)));
  const [drop] = useState(() => new Animated.Value(0));
  const [close] = useState(() => new Animated.Value(1));
  const [page] = useState(() => new Animated.Value(1));
  // Natural widths of the two dropped letters, so they can close up to zero.
  const [widths, setWidths] = useState<[number, number]>([0, 0]);
  const measured = widths[0] > 0 && widths[1] > 0;
  const [busy, setBusy] = useState(false);
  // Reduce Motion: no translate, crossfades only.
  const [reduce, setReduce] = useState(false);

  useEffect(() => {
    let reduced = false;
    AccessibilityInfo.isReduceMotionEnabled()
      .then(on => {
        reduced = on;
        setReduce(on);
      })
      .catch(() => {})
      .finally(() => {
        Animated.sequence([
          Animated.timing(fig, { toValue: 1, duration: reduced ? 300 : 600, easing: ease.out, useNativeDriver: true }),
          Animated.stagger(
            80,
            rows.map(r => Animated.timing(r, { toValue: 1, duration: 300, easing: ease.out, useNativeDriver: true })),
          ),
        ]).start();
      });
  }, [fig, rows]);

  const begin = () => {
    if (busy) return;
    setBusy(true);
    Animated.sequence([
      Animated.timing(drop, { toValue: 1, duration: 300, easing: ease.in, useNativeDriver: false }),
      Animated.timing(close, { toValue: 0, duration: reduce ? 0 : 200, easing: ease.out, useNativeDriver: false }),
      Animated.delay(250),
      Animated.timing(page, { toValue: 0, duration: 250, easing: ease.in, useNativeDriver: false }),
    ]).start(() => {
      // Tracks starts at 0 OF 4: the pick is theirs, not the defaults.
      useApp.getState().setProfile({ tracks: [], priority: null });
      navigation.replace('Tracks');
    });
  };

  let droppedIndex = -1;
  const headSize = 64 * scale;

  return (
    <Animated.View style={{ flex: 1, backgroundColor: C.ink, opacity: page }}>
      <View
        style={{
          position: 'absolute',
          top: insets.top + 12,
          left: MARGIN,
          right: MARGIN,
          flexDirection: 'row',
          justifyContent: 'space-between',
          alignItems: 'center',
        }}>
        <Text maxFontSizeMultiplier={1.3} style={{ fontFamily: font.serif, fontSize: 22, color: C.bone }} accessibilityRole="header">
          {COPY.wordmark}
        </Text>
        <T v="mono">{COPY.libraryLabel(MISSIONS.length)}</T>
      </View>

      <Animated.View
        style={{
          position: 'absolute',
          top: groundY - figH,
          left: 0,
          right: 0,
          alignItems: 'center',
          opacity: fig,
          transform: reduce ? [] : [{ translateY: fig.interpolate({ inputRange: [0, 1], outputRange: [6, 0] }) }],
        }}>
        <Walker height={figH} />
      </Animated.View>
      <View style={{ position: 'absolute', top: groundY, left: MARGIN, right: MARGIN, height: hairline, backgroundColor: C.ruleStrong }} />
      <Animated.View style={{ position: 'absolute', top: groundY + 8, left: MARGIN, opacity: fig }}>
        <T v="mono.s">{COPY.o1.figure}</T>
      </Animated.View>

      <View style={{ position: 'absolute', top: groundY + 44 * scale, left: MARGIN, right: MARGIN }}>
        <Animated.View
          accessible
          accessibilityRole="header"
          accessibilityLabel="unsettled, adjective. 1, Not finished. 2, Not willing to settle for less."
          style={{ flexDirection: 'row', alignItems: 'baseline', opacity: rows[0] }}>
          {GLYPHS.map((g, i) => {
            const glyph = (
              <Text
                key={i}
                allowFontScaling={false}
                style={{
                  fontFamily: font.serif,
                  fontSize: headSize,
                  lineHeight: 66 * scale,
                  color: g.dropped ? C.greyLetter : C.bone,
                  marginRight: -1 * scale,
                }}>
                {g.ch}
              </Text>
            );
            if (!g.dropped) return glyph;
            droppedIndex++;
            const di = droppedIndex;
            return (
              <Animated.View
                key={i}
                onLayout={e => {
                  const w = e.nativeEvent.layout.width;
                  if (!measured && w > 0) setWidths(prev => (di === 0 ? [w, prev[1]] : [prev[0], w]));
                }}
                style={{
                  overflow: 'visible',
                  width: measured ? close.interpolate({ inputRange: [0, 1], outputRange: [0, widths[di]] }) : undefined,
                  opacity: drop.interpolate({ inputRange: [0, 1], outputRange: [1, 0] }),
                  transform: reduce ? [] : [{ translateY: drop.interpolate({ inputRange: [0, 1], outputRange: [0, 12] }) }],
                }}>
                {glyph}
              </Animated.View>
            );
          })}
          <Text allowFontScaling={false} style={{ fontFamily: font.serifItalic, fontSize: 22, color: C.stone, marginLeft: 10 }}>
            adj.
          </Text>
        </Animated.View>

        <View style={{ marginTop: 16 }}>
          {COPY.o1.defs.map((d, i) => (
            <Animated.View
              key={d}
              style={{
                minHeight: 44,
                paddingVertical: 6,
                flexDirection: 'row',
                alignItems: 'baseline',
                opacity: rows[i + 1],
              }}>
              <T v="mono" style={{ width: 32 }}>
                {String(i + 1)}
              </T>
              {/* Wraps at larger text sizes instead of running past the margin. */}
              <T v="list" style={{ flex: 1 }}>
                {d}
              </T>
            </Animated.View>
          ))}
        </View>
      </View>

      <View style={{ position: 'absolute', left: 0, right: 0, bottom: 0, paddingHorizontal: MARGIN, paddingBottom: insets.bottom + 16 }}>
        <Button title={COPY.o1.begin} onPress={begin} />
      </View>
    </Animated.View>
  );
}
