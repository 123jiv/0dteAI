// The pieces of Today (docs/UX_REDESIGN.md §3, §4): the top row, streak and points, the next
// reward, the weekly focus card, the TODAY header, the mission cards, the active plan, the
// Plans row and the weekly review card. Colorway backgrounds: every surface and colour here
// comes from the colorway (surfacesFor), never the ink-page tokens.
import { Image } from 'expo-image';
import { useEffect, useLayoutEffect, useMemo, useState, type ReactNode } from 'react';
import { AccessibilityInfo, Animated, Platform, Pressable, View } from 'react-native';
import { clock as mmss, remainingSeconds, timerDone, type FocusTimer } from '../../core/timer';
import type { Colorway, Mission, MissionDone, ProofPhoto, ProofType, TrackId } from '../../core/types';
import { TRACK_BY_ID } from '../../content';
import { FOCUS } from '../../content/copy/focus';
import { HOME } from '../../content/copy/home';
import { proofImage } from '../../services/proof';
import { Card, Meter, ProofMeta } from '../../ui/blocks';
import { Icon } from '../../ui/icons';
import { clockTime } from '../../ui/ProofStamp';
import { T } from '../../ui/text';
import { color as C, ease, GAP, radius } from '../../ui/tokens';

/** Lets the Mission modal slide away before a completion plays on Today. */
export const ARRIVE_DELAY = 350;

/** The browser preview has no native animation driver; asking for it there only logs a warning. */
const NATIVE = Platform.OS !== 'web';

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

/** WCAG relative luminance of a #RRGGBB colour: 0 for black, 1 for white. */
function luminance(hex: string): number {
  const [r, g, b] = [1, 3, 5].map(i => {
    const c = parseInt(hex.slice(i, i + 2), 16) / 255;
    return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
  });
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

/**
 * A card's surface on a colorway (brief §2), translucent so the colorway shows through: bone on
 * dark colorways; on light ones ink, except where the background is mid-tone (Snow Wash,
 * Concrete) and an ink tint would take the secondary text under 4.5:1, so bone there too.
 * `quiet` is a proven card's, a step back.
 */
export function surfacesFor(colorway: Colorway): { card: string; pressed: string; quiet: string } {
  if (colorway.statusBar === 'light') return { card: 'rgba(237,233,227,0.07)', pressed: 'rgba(237,233,227,0.12)', quiet: 'rgba(237,233,227,0.035)' };
  if (luminance(colorway.bg) < 0.6) return { card: 'rgba(237,233,227,0.14)', pressed: 'rgba(237,233,227,0.22)', quiet: 'rgba(237,233,227,0.07)' };
  return { card: 'rgba(10,10,10,0.085)', pressed: 'rgba(10,10,10,0.14)', quiet: 'rgba(10,10,10,0.045)' };
}

/** UNSETLD on the left, DAY 12 on the right. */
export function TopRow({ colorway, days }: { colorway: Colorway; days: number }) {
  return (
    <View style={{ height: 44, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
      <T v="kicker" color={colorway.ink} accessibilityRole="header" style={{ letterSpacing: 3 }}>
        {HOME.brand}
      </T>
      <T v="mono" color={colorway.secondary} accessibilityLabel={HOME.a11yDay(days)}>
        {HOME.day(days)}
      </T>
    </View>
  );
}

/** A serif number with its unit after it on the same baseline: "12 day streak", "380 pts". */
function Figure({ value, unit, colorway, align = 'left' }: { value: string; unit: string; colorway: Colorway; align?: 'left' | 'right' }) {
  return (
    <View style={{ flexDirection: 'row', alignItems: 'baseline', justifyContent: align === 'right' ? 'flex-end' : 'flex-start', gap: 6 }}>
      <T v="stat" color={colorway.ink} style={TABULAR}>
        {value}
      </T>
      <T v="meta" color={colorway.secondary}>
        {unit}
      </T>
    </View>
  );
}

/**
 * Streak on the left, points on the right (opens Rewards). No zeros: with no streak the left
 * says what starts one, and with no points yet (Day 1) the right is empty.
 */
export function StatsRow({
  colorway,
  streak,
  points,
  firstDay,
  onPoints,
}: {
  colorway: Colorway;
  streak: number;
  points: number;
  /** Nothing proven on any day before today. */
  firstDay: boolean;
  onPoints: () => void;
}) {
  return (
    <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-end', gap: 16, minHeight: 36 }}>
      {streak > 0 ? (
        <View accessible accessibilityLabel={HOME.stats.a11yStreak(streak)}>
          <Figure value={String(streak)} unit={HOME.stats.streak} colorway={colorway} />
        </View>
      ) : (
        <T v="saved" color={colorway.ink} style={{ flexShrink: 1 }}>
          {firstDay ? HOME.stats.first : HOME.stats.restart}
        </T>
      )}
      {points > 0 ? (
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={HOME.stats.a11yPoints(points)}
          accessibilityHint={HOME.stats.a11yPointsHint}
          onPress={onPoints}
          hitSlop={8}
          style={({ pressed }) => ({ minHeight: 44, justifyContent: 'flex-end', opacity: pressed ? 0.6 : 1 })}>
          <Figure value={HOME.num(points)} unit={HOME.stats.points} colorway={colorway} align="right" />
        </Pressable>
      ) : null}
    </View>
  );
}

/** NEXT REWARD, a meter and "220 pts to 10% off" (or "10% off is ready"). Opens Rewards. */
export function NextReward({
  colorway,
  title,
  have,
  points,
  need,
  ready,
  first,
  onPress,
}: {
  colorway: Colorway;
  title: string;
  have: number;
  /** What the reward costs. */
  points: number;
  need: number;
  ready: boolean;
  /** Day 1: said as the first reward. */
  first: boolean;
  onPress: () => void;
}) {
  const line = ready ? HOME.reward.ready(title) : first ? HOME.reward.first(need, title) : HOME.reward.toGo(need, title);
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={ready ? HOME.reward.a11yReady(title) : HOME.reward.a11yToGo(need, title)}
      accessibilityHint={HOME.reward.a11yHint}
      onPress={onPress}
      style={({ pressed }) => ({ paddingVertical: 4, opacity: pressed ? 0.6 : 1 })}>
      <T v="kicker" color={colorway.secondary}>
        {HOME.reward.label}
      </T>
      <View style={{ marginTop: 12 }}>
        <Meter value={ready ? points : have} max={points} color={colorway.ink} track={colorway.rule} height={3} />
      </View>
      <T v="meta" color={ready ? colorway.ink : colorway.secondary} style={{ marginTop: 10 }}>
        {line}
      </T>
    </Pressable>
  );
}

/**
 * "What matters most this week?": once a week (Monday to Saturday), from the user's second active
 * day on, until they pick one or say "Not this week". The card opens WeeklyFocus; "Not this week" is its own
 * control over the card's bottom right (a sibling, so it isn't a button inside a button).
 */
export function FocusCard({ colorway, onOpen, onSkip }: { colorway: Colorway; onOpen: () => void; onSkip: () => void }) {
  const s = surfacesFor(colorway);
  return (
    <View>
      <Card surface={s.card} pressed={s.pressed} onPress={onOpen} accessibilityLabel={FOCUS.promptA11y} accessibilityHint={FOCUS.promptHint}>
        <T v="saved" color={colorway.ink}>
          {FOCUS.prompt}
        </T>
        <T v="meta" color={colorway.secondary} style={{ marginTop: 6 }}>
          {FOCUS.promptBody}
        </T>
        <View style={{ marginTop: 14, height: 20, flexDirection: 'row', alignItems: 'center', gap: 2 }}>
          <T v="meta" color={colorway.ink}>
            {FOCUS.promptGo}
          </T>
          <Icon name="chevron-right" size={16} color={colorway.ink} />
        </View>
      </Card>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={FOCUS.skipA11y}
        onPress={onSkip}
        style={({ pressed }) => ({
          position: 'absolute',
          right: 0,
          // Level with the card's last row: padding 18 + half its 20 = 28 from the bottom.
          bottom: 28 - 22,
          height: 44,
          paddingHorizontal: 18,
          justifyContent: 'center',
          opacity: pressed ? 0.5 : 1,
        })}>
        <T v="meta" color={colorway.secondary}>
          {FOCUS.skip}
        </T>
      </Pressable>
    </View>
  );
}

/**
 * TODAY and the count. Under it, this week's focus when one is set (opens WeeklyFocus), and on
 * a perfect day "Perfect day." with Share today.
 */
export function TodayHeader({
  colorway,
  done,
  all,
  ready,
  focus,
  onFocus,
  perfect,
  onShare,
}: {
  colorway: Colorway;
  done: number;
  all: number;
  ready: boolean;
  /** "Work on my business", or null. */
  focus: string | null;
  onFocus: () => void;
  perfect: boolean;
  onShare: () => void;
}) {
  return (
    <View>
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', minHeight: 20 }}>
        <T v="kicker" color={colorway.secondary} accessibilityRole="header">
          {HOME.today.label}
        </T>
        {ready && all > 0 ? (
          <T v="mono" color={perfect ? colorway.ink : colorway.secondary} accessibilityLabel={HOME.today.a11yCount(done, all)}>
            {HOME.today.count(done, all)}
          </T>
        ) : null}
      </View>
      {perfect ? (
        <View style={{ marginTop: 6, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 16 }}>
          <T v="saved" color={colorway.ink}>
            {HOME.today.perfect}
          </T>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={HOME.today.share}
            accessibilityHint={HOME.today.a11yShareHint}
            onPress={onShare}
            hitSlop={8}
            style={({ pressed }) => ({ minHeight: 44, flexDirection: 'row', alignItems: 'center', gap: 6, opacity: pressed ? 0.6 : 1 })}>
            <Icon name="share" size={16} color={colorway.ink} />
            <T v="meta" color={colorway.ink}>
              {HOME.today.share}
            </T>
          </Pressable>
        </View>
      ) : null}
      {focus ? (
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={FOCUS.current(focus)}
          accessibilityHint={FOCUS.currentHint}
          onPress={onFocus}
          hitSlop={{ top: 8, bottom: 8 }}
          style={({ pressed }) => ({ alignSelf: 'flex-start', marginTop: perfect ? 0 : 6, minHeight: 28, justifyContent: 'center', opacity: pressed ? 0.6 : 1 })}>
          <T v="meta" color={colorway.secondary} numberOfLines={1}>
            {FOCUS.current(focus)}
          </T>
        </Pressable>
      ) : null}
    </View>
  );
}

/**
 * What the button on an unproven card says: START, the focus timer counting
 * down (`live` while Today is in view and the app is open), TAKE PHOTO or MARK
 * DONE once it ends, or AFTER PHOTO.
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
  const photos = done.photos ?? [];
  return photos.find(p => p.kind === 'after') ?? photos[photos.length - 1];
}

/** A finished timer asks for the proof photo, or (timer-only missions) for a tap on Mark it done. */
function actionLabel(a: CardAction, remaining: number, type: ProofType): string {
  if (a.kind === 'after') return HOME.action.after;
  if (a.kind === 'timer') return remaining <= 0 ? (type === 'TIMER' ? HOME.action.markDone : HOME.action.timerDone) : HOME.action.timer(mmss(remaining));
  return HOME.action.start;
}

function actionSaid(a: CardAction, remaining: number, type: ProofType): string | null {
  if (a.kind === 'after') return HOME.a11y.afterWaiting;
  if (a.kind === 'timer') {
    if (remaining <= 0) return type === 'TIMER' ? HOME.a11y.timerDoneMark : HOME.a11y.timerDone;
    // Whole minutes, so VoiceOver isn't handed a label that changes every second.
    const minutes = Math.ceil(remaining / 60);
    return a.timer.pausedAt ? HOME.a11y.timerPaused(minutes) : HOME.a11y.timerRunning(minutes);
  }
  return null;
}

/** "30 min · [icons] Timer + photo · +15 pts". Wraps after a dot at large text sizes. */
function MetaRow({ mission, colorway }: { mission: Mission; colorway: Colorway }) {
  const dot = (
    <T v="meta" color={colorway.secondary} style={{ marginHorizontal: 6 }}>
      ·
    </T>
  );
  return (
    <View style={{ flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', rowGap: 4 }}>
      <T v="meta" color={colorway.secondary}>
        {HOME.card.minutes(mission.minutes)}
      </T>
      {dot}
      <ProofMeta type={mission.proofType} color={colorway.secondary} />
      {dot}
      <T v="meta" color={colorway.secondary}>
        {HOME.card.points(mission.points)}
      </T>
    </View>
  );
}

/**
 * The small filled button on a card. Drawn only: the whole card is the control. Ink on the
 * colorway; its label is the page colour on dark colorways and bone on light ones, where the
 * page colour (a mid grey on Concrete) would be muddy on ink.
 */
function CardButton({ label, colorway }: { label: string; colorway: Colorway }) {
  const text = colorway.statusBar === 'dark' ? C.bone : colorway.bg;
  return (
    <View
      style={{
        height: 32,
        minWidth: 76,
        paddingHorizontal: 14,
        borderRadius: radius.button,
        backgroundColor: colorway.ink,
        alignItems: 'center',
        justifyContent: 'center',
      }}>
      <T v="button" color={text} style={[{ fontSize: 11, lineHeight: 14, letterSpacing: 1.8 }, TABULAR]} numberOfLines={1}>
        {label}
      </T>
    </View>
  );
}

/** The swap control's spot: over the card's bottom left, level with the button. */
const SWAP_HEIGHT = 48;
/** Card padding (18) + half the button (16) = the button's centre from the card's bottom. */
const BUTTON_CENTRE = 18 + 16;

/**
 * One mission of today's plan (brief §4). Unproven: the area as a kicker, the serif title,
 * the meta row (time · proof · points) and the small button (START or the live state), with
 * a quiet Swap while swaps are left. Proven: the card steps back, "✓ Proven 9:47 AM · +15"
 * and the proof thumbnail. The whole card opens the mission.
 * `celebrate` changes when it was just proven: the surface brightens once and the thumbnail
 * fades in. `hold` keeps a just-proven card's thumbnail hidden until that plays. `arrive` is
 * set on a card that just came in from a swap: it fades up into place.
 */
export function MissionCard({
  mission,
  area: areaId,
  done,
  action,
  colorway,
  swap,
  onOpen,
  onSwap,
  celebrate = 0,
  hold = false,
  arrive = false,
}: {
  mission: Mission;
  /** The area it's in the day for (the plan's, state/missions plannedArea), not always its own. */
  area: TrackId;
  /** The accepted proof, or null while it's still to do. */
  done: MissionDone | null;
  action: CardAction;
  colorway: Colorway;
  /** The swap control on an unproven card while swaps are left; null hides it. `left` is said in its hint. */
  swap: { left: number } | null;
  onOpen: () => void;
  onSwap: () => void;
  celebrate?: number;
  hold?: boolean;
  arrive?: boolean;
}) {
  const area = TRACK_BY_ID[areaId]?.short ?? '';
  const s = surfacesFor(colorway);

  // A just-proven card: the surface brightens and fades back, the thumbnail fades in. Opacity
  // only, so it plays the same under Reduce Motion. Set before paint so nothing flashes.
  const [glow] = useState(() => new Animated.Value(0));
  const [settle] = useState(() => new Animated.Value(1));
  useLayoutEffect(() => {
    if (!celebrate) return;
    glow.setValue(0);
    settle.setValue(0);
    Animated.sequence([
      Animated.delay(ARRIVE_DELAY),
      Animated.parallel([
        Animated.sequence([
          Animated.timing(glow, { toValue: 1, duration: 220, easing: ease.out, useNativeDriver: false }),
          Animated.timing(glow, { toValue: 0, duration: 700, easing: ease.in, useNativeDriver: false }),
        ]),
        Animated.timing(settle, { toValue: 1, duration: 420, delay: 160, easing: ease.out, useNativeDriver: false }),
      ]),
    ]).start();
    return () => {
      glow.stopAnimation();
      settle.stopAnimation();
      glow.setValue(0);
      settle.setValue(1);
    };
  }, [celebrate, glow, settle]);

  // A card swapped in fades up into place (under Reduce Motion it only fades in).
  const [enter] = useState(() => new Animated.Value(arrive ? 0 : 1));
  const [lift] = useState(() => new Animated.Value(arrive ? 8 : 0));
  useEffect(() => {
    if (!arrive) return;
    return withMotion(reduce => {
      if (reduce) lift.setValue(0);
      Animated.parallel([
        Animated.timing(enter, { toValue: 1, duration: 360, easing: ease.out, useNativeDriver: NATIVE }),
        Animated.timing(lift, { toValue: 0, duration: 360, easing: ease.out, useNativeDriver: NATIVE }),
      ]).start();
    });
  }, [arrive, enter, lift]);

  const remaining = useRemaining(action.kind === 'timer' ? action.timer : null, action.kind === 'timer' && action.live);
  const photoUri = done ? cardPhoto(done)?.uri ?? '' : '';
  // Looked up once per photo, not on every render (it checks the file is still there).
  const thumb = useMemo(() => (photoUri ? proofImage(photoUri) : null), [photoUri]);
  const time = done ? clockTime(done.doneAt) : '';
  const said = done
    ? HOME.a11y.card(mission.title, HOME.a11y.proven(area, time, done.points))
    : HOME.a11y.card(
        mission.title,
        [HOME.a11y.cardMeta(area, mission.minutes, mission.points, mission.proofType), actionSaid(action, remaining, mission.proofType)]
          .filter(Boolean)
          .join('. '),
      );

  let body: ReactNode;
  if (done) {
    body = (
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 16 }}>
        <View style={{ flex: 1, minWidth: 0 }}>
          <T v="kicker" color={colorway.secondary}>
            {area}
          </T>
          <T v="list" color={colorway.secondary} style={{ marginTop: 6 }}>
            {mission.title}
          </T>
          <View style={{ marginTop: 8, flexDirection: 'row', alignItems: 'center', gap: 6 }}>
            <Icon name="check" size={15} color={colorway.ink} />
            <T v="meta" color={colorway.secondary} style={TABULAR}>
              {HOME.proven(time, done.points)}
            </T>
          </View>
        </View>
        {/* No box without a photo to put in it (a timer-only proof, or one cleared off the phone). */}
        {thumb ? (
          <Animated.View
            accessibilityElementsHidden
            importantForAccessibility="no-hide-descendants"
            style={{ width: 48, height: 60, borderRadius: 6, overflow: 'hidden', backgroundColor: colorway.rule, opacity: hold ? 0 : settle }}>
            <Image source={{ uri: thumb }} style={{ width: 48, height: 60 }} contentFit="cover" accessibilityLabel={HOME.a11y.provenThumb} />
          </Animated.View>
        ) : null}
      </View>
    );
  } else {
    body = (
      <>
        <T v="kicker" color={colorway.secondary}>
          {area}
        </T>
        <T v="list" color={colorway.ink} style={{ marginTop: 6 }}>
          {mission.title}
        </T>
        <View style={{ marginTop: 8 }}>
          <MetaRow mission={mission} colorway={colorway} />
        </View>
        <View style={{ marginTop: 16, flexDirection: 'row', justifyContent: 'flex-end' }}>
          <CardButton label={actionLabel(action, remaining, mission.proofType)} colorway={colorway} />
        </View>
      </>
    );
  }

  return (
    <Animated.View style={{ opacity: enter, transform: [{ translateY: lift }] }}>
      <Card
        surface={done ? s.quiet : s.card}
        pressed={s.pressed}
        onPress={onOpen}
        accessibilityLabel={said}
        accessibilityHint={HOME.a11y.hint}
        style={{ overflow: 'hidden' }}>
        <Animated.View
          style={{
            pointerEvents: 'none',
            position: 'absolute',
            left: 0,
            top: 0,
            right: 0,
            bottom: 0,
            backgroundColor: colorway.ink,
            opacity: glow.interpolate({ inputRange: [0, 1], outputRange: [0, 0.08] }),
          }}
        />
        {body}
      </Card>
      {swap && !done ? (
        // A sibling over the card's bottom left, level with the button, so it stays its own
        // control for touch and VoiceOver (not a button inside the card's button).
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={HOME.swap.a11y(mission.title)}
          accessibilityHint={HOME.swap.left(swap.left)}
          onPress={onSwap}
          style={({ pressed }) => ({
            position: 'absolute',
            left: 0,
            bottom: BUTTON_CENTRE - SWAP_HEIGHT / 2,
            height: SWAP_HEIGHT,
            paddingLeft: 18,
            paddingRight: 20,
            justifyContent: 'center',
            opacity: pressed ? 0.5 : 1,
          })}>
          <T v="meta" color={colorway.secondary} numberOfLines={1}>
            {HOME.swap.button}
          </T>
        </Pressable>
      ) : null}
    </Animated.View>
  );
}

/** ACTIVE PLAN: the plan's title, the day it's on and Continue. Opens Plans. */
export function ActivePlanCard({
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
  const s = surfacesFor(colorway);
  return (
    <Card surface={s.card} pressed={s.pressed} onPress={onPress} accessibilityLabel={HOME.plan.a11y(title, day, days)} accessibilityHint={HOME.plan.a11yHint}>
      <T v="kicker" color={colorway.secondary}>
        {HOME.plan.label}
      </T>
      <T v="list" color={colorway.ink} style={{ marginTop: 6 }}>
        {title}
      </T>
      <View style={{ marginTop: 8, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}>
        <T v="meta" color={colorway.secondary} style={TABULAR}>
          {HOME.plan.day(day, days)}
        </T>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 2 }}>
          <T v="meta" color={colorway.ink}>
            {HOME.plan.go}
          </T>
          <Icon name="chevron-right" size={16} color={colorway.ink} />
        </View>
      </View>
    </Card>
  );
}

/** No plan running: one quiet row to Plans, after the missions. No rule, no card. */
export function PlansRow({ colorway, onPress }: { colorway: Colorway; onPress: () => void }) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`${HOME.plan.link}. ${HOME.plan.linkDetail}`}
      onPress={onPress}
      style={({ pressed }) => ({ flexDirection: 'row', alignItems: 'center', paddingVertical: 14, gap: 12, opacity: pressed ? 0.6 : 1 })}>
      <View style={{ flex: 1, minWidth: 0 }}>
        <T v="row" color={colorway.ink}>
          {HOME.plan.link}
        </T>
        <T v="note" color={colorway.secondary} style={{ marginTop: 2 }}>
          {HOME.plan.linkDetail}
        </T>
      </View>
      <Icon name="chevron-right" size={18} color={colorway.secondary} />
    </Pressable>
  );
}

/**
 * YOUR WEEK: what the week added up to. Sunday to Tuesday, until it's closed; on Monday and
 * Tuesday (`last`) it's the week before, and says so.
 */
export function WeeklyCard({
  colorway,
  missions,
  focusMinutes,
  last,
  onPress,
}: {
  colorway: Colorway;
  missions: number;
  focusMinutes: number;
  last: boolean;
  onPress: () => void;
}) {
  const s = surfacesFor(colorway);
  const summary = HOME.week.summary(missions, focusMinutes);
  return (
    <Card surface={s.card} pressed={s.pressed} onPress={onPress} accessibilityLabel={HOME.week.a11y(summary, last)} accessibilityHint={HOME.week.a11yHint}>
      <T v="kicker" color={colorway.secondary}>
        {last ? HOME.week.lastLabel : HOME.week.label}
      </T>
      <T v="list" color={colorway.ink} style={{ marginTop: 6 }}>
        {summary}
      </T>
      <View style={{ marginTop: 8, flexDirection: 'row', alignItems: 'center', gap: 2 }}>
        <T v="meta" color={colorway.ink}>
          {HOME.week.link}
        </T>
        <Icon name="chevron-right" size={16} color={colorway.ink} />
      </View>
    </Card>
  );
}

/** No mission fits the day (every area ruled out by the answers): say so, and where to change it. */
export function NothingFits({ colorway, onPress }: { colorway: Colorway; onPress: () => void }) {
  const s = surfacesFor(colorway);
  return (
    <Card surface={s.card} pressed={s.pressed} onPress={onPress} accessibilityLabel={`${HOME.today.noneTitle} ${HOME.today.noneBody}`}>
      <T v="saved" color={colorway.ink}>
        {HOME.today.noneTitle}
      </T>
      <T v="meta" color={colorway.secondary} style={{ marginTop: 6 }}>
        {HOME.today.noneBody}
      </T>
      <View style={{ marginTop: GAP.card, flexDirection: 'row', alignItems: 'center', gap: 2 }}>
        <T v="meta" color={colorway.ink}>
          {HOME.today.noneAction}
        </T>
        <Icon name="chevron-right" size={16} color={colorway.ink} />
      </View>
    </Card>
  );
}
