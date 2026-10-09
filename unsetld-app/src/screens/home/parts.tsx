// The pieces of Home (spec section 5): the stats, today's header and bar, the
// mission cards, the weekly review card, the Day 3 Access note and the bottom bar.
import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import { useEffect, useMemo, useState, type ReactNode } from 'react';
import { AccessibilityInfo, Animated, Pressable, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { clock as mmss, remainingSeconds, timerDone, type FocusTimer } from '../../core/timer';
import type { Colorway, Mission, MissionDone, ProofPhoto } from '../../core/types';
import { TRACK_BY_ID } from '../../content';
import { HOME } from '../../content/copy/home';
import { soft } from '../../services/haptics';
import { proofImage } from '../../services/proof';
import { Icon } from '../../ui/icons';
import { InlineLink } from '../../ui/kit';
import { clockTime } from '../../ui/ProofStamp';
import { T, useSerifScale } from '../../ui/text';
import { ease, font, hairline, MARGIN, radius } from '../../ui/tokens';
import { Walker } from '../../ui/Walker';

/** Lets the Mission modal slide away before a completion plays on Home. */
export const ARRIVE_DELAY = 350;

const TABULAR = { fontVariant: ['lining-nums', 'tabular-nums'] as ('lining-nums' | 'tabular-nums')[] };

/** Runs `run` with the Reduce Motion setting, unless the caller has moved on. */
function withMotion(run: (reduce: boolean) => void): () => void {
  let live = true;
  AccessibilityInfo.isReduceMotionEnabled()
    .catch(() => false)
    .then(reduce => {
      if (live) run(reduce);
    });
  return () => {
    live = false;
  };
}

/** UNSETLD on the left, DAY 012 on the right. */
export function TopRow({ colorway, days }: { colorway: Colorway; days: number }) {
  return (
    <View style={{ height: 44, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
      <T v="label" color={colorway.secondary} accessibilityRole="header">
        {HOME.brand}
      </T>
      <T v="mono" color={colorway.secondary} accessibilityLabel={HOME.a11yDay(days)}>
        {HOME.day(days)}
      </T>
    </View>
  );
}

/** Streak (with Off Days banked) on the left, points on the right (opens Rewards). */
export function StatsHeader({
  colorway,
  streak,
  offDays,
  points,
  onPoints,
}: {
  colorway: Colorway;
  streak: number;
  offDays: number;
  points: number;
  onPoints: () => void;
}) {
  return (
    <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' }}>
      <View accessible accessibilityLabel={HOME.stats.a11yStreak(streak, offDays)} style={{ flexShrink: 1, paddingRight: 16 }}>
        <T v="title.xl" color={colorway.ink} style={TABULAR}>
          {String(streak)}
        </T>
        <T v="label" color={colorway.secondary} style={{ marginTop: 4 }}>
          {HOME.stats.streak}
        </T>
        {offDays > 0 ? (
          <T v="mono" color={colorway.secondary} style={{ marginTop: 8 }}>
            {HOME.stats.offDays(offDays)}
          </T>
        ) : null}
      </View>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={HOME.stats.a11yPoints(points)}
        accessibilityHint={HOME.stats.a11yPointsHint}
        onPress={onPoints}
        hitSlop={8}
        style={({ pressed }) => ({ alignItems: 'flex-end', minHeight: 44, opacity: pressed ? 0.6 : 1 })}>
        <T v="title.xl" color={colorway.ink} align="right" style={TABULAR}>
          {HOME.num(points)}
        </T>
        <T v="label" color={colorway.secondary} align="right" style={{ marginTop: 4 }}>
          {HOME.stats.points}
        </T>
      </Pressable>
    </View>
  );
}

/** "150 POINTS TO 10% OFF" or "10% OFF IS READY". A quiet line, never a popup. */
export function NextRewardLine({
  colorway,
  title,
  need,
  ready,
  onPress,
}: {
  colorway: Colorway;
  title: string;
  need: number;
  ready: boolean;
  onPress: () => void;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={ready ? HOME.reward.a11yReady(title) : HOME.reward.a11yToGo(need, title)}
      accessibilityHint={HOME.reward.a11yHint}
      onPress={onPress}
      hitSlop={{ top: 12, bottom: 12, left: 8, right: 8 }}
      style={({ pressed }) => ({ alignSelf: 'flex-start', minHeight: 20, justifyContent: 'center', opacity: pressed ? 0.6 : 1 })}>
      <T v="mono" color={colorway.secondary}>
        {ready ? HOME.reward.ready(title) : HOME.reward.toGo(need, title)}
      </T>
    </Pressable>
  );
}

/** The 2px bar under TODAY. It fills to its new value once Home is back in view. */
export function ProgressBar({ value, colorway, delay = 0 }: { value: number; colorway: Colorway; delay?: number }) {
  const v = Math.max(0, Math.min(1, value));
  const [a] = useState(() => new Animated.Value(v));
  useEffect(
    () =>
      withMotion(reduce => {
        if (reduce) a.setValue(v);
        else Animated.timing(a, { toValue: v, duration: 600, delay, easing: ease.out, useNativeDriver: false }).start();
      }),
    [a, v, delay],
  );
  return (
    <View style={{ height: 2, backgroundColor: colorway.rule, overflow: 'hidden' }} accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
      <Animated.View style={{ height: 2, backgroundColor: colorway.ink, width: a.interpolate({ inputRange: [0, 1], outputRange: ['0%', '100%'] }) }} />
    </View>
  );
}

/** TODAY, the count, the bar and the status line. */
export function TodayHeader({ colorway, done, all, ready }: { colorway: Colorway; done: number; all: number; ready: boolean }) {
  return (
    <View>
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', minHeight: 20 }}>
        <T v="label" color={colorway.secondary} accessibilityRole="header">
          {HOME.today.label}
        </T>
        {ready && all > 0 ? (
          <T v="mono" color={colorway.secondary} accessibilityLabel={HOME.today.a11yCount(done, all)}>
            {HOME.today.count(done, all)}
          </T>
        ) : null}
      </View>
      <View style={{ marginTop: 10 }}>
        <ProgressBar value={all ? done / all : 0} colorway={colorway} delay={ARRIVE_DELAY} />
      </View>
      {ready ? (
        <T v="body" color={colorway.secondary} style={{ marginTop: 14 }}>
          {HOME.status(done, all)}
        </T>
      ) : null}
    </View>
  );
}

/**
 * "7 DAY LOCK IN · DAY 3 OF 7", while a program runs. Opens Programs. It has a
 * rule above; the first mission card's rule closes it below.
 */
export function ProgramBanner({
  colorway,
  title,
  day,
  days,
  onPress,
}: {
  colorway: Colorway;
  title: string;
  day: number;
  days: number;
  onPress: () => void;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={HOME.programA11y(title, day, days)}
      accessibilityHint={HOME.programA11yHint}
      onPress={onPress}
      style={({ pressed }) => ({
        minHeight: 48,
        flexDirection: 'row',
        alignItems: 'center',
        borderTopWidth: hairline,
        borderColor: colorway.rule,
        opacity: pressed ? 0.6 : 1,
      })}>
      <T v="label" color={colorway.ink} style={{ flex: 1 }} numberOfLines={1}>
        {HOME.program(title.toUpperCase(), day, days)}
      </T>
      <View style={{ marginRight: -6 }}>
        <Icon name="chevron-right" size={20} color={colorway.secondary} />
      </View>
    </Pressable>
  );
}

/**
 * What the button on an unproven card says: START, the focus timer counting
 * down (`live` while Home is in view and the app is open), or AFTER PHOTO.
 */
export type CardAction = { kind: 'start' } | { kind: 'timer'; timer: FocusTimer; live: boolean } | { kind: 'after' };

/** Seconds left on a focus timer, ticking each second while it runs and `live`. */
function useRemaining(timer: FocusTimer | null, live: boolean): number {
  const [nowMs, setNowMs] = useState(() => Date.now());
  const running = Boolean(timer && !timer.pausedAt && live && !timerDone(timer, nowMs));
  useEffect(() => {
    if (!running) return;
    const tick = () => setNowMs(Date.now());
    const first = setTimeout(tick, 0);
    const every = setInterval(tick, 1000);
    return () => {
      clearTimeout(first);
      clearInterval(every);
    };
  }, [running]);
  return timer ? remainingSeconds(timer, timer.pausedAt ?? nowMs) : 0;
}

/** The photo a proven card shows: the after photo of a pair, else the last one. */
function cardPhoto(done: MissionDone): ProofPhoto | undefined {
  return done.photos.find(p => p.kind === 'after') ?? done.photos[done.photos.length - 1];
}

function actionLabel(a: CardAction, remaining: number): string {
  if (a.kind === 'after') return HOME.action.after;
  if (a.kind === 'timer') return remaining <= 0 ? HOME.action.timerDone : HOME.action.timer(mmss(remaining));
  return HOME.action.start;
}

function actionSaid(a: CardAction, remaining: number): string | null {
  if (a.kind === 'after') return HOME.a11y.afterWaiting;
  if (a.kind === 'timer') {
    if (remaining <= 0) return HOME.a11y.timerDone;
    return a.timer.pausedAt ? HOME.a11y.timerPaused(mmss(remaining)) : HOME.a11y.timerRunning(mmss(remaining));
  }
  return null;
}

function badgeOf(m: Mission): string | null {
  if (m.proofType === 'TIMER_AND_PHOTO') return HOME.badge.timer;
  if (m.proofType === 'BEFORE_AFTER') return HOME.badge.beforeAfter;
  return null;
}

/**
 * One mission of today's plan. Unproven: label, title, time and points, and a
 * small button (START, the running timer, AFTER PHOTO); a swap row under it.
 * Proven: the title steps back, the proof photo and PROVEN 9:47 AM · +15.
 * `celebrate` changes when it was just proven: a fill sweeps across and the
 * photo settles in (a plain crossfade under Reduce Motion). `arrive` is set on a
 * card that just came in from a swap: it fades in.
 */
export function MissionCard({
  mission,
  done,
  action,
  colorway,
  last,
  swap,
  onOpen,
  onSwap,
  celebrate = 0,
  arrive = false,
}: {
  mission: Mission;
  /** The accepted proof, or null while it's still to do. */
  done: MissionDone | null;
  action: CardAction;
  colorway: Colorway;
  last: boolean;
  /** The swap row under an unproven card; null hides it. `note` replaces the count right after a swap. */
  swap: { left: number; note: string | null } | null;
  onOpen: () => void;
  onSwap: () => void;
  celebrate?: number;
  arrive?: boolean;
}) {
  const scale = useSerifScale();
  const track = TRACK_BY_ID[mission.track]?.short ?? '';
  const label = HOME.cardLabel(HOME.slot[mission.slot], track.toUpperCase());
  const badge = badgeOf(mission);
  const proven = Boolean(done);

  // Celebration: sweep 0→1 is the fill's width, glow its strength, settle the photo coming in.
  const [sweep] = useState(() => new Animated.Value(0));
  const [glow] = useState(() => new Animated.Value(0));
  const [settle] = useState(() => new Animated.Value(1));
  useEffect(() => {
    if (!celebrate) return;
    let haptic: ReturnType<typeof setTimeout> | undefined;
    const stop = withMotion(reduce => {
      if (reduce) {
        sweep.setValue(1);
        glow.setValue(0);
        settle.setValue(1);
        Animated.sequence([
          Animated.delay(ARRIVE_DELAY),
          Animated.timing(glow, { toValue: 1, duration: 240, easing: ease.out, useNativeDriver: false }),
          Animated.timing(glow, { toValue: 0, duration: 600, easing: ease.in, useNativeDriver: false }),
        ]).start();
        return;
      }
      sweep.setValue(0);
      glow.setValue(1);
      settle.setValue(0);
      Animated.sequence([
        Animated.delay(ARRIVE_DELAY),
        Animated.parallel([
          Animated.timing(sweep, { toValue: 1, duration: 460, easing: ease.out, useNativeDriver: false }),
          Animated.sequence([
            Animated.delay(240),
            Animated.timing(settle, { toValue: 1, duration: 380, easing: ease.out, useNativeDriver: false }),
          ]),
        ]),
        Animated.timing(glow, { toValue: 0, duration: 620, easing: ease.in, useNativeDriver: false }),
      ]).start();
      haptic = setTimeout(soft, ARRIVE_DELAY + 460);
    });
    return () => {
      stop();
      if (haptic) clearTimeout(haptic);
      sweep.stopAnimation();
      glow.stopAnimation();
      settle.stopAnimation();
      glow.setValue(0);
      settle.setValue(1);
    };
  }, [celebrate, sweep, glow, settle]);

  // A card swapped in fades up into place.
  const [enter] = useState(() => new Animated.Value(arrive ? 0 : 1));
  useEffect(() => {
    if (!arrive) return;
    return withMotion(() => {
      Animated.timing(enter, { toValue: 1, duration: 360, easing: ease.out, useNativeDriver: true }).start();
    });
  }, [arrive, enter]);

  const remaining = useRemaining(action.kind === 'timer' ? action.timer : null, action.kind === 'timer' && action.live);
  const photoUri = done ? cardPhoto(done)?.uri ?? '' : '';
  // Looked up once per photo, not on every render (it checks the file is still there).
  const thumb = useMemo(() => (photoUri ? proofImage(photoUri) : null), [photoUri]);
  const time = done ? clockTime(done.doneAt) : '';
  const said = done
    ? HOME.a11y.card(label, mission.title, HOME.a11y.proven(time, done.points))
    : HOME.a11y.card(label, mission.title, [HOME.a11y.meta(mission.minutes, mission.points, badge), actionSaid(action, remaining)].filter(Boolean).join('. '));

  return (
    <Animated.View
      style={{
        opacity: enter,
        transform: [{ translateY: enter.interpolate({ inputRange: [0, 1], outputRange: [6, 0] }) }],
        borderTopWidth: hairline,
        borderBottomWidth: last ? hairline : 0,
        borderColor: colorway.rule,
        overflow: 'hidden',
      }}>
      <Animated.View
        pointerEvents="none"
        style={{
          position: 'absolute',
          left: 0,
          top: 0,
          bottom: 0,
          width: sweep.interpolate({ inputRange: [0, 1], outputRange: ['0%', '100%'] }),
          backgroundColor: colorway.ink,
          opacity: glow.interpolate({ inputRange: [0, 1], outputRange: [0, 0.1] }),
        }}
      />
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={said}
        accessibilityHint={HOME.a11y.hint}
        accessibilityState={{ checked: proven }}
        onPress={onOpen}
        style={({ pressed }) => ({
          paddingTop: 18,
          paddingBottom: swap ? 6 : 18,
          flexDirection: 'row',
          alignItems: 'center',
          opacity: pressed ? 0.6 : 1,
        })}>
        <View style={{ flex: 1, paddingRight: 16 }}>
          <T v="label" color={colorway.secondary} numberOfLines={1}>
            {label}
          </T>
          <T
            v="list"
            color={proven ? colorway.secondary : colorway.ink}
            style={{ marginTop: 6, fontSize: 26 * scale, lineHeight: 30 * scale }}>
            {mission.title}
          </T>
          {done ? (
            <T v="mono" color={colorway.secondary} style={{ marginTop: 8 }}>
              {HOME.proven(time, done.points)}
            </T>
          ) : (
            <View style={{ marginTop: 8, flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap', gap: 8 }}>
              <T v="mono" color={colorway.secondary}>
                {HOME.meta(mission.minutes, mission.points)}
              </T>
              {badge ? (
                <View style={{ borderWidth: hairline, borderColor: colorway.secondary, paddingHorizontal: 4, paddingVertical: 1 }}>
                  <T v="mono.s" color={colorway.secondary}>
                    {badge}
                  </T>
                </View>
              ) : null}
            </View>
          )}
        </View>
        {done ? (
          <Animated.View
            accessibilityElementsHidden
            importantForAccessibility="no-hide-descendants"
            style={{
              width: 28,
              height: 35,
              backgroundColor: colorway.rule,
              borderWidth: hairline,
              borderColor: colorway.rule,
              overflow: 'hidden',
              opacity: settle,
              transform: [{ scale: settle.interpolate({ inputRange: [0, 1], outputRange: [0.6, 1] }) }],
            }}>
            {thumb ? <Image source={{ uri: thumb }} style={{ width: 28, height: 35 }} contentFit="cover" accessibilityLabel={HOME.a11y.provenThumb} /> : null}
          </Animated.View>
        ) : (
          <View
            style={{
              height: 32,
              paddingHorizontal: 12,
              borderRadius: radius.button,
              backgroundColor: colorway.ink,
              alignItems: 'center',
              justifyContent: 'center',
            }}>
            <T v="button" color={colorway.bg} style={[{ fontSize: 11, lineHeight: 14, letterSpacing: 1.8 }, TABULAR]} numberOfLines={1}>
              {actionLabel(action, remaining)}
            </T>
          </View>
        )}
      </Pressable>
      {swap ? (
        <View style={{ flexDirection: 'row', alignItems: 'center', paddingBottom: 6 }}>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={HOME.swap.a11y(mission.title)}
            accessibilityHint={swap.note ?? HOME.swap.left(swap.left)}
            onPress={onSwap}
            style={({ pressed }) => ({ minHeight: 44, justifyContent: 'center', paddingRight: 12, opacity: pressed ? 0.6 : 1 })}>
            <T v="small" color={colorway.secondary} style={{ fontFamily: font.sansMedium }}>
              {HOME.swap.button}
            </T>
          </Pressable>
          <T
            v="note"
            color={swap.note ? colorway.ink : colorway.secondary}
            style={{ flex: 1, opacity: swap.note || swap.left > 0 ? 1 : 0.7 }}
            numberOfLines={2}
            accessibilityElementsHidden
            importantForAccessibility="no">
            {swap.note ?? HOME.swap.left(swap.left)}
          </T>
        </View>
      ) : null}
    </Animated.View>
  );
}

/** YOUR WEEK: what the week added up to. Sunday to Tuesday, until it's closed. */
export function WeeklyCard({
  colorway,
  missions,
  focusMinutes,
  onPress,
}: {
  colorway: Colorway;
  missions: number;
  focusMinutes: number;
  onPress: () => void;
}) {
  const summary = HOME.week.summary(missions, focusMinutes);
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={HOME.week.a11y(summary)}
      accessibilityHint={HOME.week.a11yHint}
      onPress={onPress}
      style={({ pressed }) => ({
        borderWidth: hairline,
        borderColor: colorway.rule,
        paddingHorizontal: 20,
        paddingVertical: 20,
        gap: 8,
        opacity: pressed ? 0.6 : 1,
      })}>
      <T v="label" color={colorway.secondary}>
        {HOME.week.label}
      </T>
      <T v="list" color={colorway.ink}>
        {summary}
      </T>
      <T v="body" color={colorway.secondary} style={{ marginTop: 4 }}>
        {HOME.week.link}
      </T>
    </Pressable>
  );
}

/** The once-only note on Day 3: what showing up opens. */
export function AccessNote({ colorway, onRewards }: { colorway: Colorway; onRewards: () => void }) {
  return (
    <View style={{ gap: 8 }}>
      <T v="label" color={colorway.secondary}>
        {HOME.access.label}
      </T>
      <T v="body" color={colorway.ink}>
        {HOME.access.body}
      </T>
      <InlineLink title={HOME.access.link} color={colorway.ink} onPress={onRewards} />
    </View>
  );
}

function BarItem({ label, onPress, colorway, children }: { label: string; onPress: () => void; colorway: Colorway; children?: ReactNode }) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      onPress={onPress}
      style={({ pressed }) => ({
        height: 44,
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 4,
        marginRight: 12,
        flexShrink: 1,
        opacity: pressed ? 0.6 : 1,
      })}>
      {children}
      <T v="small" color={colorway.secondary} numberOfLines={1}>
        {label}
      </T>
    </Pressable>
  );
}

/**
 * The fixed bar: Progress (with the walker), Programs, Rewards, and the
 * colorway icon. Solid colorway ground, with a fade above it. `nudge` changes
 * when a mission was just proven: the walker takes a step.
 */
export function BottomBar({
  colorway,
  nudge,
  onProgress,
  onPrograms,
  onRewards,
  onColorway,
}: {
  colorway: Colorway;
  nudge: number;
  onProgress: () => void;
  onPrograms: () => void;
  onRewards: () => void;
  onColorway: () => void;
}) {
  const insets = useSafeAreaInsets();
  // The bar sits over the list, so it needs a solid ground on every colorway (plates included).
  const barBg = colorway.bgEnd ?? colorway.bg;
  const [step] = useState(() => new Animated.Value(0));
  useEffect(() => {
    if (!nudge) return;
    return withMotion(reduce => {
      // Reduce Motion: no translate, so the walker stays put.
      if (reduce) return;
      Animated.sequence([
        Animated.delay(ARRIVE_DELAY + 300),
        Animated.timing(step, { toValue: 3, duration: 200, easing: ease.out, useNativeDriver: true }),
        Animated.timing(step, { toValue: 0, duration: 200, easing: ease.in, useNativeDriver: true }),
      ]).start();
    });
  }, [nudge, step]);
  return (
    <View pointerEvents="box-none" style={{ position: 'absolute', left: 0, right: 0, bottom: 0 }}>
      <LinearGradient pointerEvents="none" colors={[`${barBg}00`, barBg]} style={{ height: colorway.kind === 'plate' ? 48 : 32 }} />
      <View
        style={{
          backgroundColor: barBg,
          paddingLeft: MARGIN - 4,
          paddingRight: MARGIN - 12,
          paddingBottom: insets.bottom + 8,
          height: insets.bottom + 52,
          flexDirection: 'row',
          alignItems: 'center',
        }}>
        <BarItem label={HOME.bar.progress} onPress={onProgress} colorway={colorway}>
          <Animated.View style={{ marginRight: 8, transform: [{ translateX: step }] }}>
            <Walker height={22} color={colorway.ink} lapelColor={colorway.secondary} />
          </Animated.View>
        </BarItem>
        <BarItem label={HOME.bar.programs} onPress={onPrograms} colorway={colorway} />
        <BarItem label={HOME.bar.rewards} onPress={onRewards} colorway={colorway} />
        <View style={{ flex: 1 }} />
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={HOME.bar.colorway}
          onPress={onColorway}
          style={({ pressed }) => ({ width: 44, height: 44, alignItems: 'center', justifyContent: 'center', opacity: pressed ? 0.6 : 1 })}>
          <Icon name="colorway" size={18} color={colorway.secondary} />
        </Pressable>
      </View>
    </View>
  );
}
