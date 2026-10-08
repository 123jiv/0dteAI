import { useEffect, useRef, useState } from 'react';
import { AccessibilityInfo, Animated, Pressable, Text, useWindowDimensions, View } from 'react-native';
import { breakBeats, lineSize, typo } from '../../core/typography';
import type { Colorway, Line } from '../../core/types';
import { COPY } from '../../content/copy';
import { light, medium } from '../../services/haptics';
import { Icon } from '../../ui/icons';
import { Button, InlineLink } from '../../ui/kit';
import { T, useSerifScale } from '../../ui/text';
import { ease, font, hairline, MARGIN } from '../../ui/tokens';
import { Walker } from '../../ui/Walker';

let reduceMotion = false;
AccessibilityInfo.isReduceMotionEnabled()
  .then(r => {
    reduceMotion = r;
  })
  .catch(() => {});
AccessibilityInfo.addEventListener?.('reduceMotionChanged', r => {
  reduceMotion = r;
});

/** Line block entrance: opacity 0→1 and translateY 8→0 over 280 ms when the page settles. */
function useSettle(active: boolean) {
  const [a] = useState(() => new Animated.Value(active ? 1 : 0));
  const first = useRef(true);
  useEffect(() => {
    if (first.current && active) {
      first.current = false;
      return;
    }
    first.current = false;
    if (active) Animated.timing(a, { toValue: 1, duration: 280, easing: ease.out, useNativeDriver: true }).start();
    else a.setValue(0);
  }, [active, a]);
  return {
    opacity: a,
    transform: reduceMotion ? [] : [{ translateY: a.interpolate({ inputRange: [0, 1], outputRange: [8, 0] }) }],
  };
}

export interface LineLike {
  text: string;
  attribution?: Line['attribution'];
}

/** One line, set like a page in a book. Double-tap saves, long-press opens the menu. */
export function LinePage({
  line,
  height,
  colorway,
  active,
  saved,
  canSave = true,
  onToggleSave,
  onShare,
  onLongPress,
}: {
  line: LineLike;
  height: number;
  colorway: Colorway;
  active: boolean;
  saved: boolean;
  canSave?: boolean;
  onToggleSave: () => void;
  onShare: () => void;
  onLongPress: () => void;
}) {
  const scale = useSerifScale();
  const settle = useSettle(active);
  const lastTap = useRef(0);
  const size = lineSize(line.text, scale);
  const text = breakBeats(typo(line.text));
  const attribution = line.attribution
    ? `${line.attribution.author} · ${line.attribution.source}`.toUpperCase()
    : null;

  const onPress = () => {
    const t = Date.now();
    if (t - lastTap.current < 300 && canSave) {
      lastTap.current = 0;
      light();
      onToggleSave();
    } else lastTap.current = t;
  };

  return (
    <View style={{ height }}>
      <Animated.View style={[{ position: 'absolute', top: Math.round(height * 0.32), left: MARGIN, right: MARGIN }, settle]}>
        <Pressable
          onPress={onPress}
          onLongPress={onLongPress}
          delayLongPress={450}
          accessibilityRole="text"
          accessibilityLabel={`${line.text}${line.attribution ? `. ${line.attribution.author}` : ''}`}
          accessibilityHint={canSave ? (saved ? 'Double tap twice to remove from saved' : 'Double tap twice to save') : undefined}>
          <Text
            allowFontScaling={false}
            lineBreakStrategyIOS="push-out"
            style={{ fontFamily: font.serif, color: colorway.ink, ...size }}>
            {text}
          </Text>
          {attribution ? (
            <T v="label" color={colorway.secondary} style={{ marginTop: 16 }}>
              {attribution}
            </T>
          ) : null}
        </Pressable>
        <View style={{ flexDirection: 'row', marginTop: 24 - 11, marginLeft: -11, gap: 20 }}>
          {canSave ? (
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={saved ? COPY.reader.a11y.unsave : COPY.reader.a11y.save}
              accessibilityState={{ selected: saved }}
              onPress={() => {
                light();
                onToggleSave();
              }}
              style={({ pressed }) => ({ width: 44, height: 44, alignItems: 'center', justifyContent: 'center', opacity: pressed ? 0.6 : 1 })}>
              <Icon name={saved ? 'bookmark-filled' : 'bookmark'} size={22} color={saved ? colorway.ink : colorway.secondary} />
            </Pressable>
          ) : null}
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={COPY.reader.a11y.share}
            onPress={onShare}
            style={({ pressed }) => ({ width: 44, height: 44, alignItems: 'center', justifyContent: 'center', opacity: pressed ? 0.6 : 1 })}>
            <Icon name="share" size={22} color={colorway.secondary} />
          </Pressable>
        </View>
      </Animated.View>
    </View>
  );
}

/** The night check: did you hold your standard today? */
export function NightPage({
  height,
  colorway,
  active,
  rules,
  answer,
  day,
  onAnswer,
}: {
  height: number;
  colorway: Colorway;
  active: boolean;
  rules: string[];
  answer: boolean | undefined;
  day: number;
  onAnswer: (held: boolean) => void;
}) {
  const settle = useSettle(active);
  const [fade] = useState(() => new Animated.Value(answer === undefined ? 1 : 0));
  const [shown, setShown] = useState<boolean | undefined>(answer);
  useEffect(() => {
    if (answer === undefined || shown !== undefined) return;
    Animated.timing(fade, { toValue: 0, duration: 200, easing: ease.in, useNativeDriver: true }).start(() => {
      setShown(answer);
      Animated.timing(fade, { toValue: 1, duration: 280, easing: ease.out, useNativeDriver: true }).start();
    });
  }, [answer, shown, fade]);

  return (
    <View style={{ height }}>
      <Animated.View style={[{ position: 'absolute', top: Math.round(height * 0.32), left: MARGIN, right: MARGIN }, settle]}>
        <Animated.View style={{ opacity: fade }}>
          {shown === undefined ? (
            <>
              <T v="title.l" color={colorway.ink} accessibilityRole="header">
                {COPY.night.question}
              </T>
              <View style={{ marginTop: 24 }}>
                {rules.map((r, i) => (
                  <View
                    key={i}
                    style={{
                      height: 40,
                      flexDirection: 'row',
                      alignItems: 'center',
                      borderTopWidth: hairline,
                      borderBottomWidth: i === rules.length - 1 ? hairline : 0,
                      borderColor: colorway.rule,
                    }}>
                    <T v="mono" color={colorway.secondary} style={{ width: 40 }}>
                      {String(i + 1).padStart(2, '0')}
                    </T>
                    <T v="list" color={colorway.ink} numberOfLines={1} style={{ flex: 1 }}>
                      {r}
                    </T>
                  </View>
                ))}
              </View>
              <Button
                title={COPY.night.held}
                ink={colorway.ink}
                ground={colorway.bg}
                style={{ marginTop: 32 }}
                onPress={() => {
                  medium();
                  onAnswer(true);
                }}
              />
              <Button title={COPY.night.notToday} kind="outline" ink={colorway.ink} style={{ marginTop: 12 }} onPress={() => onAnswer(false)} />
            </>
          ) : (
            <View accessibilityLiveRegion="polite">
              <T v="title.l" color={colorway.ink}>
                {shown ? COPY.night.heldTitle : COPY.night.notedTitle}
              </T>
              <T v="body" color={colorway.secondary} style={{ marginTop: 12 }}>
                {shown ? COPY.night.heldBody(day) : COPY.night.notedBody(day)}
              </T>
            </View>
          )}
        </Animated.View>
      </Animated.View>
    </View>
  );
}

/** Free tier, after the 10th line: a ritual, not a counter. */
export function EndCard({ height, colorway, active, onFull }: { height: number; colorway: Colorway; active: boolean; onFull: () => void }) {
  const settle = useSettle(active);
  const { width } = useWindowDimensions();
  return (
    <View style={{ height }}>
      <Animated.View style={[{ position: 'absolute', top: Math.round(height * 0.22), left: MARGIN, width: width - MARGIN * 2, alignItems: 'center' }, settle]}>
        <Walker height={142} color={colorway.ink} lapelColor={colorway.secondary} />
        <T v="title.l" color={colorway.ink} align="center" style={{ marginTop: 32 }}>
          {COPY.end.title.join('\n')}
        </T>
        <T v="body" color={colorway.secondary} align="center" style={{ marginTop: 12 }}>
          {COPY.end.sub}
        </T>
        <View style={{ marginTop: 24 }}>
          <InlineLink title={COPY.end.link} color={colorway.ink} onPress={onFull} />
        </View>
      </Animated.View>
    </View>
  );
}

/** Day 3 access intro, new volume, or library exhausted. */
export function NotePage({
  height,
  colorway,
  active,
  label,
  title,
  body,
  links,
}: {
  height: number;
  colorway: Colorway;
  active: boolean;
  label?: string;
  title: string;
  body: string;
  links: { title: string; onPress: () => void }[];
}) {
  const settle = useSettle(active);
  return (
    <View style={{ height }}>
      <Animated.View style={[{ position: 'absolute', top: Math.round(height * 0.32), left: MARGIN, right: MARGIN }, settle]}>
        {label ? (
          <T v="label" color={colorway.secondary} style={{ marginBottom: 16 }}>
            {label}
          </T>
        ) : null}
        <T v="title.l" color={colorway.ink}>
          {title}
        </T>
        <T v="body" color={colorway.secondary} style={{ marginTop: 12 }}>
          {body}
        </T>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, marginTop: 24 }}>
          {links.map((l, i) => (
            <View key={l.title} style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
              {i > 0 ? (
                <T v="body" color={colorway.secondary}>
                  ·
                </T>
              ) : null}
              <InlineLink title={l.title} color={colorway.ink} onPress={l.onPress} />
            </View>
          ))}
        </View>
      </Animated.View>
    </View>
  );
}
