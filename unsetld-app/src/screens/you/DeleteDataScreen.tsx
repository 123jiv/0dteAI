// Delete data on this phone (You › YOUR DATA): what goes, what stays, then one destructive
// confirm. Local only (services/wipe): it works offline and signed out, and never deletes the
// unsetld.com account, which is Account's Delete account. Afterwards onboarding starts again from
// its first screen, and VoiceOver says the data is gone.
import { useState } from 'react';
import { View } from 'react-native';
import type { DayKey } from '../../core/time';
import type { RecordState } from '../../core/types';
import { DATA } from '../../content/copy/data';
import type { RootProps } from '../../navigation/types';
import { deleteLocalData } from '../../services/wipe';
import { useApp } from '../../state/store';
import { showDialog } from '../../ui/actions';
import { Button, InlineLink, NavRow, PageTitle, Screen } from '../../ui/kit';
import { T } from '../../ui/text';
import { color as C, GAP } from '../../ui/tokens';
import { announce } from '../../ui/useAnnounce';
import { redemptionsWithCode } from '../rewards/codes';

/** Codes taken that still work on `today`: they'd be lost with the record, so the page says so first. */
export function liveCodeCount(r: RecordState, today: DayKey): number {
  const all = [...redemptionsWithCode(r), ...(Array.isArray(r.codes) ? r.codes : [])];
  return all.filter(c => typeof c?.expires === 'string' && today <= c.expires).length;
}

/** A spaced list with a small mark before each item, as the policy pages draw theirs. */
function List({ label, items }: { label: string; items: readonly string[] }) {
  return (
    <View style={{ marginTop: GAP.block }}>
      <T v="kicker" color={C.stone} accessibilityRole="header">
        {label}
      </T>
      <View style={{ marginTop: 12, gap: 10 }}>
        {items.map(item => (
          <View key={item} style={{ flexDirection: 'row', gap: 12 }}>
            <View style={{ width: 4, height: 4, marginTop: 9, backgroundColor: C.stone }} />
            <T v="body" color={C.muted} style={{ flex: 1 }}>
              {item}
            </T>
          </View>
        ))}
      </View>
    </View>
  );
}

export function DeleteDataScreen({ navigation }: RootProps<'DeleteData'>) {
  const signedIn = useApp(s => Boolean(s.account.userId));
  const record = useApp(s => s.record);
  const day = useApp(s => s.currentDay);
  const inTrial = useApp(s => Boolean(s.premium.active && s.premium.trialEnds));
  const [busy, setBusy] = useState(false);
  const [failed, setFailed] = useState(false);
  const live = liveCodeCount(record, day);
  const stays = inTrial ? [...DATA.stays, DATA.staysTrial] : DATA.stays;

  const run = async () => {
    setBusy(true);
    setFailed(false);
    const result = await deleteLocalData().catch(() => 'failed' as const);
    if (result === 'failed') {
      setBusy(false);
      setFailed(true);
      announce(DATA.error);
      return;
    }
    // A new install's first screen: onboarding starts again, with nothing behind it.
    navigation.reset({ index: 0, routes: [{ name: 'Name' }] });
    announce(DATA.done);
  };

  const confirm = () => {
    if (busy) return;
    showDialog(DATA.confirm.title, DATA.confirm.body(signedIn), [
      { label: DATA.confirm.no, cancel: true },
      { label: DATA.confirm.yes, destructive: true, onPress: () => void run() },
    ]);
  };

  return (
    <Screen
      nav={<NavRow onBack={() => navigation.goBack()} />}
      footer={<Button title={busy ? DATA.working : DATA.button} onPress={confirm} disabled={busy} />}>
      <PageTitle title={DATA.title} body={DATA.body} />

      {live > 0 ? (
        <View style={{ marginTop: GAP.block, gap: 4 }}>
          <T v="body">{DATA.liveCodes(live)}</T>
          <InlineLink title={DATA.rewardHistory} v="note" onPress={() => navigation.navigate('RewardHistory')} />
        </View>
      ) : null}

      {signedIn ? (
        <View style={{ marginTop: GAP.block, gap: 4 }}>
          <T v="body">{DATA.signedIn}</T>
          <InlineLink title={DATA.deleteAccountFirst} v="note" onPress={() => navigation.navigate('Account')} />
        </View>
      ) : null}

      <List label={DATA.goesLabel} items={DATA.goes} />
      <List label={DATA.staysLabel} items={stays} />

      {failed ? (
        <T v="note" color={C.stone} style={{ marginTop: GAP.block }}>
          {DATA.error}
        </T>
      ) : null}
    </Screen>
  );
}
