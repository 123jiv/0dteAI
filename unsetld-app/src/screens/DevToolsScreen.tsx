import { View } from 'react-native';
import { dayCount, emptyRecord, recordDay } from '../core/record';
import { pointsBalance } from '../core/points';
import { POINTS } from '../content';
import { addDays, formatTime, minutesOf } from '../core/time';
import type { RootProps } from '../navigation/types';
import { now, today } from '../services/clock';
import { purchaseMode } from '../services/purchases';
import { useApp } from '../state/store';
import { Button, NavRow, PageTitle, Screen, SettingsRow, Toggle } from '../ui/kit';
import { T } from '../ui/text';
import { color as C, MARGIN } from '../ui/tokens';

function Label({ children }: { children: string }) {
  return (
    <T v="label" style={{ marginTop: 32, marginBottom: 12 }}>
      {children}
    </T>
  );
}

/**
 * Tester tools (dev builds and the browser preview only): time travel so the
 * record, milestones, letters and the pause rule can be tried in minutes.
 */
export function DevToolsScreen({ navigation }: RootProps<'DevTools'>) {
  const offset = useApp(s => s.dayOffset);
  const record = useApp(s => s.record);
  const premium = useApp(s => s.premium.active);
  const remote = useApp(s => s.remote);
  const settings = useApp(s => s.settings);
  const st = useApp.getState;

  /**
   * Opens the app every day for `n` days: today and the next n-1 go on record,
   * and the new today is left for the reader to record (so Day N and letters show).
   */
  const grind = (n: number) => {
    let r = st().record;
    for (let i = 0; i < n; i++) r = recordDay(r, addDays(today(), i), true);
    st().setDayOffset(st().dayOffset + n);
    st().setRecord(r);
  };
  const skip = (n: number) => st().setDayOffset(st().dayOffset + n);

  return (
    <Screen nav={<NavRow onBack={() => navigation.goBack()} />}>
      <PageTitle title="Tester tools" body="Preview and dev builds only. Time travel changes the app's idea of today; notifications still use the real clock." />
      <View style={{ marginTop: 24, gap: 4 }}>
        <T v="mono">{`TODAY ${today()}  (${offset >= 0 ? '+' : ''}${offset} DAYS)`}</T>
        <T v="mono">{`DAY ${dayCount(record)} ON RECORD · ${pointsBalance(record, POINTS)} POINTS`}</T>
      </View>

      <Label>TIME TRAVEL</Label>
      <View style={{ gap: 12 }}>
        <Button kind="outline" title="Next day (then open the reader)" onPress={() => skip(1)} />
        <Button kind="outline" title="Jump 6 days, opening the app each day" onPress={() => grind(6)} />
        <Button kind="outline" title="Jump 23 days, opening the app each day" onPress={() => grind(23)} />
        <Button kind="outline" title="Jump 60 days, opening the app each day" onPress={() => grind(60)} />
        <Button kind="outline" title="Disappear for 15 days" onPress={() => skip(15)} />
        <Button kind="outline" title="Back to the real today" onPress={() => st().backToRealToday()} />
      </View>

      <Label>PROOF</Label>
      <View style={{ gap: 12 }}>
        <Button
          kind="outline"
          title="Add 20 days of proven work (800 points)"
          onPress={() => {
            let r = st().record;
            for (let i = 1; i <= 20; i++) {
              const d = addDays(today(), -i);
              const proof = { uri: '', takenAt: Date.now(), lineNo: null };
              const done = Object.fromEntries(['r0', 'r1', 'r2', 'd'].map(k => [k, { text: 'Test task.', doneAt: Date.now(), proof }]));
              r = { ...r, work: { ...r.work, [d]: { ...done, ...r.work[d] } } };
            }
            st().setRecord(r);
          }}
        />
      </View>

      <Label>FLAGS</Label>
      <View style={{ marginHorizontal: -MARGIN }}>
        {purchaseMode === 'preview' ? (
          <SettingsRow
            first
            title="Full Edition (preview)"
            chevron={false}
            right={<Toggle label="Full Edition" value={premium} onChange={v => st().setPremium({ active: v, plan: v ? 'annual' : null })} />}
          />
        ) : null}
        <SettingsRow
          title="Access enabled"
          chevron={false}
          right={<Toggle label="Access enabled" value={remote.accessEnabled ?? true} onChange={v => st().setRemote({ accessEnabled: v })} />}
        />
        <SettingsRow
          title="Night check due now"
          value={formatTime(settings.night.time)}
          chevron={false}
          onPress={() => st().updateSettings({ night: { on: true, time: Math.max(0, minutesOf(now()) - 1) } })}
        />
      </View>

      <Label>RESET</Label>
      <View style={{ gap: 12 }}>
        <Button
          kind="outline"
          title="Replay onboarding"
          onPress={() => {
            st().updateSettings({ onboarded: false });
            navigation.reset({ index: 0, routes: [{ name: 'Name' }] });
          }}
        />
        <Button
          kind="outline"
          title="Clear the record and letters"
          onPress={() => {
            st().backToRealToday();
            st().setRecord(emptyRecord());
          }}
        />
      </View>
      <T v="note" color={C.stone} style={{ marginTop: 16 }}>
        After time travel, go back to the reader: it records the new day, shows Day N in the running head, and any milestone letter after a few seconds.
      </T>
    </Screen>
  );
}
