import { useEffect, useState } from 'react';
import { AccessibilityInfo, Animated, Platform, Pressable, ScrollView, useWindowDimensions, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { planMomentKey } from '../../core/programs';
import { finishedPlans, milestones, type MilestoneKey } from '../../core/progress';
import type { DayKey } from '../../core/time';
import { PROGRAM_BY_ID } from '../../content';
import { PROGRAMS_COPY } from '../../content/copy/programs';
import { PROGRESS } from '../../content/copy/progress';
import type { RootParams, RootProps } from '../../navigation/types';
import { soft } from '../../services/haptics';
import { useApp } from '../../state/store';
import { Icon } from '../../ui/icons';
import { Button } from '../../ui/kit';
import { T } from '../../ui/text';
import { color as C, ease, MARGIN } from '../../ui/tokens';
import { Walker } from '../../ui/Walker';

const M = PROGRESS.moment;
const P = PROGRAMS_COPY.moment;

type Params = RootParams['Moment'];

/** Seen, once it's real: a milestone reached, or a Plan finish on record. */
function markSeen(p: Params) {
  const s = useApp.getState();
  if ('plan' in p) {
    if (finishedPlans(s.record).some(f => f.id === p.plan && f.finished === p.day)) s.markMomentShown(planMomentKey(p.plan, p.day));
  } else if (milestones(s.record, s.currentDay).some(m => m.key === p.key && m.reached)) s.markMomentShown(p.key);
}

/** What the page says: the kicker (null claims no date), the title, the line, and one label for both. */
interface Words {
  kicker: string | null;
  a11yKicker: string | null;
  title: string;
  line: string;
  a11y: string | null;
}

function wordsFor(p: Params, reachedOf: (key: MilestoneKey) => DayKey | null, today: DayKey): Words {
  if ('plan' in p) {
    // A Plan finished: its title in capitals, its days in words. No points.
    const program = PROGRAM_BY_ID[p.plan];
    if (!program) return { kicker: null, a11yKicker: null, title: '', line: '', a11y: null };
    const date = PROGRESS.date(p.day, today);
    return { kicker: P.finished(date), a11yKicker: P.finished(date), title: P.title(program.title), line: P.line(program.days), a11y: P.a11y(program.title, program.days) };
  }
  // Null when it isn't reached (a stale link): then no date is claimed.
  const reached = reachedOf(p.key);
  const words = M.byKey[p.key] ?? { title: '', line: '' };
  return { kicker: reached ? M.reached(reached, today) : null, a11yKicker: reached ? M.a11yDate(reached, today) : null, ...words, a11y: null };
}

/** A progress milestone reached, or a Plan finished: shown once, letter-style, on opaque ink. */
export function MomentScreen({ navigation, route }: RootProps<'Moment'>) {
  const params = route.params;
  const { revisit } = params;
  const id = 'plan' in params ? planMomentKey(params.plan, params.day) : params.key;
  const { height } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const today = useApp(s => s.currentDay);
  const record = useApp(s => s.record);
  const words = wordsFor(params, key => milestones(record, today).find(m => m.key === key)?.reached ?? null, today);
  const [rise] = useState(() => new Animated.Value(0));
  const [still, setStill] = useState(false);

  // The page settles in (Reduce Motion: a fade, no movement), with a soft tap the first time it
  // shows, not when it's opened again from Achievements.
  useEffect(() => {
    let live = true;
    if (!revisit) soft();
    AccessibilityInfo.isReduceMotionEnabled()
      .catch(() => false)
      .then(reduce => {
        if (!live) return;
        setStill(reduce);
        Animated.timing(rise, { toValue: 1, duration: reduce ? 300 : 600, easing: ease.out, useNativeDriver: Platform.OS !== 'web' }).start();
      });
    return () => {
      live = false;
    };
  }, [id, rise, revisit]);

  // However the page is left (Close, the X, a swipe), the moment has been seen. Only once it's
  // reached, though: a moment opened early must still show when the milestone comes.
  useEffect(() => navigation.addListener('beforeRemove', () => markSeen(params)), [navigation, params]);

  const close = () => {
    markSeen(params);
    if (navigation.canGoBack()) navigation.goBack();
    else navigation.popTo('Main', { screen: 'Today' });
  };

  return (
    <View style={{ flex: 1, backgroundColor: C.ink }}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ flexGrow: 1, paddingHorizontal: MARGIN, paddingTop: Math.max(insets.top + 72, Math.round(height * 0.24)), paddingBottom: insets.bottom + 40 }}>
        <Animated.View
          style={{
            opacity: rise,
            transform: [{ translateY: still ? 0 : rise.interpolate({ inputRange: [0, 1], outputRange: [12, 0] }) }],
          }}>
          {words.kicker ? (
            <T v="kicker" color={C.stone} accessibilityLabel={words.a11yKicker ?? undefined} style={{ marginBottom: 14 }}>
              {words.kicker}
            </T>
          ) : null}
          {/* A Plan's moment reads as one sentence ("7 Day Lock In, finished. Seven days. Each one proven."), not in capitals. */}
          <View accessible={Boolean(words.a11y)} accessibilityRole={words.a11y ? 'header' : undefined} accessibilityLabel={words.a11y ?? undefined}>
            {/* A Plan's name can be long ("BUILD SOMETHING."): two lines at most, never broken mid-word. */}
            <T
              v="letter.day"
              style={{ fontVariant: ['lining-nums'] }}
              accessibilityRole={words.a11y ? undefined : 'header'}
              {...('plan' in params ? { numberOfLines: 2, adjustsFontSizeToFit: true, minimumFontScale: 0.6 } : {})}>
              {words.title}
            </T>
            <T v="body" color={C.muted} style={{ marginTop: 20 }}>
              {words.line}
            </T>
          </View>
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
