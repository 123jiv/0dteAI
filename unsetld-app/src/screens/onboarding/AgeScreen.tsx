import { useCallback, useEffect, useRef, useState } from 'react';
import { View } from 'react-native';
import { ageFromBirth, birthYears, needsMonth, type AgeResult } from '../../core/age';
import { AGE } from '../../content/copy/age';
import type { RootProps } from '../../navigation/types';
import { askAppleAgeRange } from '../../services/ageRange';
import { selection } from '../../services/haptics';
import { useApp } from '../../state/store';
import { Card } from '../../ui/blocks';
import { Button, NavRow, PageTitle, Screen } from '../../ui/kit';
import { T } from '../../ui/text';
import { GAP } from '../../ui/tokens';
import { useAnnounce } from '../../ui/useAnnounce';
import { WheelColumn, WHEEL_ROW } from '../../ui/WheelColumn';
import { confirmBirth } from './ageConfirm';
import { blockUnder13, passAgeGate } from './ageGate';
import { Chip } from './TracksScreen';

const MONTHS = Array.from({ length: 12 }, (_, i) => i + 1);

/**
 * The 13+ age gate (launch pass P0-4), after Name and before the numbered steps; once for
 * someone onboarded before it existed. Neutral: no year is suggested, nothing says which answer
 * gets in, and there's no going back to change it, so Continue asks once ("Born in 2016?", the
 * same for every year) before anything is kept or deleted. The month is asked only on the one year the
 * 13 line runs through. Where Apple shares an age range (iOS 26.2+, where age rules apply) that
 * answers instead; anything else falls back to the year.
 */
export function AgeScreen({ navigation }: RootProps<'Age'>) {
  // The year wheel and the answer are read against the real date (tester time travel moves days, not birthdays).
  const [now] = useState(() => new Date());
  const [years] = useState(() => birthYears(now));
  const [year, setYear] = useState<number | null>(null);
  const [month, setMonth] = useState<number | null>(null);
  const [busy, setBusy] = useState(false);
  const decided = useRef(false);

  const askMonth = year !== null && needsMonth(year, now);
  const answer = year === null ? null : ageFromBirth(year, askMonth ? month : null, now);
  useAnnounce(askMonth ? AGE.month : null);

  /** Once: 13 or over goes on (Today for someone already set up); under 13 deletes everything and ends here. */
  const decide = useCallback(
    async (r: AgeResult) => {
      if (decided.current) return;
      decided.current = true;
      setBusy(true);
      if (r.kind === 'ok') {
        passAgeGate(r.age);
        if (useApp.getState().settings.onboarded) navigation.reset({ index: 0, routes: [{ name: 'Main' }] });
        else navigation.replace('Tracks');
        return;
      }
      await blockUnder13();
      navigation.reset({ index: 0, routes: [{ name: 'AgeBlocked' }] });
    },
    [navigation],
  );

  // Apple's Declared Age Range, where it can answer. Null (most phones) leaves the question.
  useEffect(() => {
    let live = true;
    askAppleAgeRange()
      .then(r => {
        if (live && r) decide(r);
      })
      .catch(() => {});
    return () => {
      live = false;
    };
  }, [decide]);

  const pickYear = (y: number) => {
    setYear(y);
    if (!needsMonth(y, now)) setMonth(null);
  };

  const pickMonth = (m: number) => {
    selection();
    setMonth(m);
  };

  const ready = answer !== null && answer.kind !== 'month' && !busy;

  return (
    <Screen
      nav={<NavRow />}
      footer={
        <Button
          title={AGE.continue}
          disabled={!ready}
          onPress={() => {
            if (year === null || !answer || answer.kind === 'month') return;
            confirmBirth(year, askMonth ? month : null, () => decide(answer));
          }}
        />
      }>
      <PageTitle title={AGE.title} body={AGE.body} />
      <Card padding={0} style={{ marginTop: 24, paddingHorizontal: 18, height: WHEEL_ROW * 5 }}>
        <WheelColumn items={years} value={year} onPick={pickYear} format={y => String(y)} label={AGE.yearLabel} />
      </Card>
      {askMonth ? (
        <View style={{ marginTop: GAP.block, gap: 12 }}>
          <T v="row" accessibilityRole="header">
            {AGE.month}
          </T>
          <View accessibilityRole="radiogroup" accessibilityLabel={AGE.month} style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
            {MONTHS.map(m => (
              // Four to a row, across the full width.
              <Chip key={m} title={AGE.monthShort(m)} label={AGE.a11yMonth(m)} on={month === m} onPress={() => pickMonth(m)} style={{ flexGrow: 1, flexBasis: '22%', minWidth: 0 }} />
            ))}
          </View>
        </View>
      ) : null}
    </Screen>
  );
}
