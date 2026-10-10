// The share card (UX_REDESIGN 6): a Story-size (9:16) card of the day in the user's
// colorway: UNSETLD, DAY 47, 3 / 3 TODAY, 47 DAY STREAK, 2,420 POINTS, NEVER SETTLE FOR LESS.
// Never proof photos. Nothing leaves the phone unless the user taps Share (iOS: the card is
// captured and handed to the share sheet, services/share). The browser preview can't capture
// a view or open a share sheet: it shows the card and asks for a screenshot, with no button.
// Opened from the perfect-day Done state, from Today on a perfect day, and from Progress.
import { useRef, useState, type Ref } from 'react';
import { View, type LayoutChangeEvent } from 'react-native';
import { activeDays } from '../../core/progress';
import { pointsEarned } from '../../core/rewards';
import type { Colorway } from '../../core/types';
import { SHARE } from '../../content/copy/share';
import type { RootProps } from '../../navigation/types';
import { light } from '../../services/haptics';
import { canShareCard, shareCard } from '../../services/share';
import { useStreak, useTodayMissions } from '../../state/missions';
import { useApp, useReaderColorway } from '../../state/store';
import { ColorwayBackground } from '../../ui/ColorwayBackground';
import { Button, NavRow, Screen } from '../../ui/kit';
import { T } from '../../ui/text';
import { color as C, font, radius } from '../../ui/tokens';

/** Story size: 9 wide, 16 tall. */
const RATIO = 9 / 16;
/** The card's edge on the ink page. */
const RING = 'rgba(237,233,227,0.14)';

export interface CardStats {
  /** Days with a proven mission (+1 while today has none yet), as Today's DAY N. */
  day: number;
  /** Proven / planned today. */
  done: number;
  all: number;
  streak: number;
  /** Points earned, all time (what's been spent on rewards still counts as earned). */
  points: number;
}

export function ShareScreen({ navigation }: RootProps<'Share'>) {
  const colorway = useReaderColorway();
  const day = useApp(s => s.currentDay);
  const record = useApp(s => s.record);
  const { plan, proven } = useTodayMissions(day);
  const streak = useStreak(day);
  const shownUp = activeDays(record);
  const stats: CardStats = {
    day: shownUp.size + (shownUp.has(day) ? 0 : 1),
    done: proven,
    all: plan?.missions.length ?? 0,
    streak: streak.current,
    points: pointsEarned(record),
  };

  const card = useRef<View>(null);
  const busy = useRef(false);
  const [failed, setFailed] = useState(false);
  // The space between the nav row and the footer; the card is the biggest 9:16 that fits in it.
  const [box, setBox] = useState<{ w: number; h: number } | null>(null);
  const onBox = (e: LayoutChangeEvent) => {
    const { width, height } = e.nativeEvent.layout;
    setBox(b => (b && b.w === width && b.h === height ? b : { w: width, h: height }));
  };
  const w = box ? Math.floor(Math.min(box.w, box.h * RATIO)) : 0;

  const share = async () => {
    if (busy.current) return;
    busy.current = true;
    light();
    setFailed(false);
    try {
      const r = await shareCard(card);
      if (r === 'failed') setFailed(true);
    } finally {
      busy.current = false;
    }
  };

  const footer = canShareCard ? (
    <>
      {failed ? (
        <T v="meta" color={C.stone} align="center" style={{ marginBottom: 12 }} accessibilityLiveRegion="polite">
          {SHARE.failed}
        </T>
      ) : null}
      <Button title={SHARE.share} onPress={() => void share()} accessibilityLabel={SHARE.share} />
    </>
  ) : (
    <T v="meta" color={C.muted} align="center" style={{ paddingVertical: 8 }}>
      {SHARE.screenshot}
    </T>
  );

  return (
    <Screen nav={<NavRow onClose={() => navigation.goBack()} />} scroll={false} contentStyle={{ paddingTop: 8 }} footer={footer}>
      <View onLayout={onBox} style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
        {w > 0 ? (
          // Rounded and ringed on screen (a black card on the ink page needs an edge); the captured view inside is the full rectangle.
          <View style={{ width: w, height: Math.round(w / RATIO), borderRadius: radius.card, overflow: 'hidden' }}>
            <ShareCard ref={card} colorway={colorway} stats={stats} width={w} />
            <View style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, borderRadius: radius.card, borderWidth: 1, borderColor: RING, pointerEvents: 'none' }} />
          </View>
        ) : null}
      </View>
    </Screen>
  );
}

/**
 * The card itself, laid out in units of its own width so the capture looks the same on
 * every phone: the wordmark, DAY N large in the serif, the day's numbers, the line.
 * A number that would be zero is left off (DAY N is never zero).
 */
export function ShareCard({ ref, colorway, stats, width }: { ref?: Ref<View>; colorway: Colorway; stats: CardStats; width: number }) {
  const u = width / 100;
  const ink = colorway.ink;
  const quiet = colorway.secondary;
  const kicker = (size: number) => ({ fontFamily: font.sansMedium, fontSize: size * u, lineHeight: size * u * 1.3, letterSpacing: size * u * 0.14 });
  const rows: { value: string; label: string }[] = [
    stats.done > 0 && stats.all > 0 ? { value: SHARE.today(stats.done, stats.all), label: SHARE.todayLabel } : null,
    stats.streak > 0 ? { value: SHARE.num(stats.streak), label: SHARE.streakLabel } : null,
    stats.points > 0 ? { value: SHARE.num(stats.points), label: SHARE.pointsLabel(stats.points) } : null,
  ].filter((r): r is { value: string; label: string } => r !== null);

  return (
    <View
      ref={ref}
      collapsable={false}
      accessible
      accessibilityRole="image"
      accessibilityLabel={SHARE.a11y.card(stats)}
      style={{ width, height: Math.round(width / RATIO), backgroundColor: colorway.bg, padding: 9 * u, justifyContent: 'space-between' }}>
      <ColorwayBackground colorway={colorway} />
      <T v="kicker" color={ink} maxFontSizeMultiplier={1} style={kicker(3.6)}>
        {SHARE.brand}
      </T>

      <View>
        <T v="title.xl" color={ink} maxFontSizeMultiplier={1} style={{ fontSize: 22 * u, lineHeight: 22 * u, letterSpacing: -0.3 * u, fontVariant: ['lining-nums'] }}>
          {SHARE.day(stats.day)}
        </T>
        <View style={{ marginTop: 9 * u, gap: 3.2 * u }}>
          {rows.map(r => (
            <View key={r.label} style={{ flexDirection: 'row', alignItems: 'baseline', gap: 3 * u }}>
              <T v="stat" color={ink} maxFontSizeMultiplier={1} style={{ fontSize: 11 * u, lineHeight: 12 * u, letterSpacing: -0.15 * u }}>
                {r.value}
              </T>
              <T v="kicker" color={quiet} maxFontSizeMultiplier={1} style={kicker(3.3)}>
                {r.label}
              </T>
            </View>
          ))}
        </View>
      </View>

      <T v="kicker" color={ink} maxFontSizeMultiplier={1} style={kicker(3.3)}>
        {SHARE.line}
      </T>
    </View>
  );
}
