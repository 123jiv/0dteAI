import { useState } from 'react';
import { View } from 'react-native';
import { milestoneStatus, type MilestoneId } from '../core/record';
import { milestoneNo } from '../core/typography';
import { MILESTONES } from '../content';
import { COPY } from '../content/copy';
import type { RootProps } from '../navigation/types';
import { useApp } from '../state/store';
import { Button, NavRow, Screen, TextButton } from '../ui/kit';
import { T } from '../ui/text';
import { color as C } from '../ui/tokens';
import { runMilestoneAction, type ActionResult } from './access';

const R = COPY.record.status;

export function errorText(r: ActionResult): string | null {
  if (r === 'paused') return COPY.milestone.pausedError;
  if (r === 'used') return COPY.milestone.usedNote;
  if (r === 'network') return COPY.milestone.networkError;
  return null;
}

/** One milestone: what it is, its status, and one action when there is one. */
export function MilestoneScreen({ navigation, route }: RootProps<'Milestone'>) {
  const id = route.params.id as MilestoneId;
  const m = MILESTONES.find(x => x.id === id)!;
  const record = useApp(s => s.record);
  const day = useApp(s => s.currentDay);
  const collection = useApp(s => s.remote.collection);
  const signedIn = useApp(s => Boolean(s.account.userId));
  const dropAlerts = useApp(s => s.settings.dropAlerts);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const status = milestoneStatus(record, m, day, collection);

  const statusLabel =
    status.kind === 'open' ? R.open : status.kind === 'used' ? R.used : status.kind === 'paused' ? R.paused : R.left(status.daysLeft);

  // The action applies only when the milestone is open (and early access only while alerts are off).
  const showAction = status.kind === 'open' && !(id === 'early-access' && dropAlerts);
  const needsAccount = id !== 'early-access' && !signedIn;

  const act = async () => {
    if (needsAccount) return navigation.navigate('Account');
    setBusy(true);
    setError(null);
    const r = await runMilestoneAction(id);
    setBusy(false);
    if (r === 'needs-account') navigation.navigate('Account');
    else setError(errorText(r));
  };

  return (
    <Screen nav={<NavRow onBack={() => navigation.goBack()} />}>
      <View style={{ marginTop: 24, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
        <T v="mono" color={status.kind === 'locked' ? C.stone : C.bone}>
          {milestoneNo(m.day)}
        </T>
        <T v="label" color={status.kind === 'open' ? C.bone : C.stone}>
          {statusLabel}
        </T>
      </View>
      <T v="title.xl" style={{ marginTop: 12 }} accessibilityRole="header">
        {m.title}
      </T>
      <T v="body" style={{ marginTop: 16 }}>
        {m.detail}
      </T>
      {status.kind === 'used' ? (
        <T v="note" color={C.stone} style={{ marginTop: 16 }}>
          {COPY.milestone.usedNote}
        </T>
      ) : null}
      {status.kind === 'paused' ? (
        <T v="note" color={C.stone} style={{ marginTop: 16 }}>
          {COPY.record.pausedNote}
        </T>
      ) : null}
      {showAction ? (
        <View style={{ marginTop: 32, gap: 12 }}>
          {needsAccount ? (
            <T v="note" color={C.stone}>
              {COPY.milestone.signInNote}
            </T>
          ) : null}
          <Button title={m.action} onPress={act} disabled={busy} />
          {error ? (
            <T v="note" color={C.stone} accessibilityLiveRegion="polite">
              {error}
            </T>
          ) : null}
        </View>
      ) : null}
      <TextButton title={COPY.milestone.termsLink} align="left" onPress={() => navigation.navigate('Doc', { id: 'access' })} style={{ marginTop: 16 }} />
    </Screen>
  );
}
