import { useEffect } from 'react';
import { View } from 'react-native';
import { statusReward, statusState } from '../core/rewards';
import { DOCS } from '../content';
import { REWARDS_COPY } from '../content/copy/rewards';
import type { RootProps } from '../navigation/types';
import { openStore } from '../services/access';
import { useAccessEnabled, useApp } from '../state/store';
import { Card, Meter } from '../ui/blocks';
import { Button, NavRow, Screen, TextButton } from '../ui/kit';
import { T } from '../ui/text';
import { color as C, GAP } from '../ui/tokens';
import { accessDays, findStatus, useStatusTiers } from './access';
import { LINING, RedeemNote, useRedeem } from './rewards/redeem';
import { statusStateText, TakenCode } from './rewards/StatusScreen';

const R = REWARDS_COPY;
const S = R.status;

/**
 * One UNSETLD status tier (route Milestone {id}): the same as its row on Status, larger, with
 * its full detail and Get the code. Opened from the status letter. A tier shows while it's in
 * effect, or once its code was taken (an old link to a tier the config has since switched off
 * still finds the code); any other id falls back to the Status page.
 */
export function MilestoneScreen({ navigation, route }: RootProps<'Milestone'>) {
  const tiers = useStatusTiers();
  const record = useApp(s => s.record);
  const day = useApp(s => s.currentDay);
  const signedIn = useApp(s => Boolean(s.account.userId));
  const accessEnabled = useAccessEnabled();
  const { busy, noteFor, take, sheet } = useRedeem(() => navigation.navigate('Account'));

  const found = findStatus(tiers, route.params?.id ?? '');
  const state = found ? statusState(record, found, day) : null;
  const t = found && state && (state.kind === 'taken' || tiers.some(x => x.id === found.id)) ? found : null;
  useEffect(() => {
    if (!t) navigation.replace('Status');
  }, [t, navigation]);
  if (!t || !state) return <View style={{ flex: 1, backgroundColor: C.ink }} />;

  const n = accessDays(record);
  const word = statusStateText(state);

  return (
    <View style={{ flex: 1, backgroundColor: C.ink }}>
      <Screen nav={<NavRow onBack={() => navigation.goBack()} />}>
        <View style={{ marginTop: 24, flexDirection: 'row', alignItems: 'baseline', justifyContent: 'space-between', gap: 12 }}>
          <View style={{ flexDirection: 'row', alignItems: 'baseline', gap: 10 }} accessible accessibilityLabel={S.daysA11y(t.day)}>
            <T v="stat" style={LINING}>
              {String(t.day)}
            </T>
            <T v="meta" color={C.stone}>
              {S.tierUnit(t.day)}
            </T>
          </View>
          <T v="meta" color={state.kind === 'ready' ? C.bone : C.stone}>
            {word}
          </T>
        </View>
        <T v="title.xl" style={[LINING, { marginTop: 14 }]} accessibilityRole="header">
          {t.title}
        </T>
        <T v="body" color={C.stone} style={{ marginTop: 8 }}>
          {S.cap(t)}
        </T>
        {t.detail ? (
          <T v="body" color={C.muted} style={{ marginTop: 20 }}>
            {t.detail}
          </T>
        ) : null}

        {state.kind === 'ready' ? (
          accessEnabled ? (
            <View style={{ marginTop: GAP.section }}>
              <Button title={R.getCode} onPress={() => take(statusReward(t))} disabled={busy !== null} accessibilityLabel={`${R.getCode}: ${t.title}`} />
              {!signedIn ? (
                <T v="note" color={C.stone} style={{ marginTop: 10 }}>
                  {R.signInNote}
                </T>
              ) : null}
              <RedeemNote text={noteFor(t.id)} />
            </View>
          ) : (
            <T v="small" color={C.stone} style={{ marginTop: GAP.block }}>
              {R.off}
            </T>
          )
        ) : state.kind === 'taken' && state.code ? (
          <>
            <Card style={{ marginTop: GAP.block }}>
              <T v="kicker" color={C.stone}>
                {R.codeLabel}
              </T>
              <View style={{ marginTop: 10 }}>
                <TakenCode code={state.code} today={day} large />
              </View>
            </Card>
            {day <= state.code.expires ? (
              <>
                <T v="note" color={C.stone} style={{ marginTop: 10 }}>
                  {R.milestone.oneOrder}
                </T>
                <Button title={R.use} onPress={() => openStore(state.code?.url)} style={{ marginTop: GAP.block }} />
              </>
            ) : null}
          </>
        ) : state.kind === 'taken' ? (
          <T v="note" color={C.stone} style={{ marginTop: GAP.block }}>
            {S.takenElsewhere}
          </T>
        ) : state.kind === 'locked' ? (
          <Card style={{ marginTop: GAP.block }}>
            <View accessible accessibilityLabel={`${S.progressA11y(n, t.day)}. ${word}`}>
              <Meter value={n} max={t.day} />
              <View style={{ marginTop: 10, flexDirection: 'row', justifyContent: 'space-between', gap: 12 }}>
                <T v="meta" color={C.stone}>
                  {S.progress(n, t.day)}
                </T>
                <T v="meta" color={C.stone}>
                  {word}
                </T>
              </View>
            </View>
          </Card>
        ) : null}

        <TextButton title={DOCS.access.title} align="left" onPress={() => navigation.navigate('Doc', { id: 'access' })} style={{ marginTop: GAP.block }} />
      </Screen>
      {sheet}
    </View>
  );
}
