import { useEffect } from 'react';
import { Pressable, View } from 'react-native';
import { TRACK_IDS } from '../../core/progress';
import { reviewWeekFor, weeklyReview, weekStart } from '../../core/review';
import { addDays, diffDays } from '../../core/time';
import type { TrackId } from '../../core/types';
import { TRACK_BY_ID } from '../../content';
import { PROGRESS } from '../../content/copy/progress';
import type { RootProps } from '../../navigation/types';
import { selection } from '../../services/haptics';
import { useApp } from '../../state/store';
import { Button, NavRow, Rule, Screen, Square } from '../../ui/kit';
import { T } from '../../ui/text';
import { color as C, font, hairline } from '../../ui/tokens';

const R = PROGRESS.review;

/** One of the four big numbers: the number in serif, its label under it. */
function Big({ value, label, divider }: { value: string; label: string; divider?: boolean }) {
  return (
    <View style={{ flex: 1 }}>
      <View style={{ flex: 1, paddingVertical: 18, paddingLeft: divider ? 16 : 0, paddingRight: 8, borderLeftWidth: divider ? hairline : 0, borderLeftColor: C.rule }}>
        <T v="title.xl" numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.6} style={{ fontFamily: font.serifRegular, fontVariant: ['lining-nums'] }}>
          {value}
        </T>
        <T v="label" style={{ marginTop: 6 }}>
          {label}
        </T>
      </View>
    </View>
  );
}

/** A track to lean on next week: square, short name. */
function Chip({ id, on, onPress }: { id: TrackId; on: boolean; onPress: () => void }) {
  const short = TRACK_BY_ID[id]?.short ?? id;
  return (
    <Pressable
      accessibilityRole="radio"
      // aria-checked rather than accessibilityState: react-native-web only reads the former.
      aria-checked={on}
      accessibilityLabel={R.a11yChip(short)}
      onPress={onPress}
      style={({ pressed }) => ({
        minHeight: 44,
        paddingHorizontal: 14,
        flexDirection: 'row',
        alignItems: 'center',
        gap: 10,
        borderWidth: 1,
        borderColor: on ? C.bone : C.ruleStrong,
        opacity: pressed ? 0.7 : 1,
      })}>
      <Square on={on} size={10} />
      <T v="label" color={on ? C.bone : C.stone}>
        {short}
      </T>
    </Pressable>
  );
}

/** The weekly review: what the week added up to, where it went, and one area to lean on next. */
export function WeeklyReviewScreen({ navigation, route }: RootProps<'WeeklyReview'>) {
  const today = useApp(s => s.currentDay);
  const from = route.params?.weekStart ?? weekStart(today);
  const record = useApp(s => s.record);
  const plans = useApp(s => s.plans);
  const profile = useApp(s => s.profile);
  const review = weeklyReview(record, plans, profile, from);

  // Closing the review Home is offering counts as seeing it, however the page is left.
  // Reading this week early from Progress doesn't: Sunday's review still shows.
  useEffect(
    () =>
      navigation.addListener('beforeRemove', () => {
        const s = useApp.getState();
        if (reviewWeekFor(s.currentDay) === from) s.markReviewSeen(from);
      }),
    [navigation, from],
  );

  const close = () => (navigation.canGoBack() ? navigation.goBack() : navigation.navigate('Today'));

  const thisWeek = weekStart(today);
  const label = from === thisWeek ? R.thisWeek : from === addDays(thisWeek, -7) ? R.lastWeek : R.week;
  const left = today >= review.from && today < review.to ? diffDays(today, review.to) : 0;
  // Only tracks the app still knows; everything when none were chosen.
  const chosen = profile.tracks.filter(id => TRACK_BY_ID[id]);
  const tracks = chosen.length ? chosen : TRACK_IDS;
  const over = today > review.to;
  const strongest = review.strongest ? TRACK_BY_ID[review.strongest] : null;
  const ignored = review.ignored ? TRACK_BY_ID[review.ignored] : null;
  const priority = profile.priority;

  const lean = (id: TrackId) => {
    selection();
    useApp.getState().setProfile({ priority: priority === id ? null : id });
  };

  return (
    <Screen nav={<NavRow onClose={close} />} footer={<Button title={R.done} onPress={close} />}>
      <View style={{ marginTop: 24 }} accessible accessibilityRole="header" accessibilityLabel={PROGRESS.said(label, R.dates(PROGRESS.weekRange(review.from, review.to), left))}>
        <T v="label">{label}</T>
        <T v="mono" style={{ marginTop: 8 }}>
          {R.dates(PROGRESS.weekRange(review.from, review.to), left)}
        </T>
      </View>

      <View
        style={{ marginTop: 28 }}
        accessible
        accessibilityLabel={PROGRESS.week.a11y(review.missions, review.focusMinutes, review.points, review.perfectDays)}>
        <View style={{ flexDirection: 'row', borderTopWidth: hairline, borderColor: C.rule }}>
          <Big value={String(review.missions)} label={PROGRESS.week.missions} />
          <Big value={PROGRESS.focused(review.focusMinutes)} label={PROGRESS.week.focused} divider />
        </View>
        <View style={{ flexDirection: 'row', borderTopWidth: hairline, borderBottomWidth: hairline, borderColor: C.rule }}>
          <Big value={PROGRESS.number(review.points)} label={PROGRESS.week.points} />
          <Big value={String(review.perfectDays)} label={PROGRESS.week.perfect} divider />
        </View>
      </View>

      <View style={{ marginTop: 32, gap: 10 }}>
        {strongest ? <T v="list">{R.strongest(PROGRESS.areaName(strongest))}</T> : null}
        {ignored ? (
          <T v="body" color={C.stone}>
            {R.didntGetTo(ignored.short)}
          </T>
        ) : null}
        {review.missions === 0 ? (
          <T v="body" color={C.stone}>
            {over ? R.emptyPast : R.empty}
          </T>
        ) : null}
      </View>

      <Rule style={{ marginTop: 40 }} />
      <T v="label" accessibilityRole="header" style={{ marginTop: 24 }}>
        {R.nextLabel}
      </T>
      <T v="body" color={C.stone} style={{ marginTop: 8 }}>
        {R.nextBody}
      </T>
      <View accessibilityRole="radiogroup" style={{ marginTop: 16, flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
        {tracks.map(id => (
          <Chip key={id} id={id} on={priority === id} onPress={() => lean(id)} />
        ))}
      </View>
      {priority && TRACK_BY_ID[priority] ? (
        <T v="note" color={C.stone} style={{ marginTop: 12 }}>
          {R.leaning(TRACK_BY_ID[priority].short)}
        </T>
      ) : null}

      <T v="letter.sub" style={{ marginTop: 56 }}>
        {R.footer}
      </T>
    </Screen>
  );
}
