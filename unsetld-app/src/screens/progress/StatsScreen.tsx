import { useWindowDimensions, View } from 'react-native';
import Svg, { Rect } from 'react-native-svg';
import { activeDays, areaProgress, completion, totals, TRACK_IDS } from '../../core/progress';
import { weekStart } from '../../core/review';
import { computeStreak } from '../../core/streak';
import { addDays, diffDays, type DayKey } from '../../core/time';
import { MISSION_BY_ID, RULES, TRACK_BY_ID } from '../../content';
import { PROGRESS } from '../../content/copy/progress';
import type { RootProps } from '../../navigation/types';
import { useApp } from '../../state/store';
import { Card, EmptyState, Meter, SectionLabel } from '../../ui/blocks';
import { SVG_HIDDEN } from '../../ui/icons';
import { NavRow, PageTitle, Screen, Square } from '../../ui/kit';
import { T } from '../../ui/text';
import { color as C, GAP, MARGIN } from '../../ui/tokens';

const S = PROGRESS.stats;
const minutesOf = (id: string) => MISSION_BY_ID[id]?.minutes;

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
 * The last day an Off Day covered, when it still belongs to the streak running now and
 * happened within the last six days (so naming its weekday is unambiguous). Null otherwise:
 * a covered day before a break says nothing about the streak that's going now.
 */
function coveredInRun(active: ReadonlySet<DayKey>, covered: readonly DayKey[], today: DayKey): DayKey | null {
  const last = covered[covered.length - 1];
  if (last === undefined || diffDays(last, today) > 6) return null;
  const off = new Set(covered);
  for (let d = addDays(last, 1); d < today; d = addDays(d, 1)) if (!active.has(d) && !off.has(d)) return null;
  return last;
}

/**
 * Active days as a barcode: a full bar for a day with a proven mission, a short tick for a
 * missed one, a half bar for a day an Off Day covered. Today is red (the one place the signal
 * colour appears): a full bar once a mission is proven, a tick until then.
 */
function Barcode({ width, bars }: { width: number; bars: Bar[] }) {
  const pitch = Math.min(8, width / Math.max(1, bars.length));
  const bar = pitch >= 4 ? 2 : 1;
  const total = bars.length * pitch;
  return (
    <View>
      <Svg width={width} height={56} {...SVG_HIDDEN}>
        {bars.map((b, i) => {
          const x = width - total + i * pitch + (pitch - bar) / 2;
          switch (b.kind) {
            case 'missed':
              return <Rect key={b.day} x={x} y={50} width={bar} height={6} fill={C.ash} />;
            case 'pending':
              return <Rect key={b.day} x={x} y={50} width={bar} height={6} fill={C.signal} />;
            case 'covered':
              return <Rect key={b.day} x={x} y={28} width={bar} height={28} fill={C.stone} />;
            default:
              return <Rect key={b.day} x={x} y={0} width={bar} height={56} fill={b.kind === 'today' ? C.signal : C.bone} />;
          }
        })}
      </Svg>
      {/* The first date sits under the first bar, moving left only as far as it must to clear TODAY. */}
      <View style={{ marginTop: 8, flexDirection: 'row' }}>
        <View style={{ width: width - total + (pitch - bar) / 2, flexShrink: 1 }} />
        {/* Only today on record: TODAY says it all. */}
        <T v="mono" numberOfLines={1} style={{ flexShrink: 0 }}>
          {bars.length > 1 ? PROGRESS.date(bars[0].day).toUpperCase() : ''}
        </T>
        <View style={{ flexGrow: 1, minWidth: 12 }} />
        <T v="mono">{S.today}</T>
      </View>
    </View>
  );
}

/** One number in the All time grid: serif value, meta label, read as one. */
function Figure({ value, label }: { value: string; label: string }) {
  return (
    <View style={{ width: '50%', paddingVertical: 10, paddingRight: 8 }} accessible accessibilityLabel={`${label}, ${value}`}>
      <T v="stat" numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.7}>
        {value}
      </T>
      <T v="meta" color={C.stone} style={{ marginTop: 4 }}>
        {label}
      </T>
    </View>
  );
}

/**
 * Progress › Stats: the detailed numbers the Progress tab leaves out. Longest streak, missions,
 * points earned and focused time; this week's completion; active days; Off Days with how they
 * work; and every area's totals.
 */
export function StatsScreen({ navigation }: RootProps<'Stats'>) {
  const { width } = useWindowDimensions();
  const w = width - MARGIN * 2;
  const today = useApp(s => s.currentDay);
  const record = useApp(s => s.record);
  const plans = useApp(s => s.plans);
  const active = activeDays(record);
  const streak = computeStreak(active, today);
  const t = totals(record);
  const week = completion(record, plans, weekStart(today), today);
  const areas = areaProgress(record, minutesOf);
  const byArea = TRACK_IDS.filter(id => areas[id].missions > 0).sort((a, b) => areas[b].xp - areas[a].xp);
  const bars = activeBars(active, streak.covered, today);
  const firstActive = [...active].sort()[0];
  const lastCovered = streak.current > 0 ? coveredInRun(active, streak.covered, today) : null;
  const back = () => (navigation.canGoBack() ? navigation.goBack() : navigation.navigate('Main', { screen: 'Progress' }));

  if (!active.size) {
    return (
      <Screen nav={<NavRow onBack={back} />}>
        <PageTitle title={S.title} />
        <View style={{ marginTop: GAP.block }}>
          <EmptyState title={S.empty.title} body={S.empty.body} />
        </View>
      </Screen>
    );
  }

  return (
    <Screen nav={<NavRow onBack={back} />}>
      <PageTitle title={S.title} />

      <View style={{ marginTop: GAP.block }}>
        <SectionLabel>{S.allTime}</SectionLabel>
        <Card style={{ paddingVertical: 8 }}>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap' }}>
            <Figure value={S.streakDays(streak.longest)} label={S.longest} />
            <Figure value={PROGRESS.number(t.missions)} label={S.missions} />
            <Figure value={PROGRESS.number(t.points)} label={S.points} />
            {t.focusMinutes > 0 ? <Figure value={PROGRESS.focused(t.focusMinutes)} label={S.focused} /> : null}
          </View>
        </Card>
      </View>

      {week.planned > 0 ? (
        <View style={{ marginTop: GAP.section }}>
          <SectionLabel>{S.week}</SectionLabel>
          <Card>
            <View accessible accessibilityLabel={S.a11yWeek(week.done, week.planned)}>
              <View style={{ flexDirection: 'row', alignItems: 'baseline', justifyContent: 'space-between', gap: 12 }}>
                <T v="stat">{S.weekPercent(week.done, week.planned)}</T>
                <T v="meta" color={C.muted}>
                  {S.weekLine(week.done, week.planned)}
                </T>
              </View>
              <View style={{ marginTop: 14 }}>
                <Meter value={week.done} max={week.planned} />
              </View>
            </View>
          </Card>
        </View>
      ) : null}

      <View style={{ marginTop: GAP.section }}>
        <SectionLabel
          right={
            <T v="meta" color={C.stone}>
              {/* "1 day since 14 Oct" reads oddly when 14 Oct is today: just the count then. */}
              {firstActive ? (firstActive === today ? S.streakDays(active.size) : S.activeSince(active.size, firstActive)) : ''}
            </T>
          }>
          {S.active}
        </SectionLabel>
        <View accessible accessibilityRole="image" accessibilityLabel={firstActive ? S.a11yBarcode(active.size, firstActive) : undefined} style={{ marginTop: 4 }}>
          <Barcode width={w} bars={bars} />
        </View>
      </View>

      <View style={{ marginTop: GAP.section }}>
        <SectionLabel
          right={
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }} accessible accessibilityLabel={S.a11yOff(streak.offDays, RULES.offDayMax)}>
              {Array.from({ length: RULES.offDayMax }, (_, i) => (
                <Square key={i} on={i < streak.offDays} size={10} />
              ))}
              <T v="meta" color={C.stone} style={{ marginLeft: 4 }}>
                {S.offBanked(streak.offDays, RULES.offDayMax)}
              </T>
            </View>
          }>
          {S.off}
        </SectionLabel>
        <Card>
          {lastCovered ? (
            <T v="small" style={{ marginBottom: 8 }}>
              {S.offCovered(PROGRESS.weekday(lastCovered))}
            </T>
          ) : null}
          <T v="small" color={C.stone}>
            {S.offExplain}
          </T>
        </Card>
      </View>

      {byArea.length ? (
        <View style={{ marginTop: GAP.section }}>
          <SectionLabel>{S.byArea}</SectionLabel>
          <Card>
            <View style={{ gap: 18 }}>
              {byArea.map(id => {
                const a = areas[id];
                const name = TRACK_BY_ID[id]?.short ?? id;
                return (
                  <View key={id} accessible accessibilityLabel={S.a11yArea(name, a.level, a.missions, a.xp, a.seconds)}>
                    <View style={{ flexDirection: 'row', alignItems: 'baseline', justifyContent: 'space-between', gap: 12 }}>
                      <T v="row">{name}</T>
                      <T v="meta" color={C.muted}>
                        {S.level(a.level)}
                      </T>
                    </View>
                    <T v="meta" color={C.stone} style={{ marginTop: 2 }}>
                      {S.areaLine(a.missions, a.xp, a.seconds)}
                    </T>
                  </View>
                );
              })}
            </View>
          </Card>
        </View>
      ) : null}
    </Screen>
  );
}
