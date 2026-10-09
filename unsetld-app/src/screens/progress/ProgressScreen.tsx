import type { ReactNode } from 'react';
import { Pressable, useWindowDimensions, View } from 'react-native';
import Svg, { Rect } from 'react-native-svg';
import { activeDays, completion, milestones, totals, trackProgress, TRACK_IDS, type MilestoneState, type TrackProgress } from '../../core/progress';
import { weeklyReview, weekStart } from '../../core/review';
import { computeStreak } from '../../core/streak';
import { addDays, diffDays, shortDate, type DayKey } from '../../core/time';
import { RULES, TRACK_BY_ID } from '../../content';
import { PROGRESS } from '../../content/copy/progress';
import type { RootProps } from '../../navigation/types';
import { useApp } from '../../state/store';
import { Icon } from '../../ui/icons';
import { NavRow, Screen, Square, TextButton } from '../../ui/kit';
import { T } from '../../ui/text';
import { color as C, font, hairline, MARGIN } from '../../ui/tokens';

const P = PROGRESS.screen;

type BarKind = 'on' | 'missed' | 'covered' | 'today' | 'pending';

interface Bar {
  day: DayKey;
  kind: BarKind;
}

/** The most recent days for the barcode, oldest first, ending today. Starts at the first active day. */
function activeBars(active: ReadonlySet<DayKey>, covered: readonly DayKey[], today: DayKey, max = 120): Bar[] {
  const days = [...active].filter(d => d <= today).sort();
  if (!days.length) return [];
  const span = Math.min(diffDays(days[0], today) + 1, max);
  const off = new Set(covered);
  return Array.from({ length: span }, (_, i) => {
    const day = addDays(today, i - span + 1);
    const kind: BarKind = day === today ? (active.has(day) ? 'today' : 'pending') : active.has(day) ? 'on' : off.has(day) ? 'covered' : 'missed';
    return { day, kind };
  });
}

/**
 * Active days as a barcode: a full bar for a day with a proven mission, a short tick for a
 * missed one, a half bar for a day an Off Day covered. Today is red: a full bar once a
 * mission is proven, a tick until then.
 */
function Barcode({ width, bars }: { width: number; bars: Bar[] }) {
  const pitch = Math.min(8, width / Math.max(1, bars.length));
  const bar = pitch >= 4 ? 2 : 1;
  const total = bars.length * pitch;
  return (
    <View>
      <Svg width={width} height={60} accessibilityElementsHidden importantForAccessibility="no">
        {bars.map((b, i) => {
          const x = width - total + i * pitch + (pitch - bar) / 2;
          switch (b.kind) {
            case 'missed':
              return <Rect key={b.day} x={x} y={54} width={bar} height={6} fill={C.ash} />;
            case 'pending':
              return <Rect key={b.day} x={x} y={54} width={bar} height={6} fill={C.signal} />;
            case 'covered':
              return <Rect key={b.day} x={x} y={30} width={bar} height={30} fill={C.stone} />;
            default:
              return <Rect key={b.day} x={x} y={0} width={bar} height={60} fill={b.kind === 'today' ? C.signal : C.bone} />;
          }
        })}
      </Svg>
      {/* The first date sits under the first bar, moving left only as far as it must to clear TODAY. */}
      <View style={{ marginTop: 8, flexDirection: 'row' }}>
        <View style={{ width: width - total + (pitch - bar) / 2, flexShrink: 1 }} />
        <T v="mono">{bars.length ? shortDate(bars[0].day) : ''}</T>
        <View style={{ flexGrow: 1, minWidth: 12 }} />
        <T v="mono">{P.today}</T>
      </View>
    </View>
  );
}

/** One cell of a stats grid: label, a number in mono and a unit. */
function Stat({ label, value, unit, said, divider }: { label: string; value: string; unit?: string; said?: string; divider?: boolean }) {
  // Padding and borders count toward a flex basis, so they sit on an inner view: the columns stay equal.
  return (
    <View style={{ flex: 1 }} accessible={Boolean(said)} accessibilityLabel={said}>
      <View
        style={{
          flex: 1,
          minHeight: 76,
          paddingVertical: 14,
          justifyContent: 'center',
          paddingLeft: divider ? 14 : 0,
          paddingRight: 8,
          borderLeftWidth: divider ? hairline : 0,
          borderLeftColor: C.rule,
        }}>
        <T v="label">{label}</T>
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', alignItems: 'baseline', marginTop: 6, columnGap: 6 }}>
          <T v="mono.l" color={C.bone}>
            {value}
          </T>
          {unit ? (
            <T v="mono" style={{ fontSize: 13 }}>
              {unit}
            </T>
          ) : null}
        </View>
      </View>
    </View>
  );
}

function StatRow({ children, last }: { children: ReactNode; last?: boolean }) {
  return <View style={{ flexDirection: 'row', borderTopWidth: hairline, borderBottomWidth: last ? hairline : 0, borderColor: C.rule }}>{children}</View>;
}

/** A section label with something small on the right. */
function Head({ label, right, said }: { label: string; right?: ReactNode; said?: string }) {
  return (
    <View
      style={{ marginTop: 48, marginBottom: 12, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}
      accessible
      accessibilityRole="header"
      accessibilityLabel={said ?? label}>
      <T v="label">{label}</T>
      {right}
    </View>
  );
}

/** A thin bar, bone on rule. */
function Meter({ value }: { value: number }) {
  const pct = Math.max(0, Math.min(1, value)) * 100;
  return (
    <View style={{ height: 2, backgroundColor: C.rule }}>
      <View style={{ width: `${pct}%`, height: 2, backgroundColor: C.bone }} />
    </View>
  );
}

function LevelRow({ p, chosen }: { p: TrackProgress; chosen: boolean }) {
  const short = TRACK_BY_ID[p.track]?.short ?? p.track;
  const lit = chosen || p.xp > 0;
  return (
    <View
      accessible
      accessibilityLabel={P.a11yLevel(short, p.level, p.into, p.span)}
      style={{ paddingVertical: 14, borderTopWidth: hairline, borderTopColor: C.rule }}>
      <View style={{ flexDirection: 'row', alignItems: 'baseline', justifyContent: 'space-between', gap: 12 }}>
        <T v="label" color={lit ? C.bone : C.stone}>
          {short}
        </T>
        <T v="mono" color={lit ? C.bone : C.stone}>
          {P.level(p.level)}
        </T>
      </View>
      <View style={{ marginTop: 10 }}>
        <Meter value={p.span ? p.into / p.span : 0} />
      </View>
      <T v="mono.s" align="right" style={{ marginTop: 6 }}>
        {P.xp(p.into, p.span)}
      </T>
    </View>
  );
}

function MilestoneRow({ m, last, onOpen }: { m: MilestoneState; last: boolean; onOpen: () => void }) {
  const reached = Boolean(m.reached);
  const date = m.reached ? shortDate(m.reached) : '';
  return (
    <Pressable
      accessibilityRole={reached ? 'button' : undefined}
      accessibilityLabel={reached ? P.a11yReached(m.title, date) : P.a11yOpen(m.title, m.progress, m.target)}
      accessibilityHint={reached ? P.a11yReachedHint : undefined}
      disabled={!reached}
      onPress={onOpen}
      style={({ pressed }) => ({
        minHeight: 52,
        paddingVertical: 12,
        flexDirection: 'row',
        alignItems: 'center',
        gap: 14,
        borderTopWidth: hairline,
        borderBottomWidth: last ? hairline : 0,
        borderColor: C.rule,
        opacity: pressed ? 0.6 : 1,
      })}>
      <Square on={reached} />
      <T v="row" color={reached ? C.bone : C.muted} style={{ flex: 1 }}>
        {m.title}
      </T>
      <T v="mono" color={reached ? C.bone : C.stone}>
        {reached ? date : P.milestoneProgress(m.progress, m.target)}
      </T>
    </Pressable>
  );
}

/** Progress: the numbers, the active days, Off Days, a level per track, milestones and the week. */
export function ProgressScreen({ navigation }: RootProps<'Progress'>) {
  const { width } = useWindowDimensions();
  const w = width - MARGIN * 2;
  const today = useApp(s => s.currentDay);
  const record = useApp(s => s.record);
  const plans = useApp(s => s.plans);
  const profile = useApp(s => s.profile);

  const active = activeDays(record);
  const streak = computeStreak(active, today);
  const t = totals(record);
  const ws = weekStart(today);
  const week = weeklyReview(record, plans, profile, ws);
  const weekDone = completion(record, plans, ws, today);
  const levels = trackProgress(record);
  const chosen = profile.tracks.filter(id => TRACK_IDS.includes(id));
  const order = [...chosen, ...TRACK_IDS.filter(id => !chosen.includes(id))];
  const marks = milestones(record, today);
  const bars = activeBars(active, streak.covered, today);
  const firstActive = [...active].sort()[0];
  const lastCovered = streak.covered[streak.covered.length - 1];
  // Named by weekday only while that is unambiguous: within the last six days.
  const showCovered = streak.current > 0 && lastCovered !== undefined && diffDays(lastCovered, today) <= 6;
  const proofs = Object.values(record.missions ?? {}).reduce(
    (n, byId) => n + Object.values(byId).filter(m => m.verification.status === 'accepted' && m.photos.length > 0).length,
    0,
  );

  return (
    <Screen nav={<NavRow onBack={() => navigation.goBack()} right={<TextButton title={PROGRESS.settings} onPress={() => navigation.navigate('Settings')} />} />}>
      <T v="title.xl" accessibilityRole="header" style={{ marginTop: 24 }}>
        {P.title}
      </T>

      {/* Stats: two columns, so the spaced labels never break on a narrow phone. */}
      <View style={{ marginTop: 32 }}>
        <StatRow>
          <Stat label={P.stats.streak} value={String(streak.current)} unit={PROGRESS.days(streak.current)} said={PROGRESS.said(P.stats.streak, `${streak.current} ${PROGRESS.days(streak.current)}`)} />
          <Stat
            label={P.stats.longest}
            value={String(streak.longest)}
            unit={PROGRESS.days(streak.longest)}
            said={PROGRESS.said(P.stats.longest, `${streak.longest} ${PROGRESS.days(streak.longest)}`)}
            divider
          />
        </StatRow>
        <StatRow>
          <Stat label={P.stats.missions} value={PROGRESS.number(t.missions)} said={PROGRESS.said(P.stats.missions, String(t.missions))} />
          <Stat label={P.stats.points} value={PROGRESS.number(t.points)} unit={P.stats.earned} said={PROGRESS.said(P.stats.points, `${t.points} ${P.stats.earned}`)} divider />
        </StatRow>
        <StatRow last>
          <Stat label={P.stats.focused} value={PROGRESS.focused(t.focusMinutes)} said={PROGRESS.said(P.stats.focused, PROGRESS.focusedSaid(t.focusMinutes))} />
          <Stat
            label={P.stats.week}
            value={P.stats.percent(weekDone.done, weekDone.planned)}
            said={P.stats.a11yWeek(weekDone.done, weekDone.planned)}
            divider
          />
        </StatRow>
      </View>

      {/* Active days */}
      <Head label={P.activeLabel} right={<T v="mono">{P.activeCount(active.size)}</T>} said={PROGRESS.said(P.activeLabel, P.activeCount(active.size).toLowerCase())} />
      {bars.length ? (
        <View accessible accessibilityRole="image" accessibilityLabel={P.a11yBarcode(active.size, firstActive ? shortDate(firstActive) : '')}>
          <Barcode width={w} bars={bars} />
        </View>
      ) : (
        <T v="note" color={C.stone}>
          {P.activeNote}
        </T>
      )}

      {/* Off Days */}
      <Head
        label={P.offLabel}
        said={P.a11yOff(streak.offDays, RULES.offDayMax)}
        right={
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
            {Array.from({ length: RULES.offDayMax }, (_, i) => (
              <Square key={i} on={i < streak.offDays} size={10} />
            ))}
            <T v="mono" style={{ marginLeft: 6 }}>
              {P.offBanked(streak.offDays, RULES.offDayMax)}
            </T>
          </View>
        }
      />
      {showCovered ? (
        <T v="body" style={{ marginBottom: 8 }}>
          {P.offCovered(PROGRESS.weekday(lastCovered))}
        </T>
      ) : null}
      <T v="note" color={C.stone}>
        {P.offExplain}
      </T>

      {/* Levels */}
      <Head label={P.levelsLabel} />
      <T v="note" color={C.stone} style={{ marginBottom: 12 }}>
        {P.levelsNote}
      </T>
      <View style={{ borderBottomWidth: hairline, borderBottomColor: C.rule }}>
        {order.map(id => (
          <LevelRow key={id} p={levels[id]} chosen={chosen.includes(id)} />
        ))}
      </View>

      {/* Milestones */}
      <Head label={P.milestonesLabel} />
      <View>
        {marks.map((m, i) => (
          <MilestoneRow key={m.key} m={m} last={i === marks.length - 1} onOpen={() => navigation.navigate('Moment', { key: m.key })} />
        ))}
      </View>

      {/* This week */}
      <Head label={P.weekLabel} right={<T v="mono">{PROGRESS.weekRange(week.from, week.to)}</T>} said={PROGRESS.said(P.weekLabel, PROGRESS.weekRange(week.from, week.to))} />
      <View accessible accessibilityLabel={PROGRESS.week.a11y(week.missions, week.focusMinutes, week.points, week.perfectDays)}>
        <StatRow>
          <Stat label={PROGRESS.week.missions} value={String(week.missions)} />
          <Stat label={PROGRESS.week.focused} value={PROGRESS.focused(week.focusMinutes)} divider />
        </StatRow>
        <StatRow last>
          <Stat label={PROGRESS.week.points} value={PROGRESS.number(week.points)} />
          <Stat label={PROGRESS.week.perfect} value={String(week.perfectDays)} divider />
        </StatRow>
      </View>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={P.a11ySeeWeek}
        onPress={() => navigation.navigate('WeeklyReview', { weekStart: ws })}
        hitSlop={6}
        style={({ pressed }) => ({ marginTop: 8, minHeight: 44, justifyContent: 'center', alignSelf: 'flex-start', opacity: pressed ? 0.6 : 1 })}>
        <T v="body">{P.seeWeek}</T>
      </Pressable>

      {/* Proof */}
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={P.a11yProofRow(proofs)}
        onPress={() => navigation.navigate('ProofGallery')}
        style={({ pressed }) => ({
          marginTop: 40,
          minHeight: 52,
          flexDirection: 'row',
          alignItems: 'center',
          gap: 12,
          borderTopWidth: hairline,
          borderBottomWidth: hairline,
          borderColor: C.rule,
          opacity: pressed ? 0.6 : 1,
        })}>
        <T v="row" style={{ flex: 1, fontFamily: font.sans }}>
          {P.proofRow}
        </T>
        <T v="mono">{P.proofCount(proofs)}</T>
        <View style={{ marginRight: -8 }}>
          <Icon name="chevron-right" size={24} color={C.stone} />
        </View>
      </Pressable>
      <View style={{ height: 48 }} />
    </Screen>
  );
}
