import { View } from 'react-native';
import { DOCS, RULES } from '../../content';
import { REWARDS_COPY } from '../../content/copy/rewards';
import type { RootProps } from '../../navigation/types';
import { useAccessEnabled } from '../../state/store';
import { Card, SectionLabel } from '../../ui/blocks';
import { NavRow, PageTitle, Screen, TextButton } from '../../ui/kit';
import { T } from '../../ui/text';
import { color as C, GAP } from '../../ui/tokens';
import { LINING } from './redeem';

const H = REWARDS_COPY.how;

/** One way to earn: what, and the points. `said` reads the value aloud. */
function EarnRow({ title, value, said, note }: { title: string; value: string; said: string; note?: string }) {
  return (
    <View
      style={{ flexDirection: 'row', alignItems: 'flex-start', gap: 12, paddingVertical: 8 }}
      accessible
      accessibilityLabel={note ? `${title}, ${said}. ${note}` : `${title}, ${said}`}>
      <View style={{ flex: 1, minWidth: 0 }}>
        <T v="row">{title}</T>
        {note ? (
          <T v="note" color={C.stone} style={{ marginTop: 2 }}>
            {note}
          </T>
        ) : null}
      </View>
      <T v="saved" style={LINING}>
        {value}
      </T>
    </View>
  );
}

/** A short block of plain lines under one kicker. */
function Lines({ label, lines }: { label: string; lines: readonly string[] }) {
  return (
    <View style={{ marginTop: GAP.section }}>
      <SectionLabel>{label}</SectionLabel>
      <View style={{ gap: 10 }}>
        {lines.map(l => (
          <T key={l} v="body" color={C.muted}>
            {l}
          </T>
        ))}
      </View>
    </View>
  );
}

/**
 * How points work: what each mission earns, the perfect-day bonus, how codes work, status
 * and the limits. The rules that used to sit on the Rewards page. With rewards switched off
 * (accessEnabled false), only how points are earned.
 */
export function HowPointsScreen({ navigation }: RootProps<'HowPoints'>) {
  const accessEnabled = useAccessEnabled();
  return (
    <Screen nav={<NavRow onBack={() => navigation.goBack()} />}>
      <PageTitle title={H.title} body={H.intro} />

      <View style={{ marginTop: GAP.section }}>
        <SectionLabel>{H.earning}</SectionLabel>
        <Card>
          <T v="small" color={C.stone} style={{ marginBottom: 6 }}>
            {H.earningNote}
          </T>
          {H.rows.map(row => (
            <EarnRow key={row.title} title={row.title} value={row.value} said={row.said} />
          ))}
        </Card>
        <Card style={{ marginTop: GAP.card }}>
          <EarnRow title={H.perfect} value={H.plus(RULES.perfectDayBonus)} said={H.plusSaid(RULES.perfectDayBonus)} note={H.perfectNote} />
        </Card>
        <T v="note" color={C.stone} style={{ marginTop: 14 }}>
          {H.earnedOnly}
        </T>
      </View>

      {accessEnabled ? (
        <>
          <Lines label={H.codes} lines={H.codesBody} />
          <Lines label={H.status} lines={[H.statusBody]} />
          <Lines label={H.limits} lines={H.limitsBody} />
          <TextButton title={DOCS.access.title} align="left" onPress={() => navigation.navigate('Doc', { id: 'access' })} style={{ marginTop: GAP.block }} />
        </>
      ) : null}
    </Screen>
  );
}
