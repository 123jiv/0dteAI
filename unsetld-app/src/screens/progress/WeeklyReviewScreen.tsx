import { useEffect } from 'react';
import { Pressable, View } from 'react-native';
import { usableAreas } from '../../core/missions';
import { focusFor } from '../../core/personalize';
import { focusChoices, reviewFocusWeek, reviewWeekFor, weeklyReview, weekStart } from '../../core/review';
import { addDays, diffDays } from '../../core/time';
import type { FocusId } from '../../core/types';
import { MISSIONS, TRACK_BY_ID } from '../../content';
import { FOCUS } from '../../content/copy/focus';
import { PROGRESS } from '../../content/copy/progress';
import type { RootProps } from '../../navigation/types';
import { selection } from '../../services/haptics';
import { useApp } from '../../state/store';
import { Card, EmptyState, SectionLabel } from '../../ui/blocks';
import { Button, NavRow, Screen } from '../../ui/kit';
import { T } from '../../ui/text';
import { color as C, GAP, radius } from '../../ui/tokens';

const R = PROGRESS.review;

/** One number of the week: serif value, meta label. */
function Figure({ value, label }: { value: string; label: string }) {
  return (
    <View style={{ width: '50%', paddingVertical: 10, paddingRight: 8 }}>
      <T v="stat" numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.7}>
        {value}
      </T>
      <T v="meta" color={C.stone} style={{ marginTop: 4 }}>
        {label}
      </T>
    </View>
  );
}

/** A label over an area name ("Strongest" / "Fitness"). */
function Named({ label, name }: { label: string; name: string }) {
  return (
    <View style={{ flex: 1 }} accessible accessibilityLabel={`${label}: ${name}`}>
      <T v="meta" color={C.stone}>
        {label}
      </T>
      <T v="list" style={{ marginTop: 4 }}>
        {name}
      </T>
    </View>
  );
}

/** A weekly focus option: sentence case, filled bone when it's the one set. */
function Option({ label, on, onPress }: { label: string; on: boolean; onPress: () => void }) {
  return (
    <Pressable
      accessibilityRole="radio"
      // aria-checked rather than accessibilityState: react-native-web only reads the former.
      aria-checked={on}
      accessibilityState={{ checked: on }}
      accessibilityLabel={R.a11yOption(label)}
      onPress={onPress}
      style={({ pressed }) => ({
        minHeight: 44,
        paddingHorizontal: 14,
        justifyContent: 'center',
        borderRadius: radius.button,
        borderWidth: 1,
        borderColor: on ? C.bone : C.ruleStrong,
        backgroundColor: on ? C.bone : 'transparent',
        opacity: pressed ? 0.7 : 1,
      })}>
      <T v="small" color={on ? C.ink : C.muted}>
        {label}
      </T>
    </Pressable>
  );
}

/**
 * The weekly review (a modal): what the week added up to, the strongest area and one not got
 * to, and, at the end of a week, what matters most next: the weekly focus options. Picking one
 * sets the weekly focus for the week after the one reviewed (store.setFocus). "Something else"
 * isn't offered here; typing one is on the weekly focus page (Today and You).
 */
export function WeeklyReviewScreen({ navigation, route }: RootProps<'WeeklyReview'>) {
  const today = useApp(s => s.currentDay);
  const from = route.params?.weekStart ?? weekStart(today);
  const record = useApp(s => s.record);
  const plans = useApp(s => s.plans);
  const profile = useApp(s => s.profile);
  // The areas the plan draws from: the ones the user chose (the defaults with none on record)
  // that can get missions with their answers, so never School for someone not in school.
  const tracks = usableAreas(MISSIONS, profile).filter(id => TRACK_BY_ID[id]);
  const review = weeklyReview(record, plans, profile, from, tracks);

  // Closing the review Today is offering counts as seeing it, however the page is left.
  // Reading this week early from Progress doesn't: Sunday's review still shows.
  useEffect(
    () =>
      navigation.addListener('beforeRemove', () => {
        const s = useApp.getState();
        if (reviewWeekFor(s.currentDay) === from) s.markReviewSeen(from);
      }),
    [navigation, from],
  );

  const close = () => (navigation.canGoBack() ? navigation.goBack() : navigation.navigate('Main', { screen: 'Today' }));

  const thisWeek = weekStart(today);
  const label = from === thisWeek ? R.thisWeek : from === addDays(thisWeek, -7) ? R.lastWeek : R.week;
  const left = today >= review.from && today < review.to ? diffDays(today, review.to) : 0;
  const over = today > review.to;
  // "Strongest" only when one area actually leads: a 1–1–1 week has no strongest area.
  const counts = Object.values(review.byTrack).sort((a, b) => (b ?? 0) - (a ?? 0));
  const strongest = review.strongest && counts[0] !== counts[1] ? TRACK_BY_ID[review.strongest] : null;
  // "Didn't get to" only once the week has run its course: with days left it isn't true yet.
  const ignored = review.ignored && left === 0 ? TRACK_BY_ID[review.ignored] : null;

  // What matters most next: only at the end of a week (the review Today offers).
  const target = reviewFocusWeek(from, today);
  const options = target ? focusChoices(FOCUS.order, MISSIONS, profile) : [];
  const set = target ? focusFor(profile, target)?.id ?? null : null;
  // On Sunday this picks next week's focus: the store keeps it aside until Monday, so this
  // week's focus and today's missions stay as they are.
  const choose = (id: FocusId) => {
    if (!target) return;
    selection();
    const s = useApp.getState();
    if (focusFor(s.profile, target)?.id === id) s.setFocus(null, target);
    else s.setFocus({ week: target, id });
  };

  return (
    <Screen nav={<NavRow onClose={close} />} footer={<Button title={R.done} onPress={close} />}>
      <View style={{ marginTop: 16 }} accessible accessibilityRole="header" accessibilityLabel={`${label}, ${R.dates(PROGRESS.weekRange(review.from, review.to), left)}`}>
        <T v="kicker" color={C.stone}>
          {label}
        </T>
        <T v="title.l" style={{ marginTop: 10, fontVariant: ['lining-nums'] }}>
          {PROGRESS.weekRange(review.from, review.to)}
        </T>
        {left > 0 ? (
          <T v="meta" color={C.stone} style={{ marginTop: 6 }}>
            {R.daysLeft(left)}
          </T>
        ) : null}
      </View>

      {review.missions > 0 ? (
        <>
          <View style={{ marginTop: GAP.block }} accessible accessibilityLabel={R.a11y(review.missions, review.focusMinutes, review.points, review.perfectDays)}>
            <Card style={{ paddingVertical: 8 }}>
              <View style={{ flexDirection: 'row', flexWrap: 'wrap' }}>
                <Figure value={PROGRESS.number(review.missions)} label={R.missions} />
                <Figure value={PROGRESS.number(review.points)} label={R.points} />
                {review.focusMinutes > 0 ? <Figure value={PROGRESS.focused(review.focusMinutes)} label={R.focused} /> : null}
                {review.perfectDays > 0 ? <Figure value={String(review.perfectDays)} label={R.perfect(review.perfectDays)} /> : null}
              </View>
            </Card>
          </View>
          {strongest || ignored ? (
            <View style={{ marginTop: GAP.block, flexDirection: 'row', gap: 16 }}>
              {strongest ? <Named label={R.strongest} name={strongest.short} /> : null}
              {ignored ? <Named label={R.didntGetTo} name={ignored.short} /> : null}
            </View>
          ) : null}
        </>
      ) : (
        <View style={{ marginTop: GAP.block }}>
          <EmptyState title={over ? R.emptyPast : R.empty} />
        </View>
      )}

      {target && options.length ? (
        <View style={{ marginTop: GAP.section }}>
          <SectionLabel>{target > thisWeek ? R.nextLabel : R.nowLabel}</SectionLabel>
          <T v="small" color={C.stone}>
            {R.nextBody}
          </T>
          <View accessibilityRole="radiogroup" style={{ marginTop: 16, flexDirection: 'row', flexWrap: 'wrap', gap: GAP.tight }}>
            {options.map(id => (
              <Option key={id} label={FOCUS.options[id]} on={set === id} onPress={() => choose(id)} />
            ))}
          </View>
          {set ? (
            <T v="meta" color={C.stone} style={{ marginTop: 14 }}>
              {target > thisWeek ? R.setNext : R.setNow}
            </T>
          ) : null}
        </View>
      ) : null}
    </Screen>
  );
}
