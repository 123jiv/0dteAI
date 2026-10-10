import { useEffect, useState } from 'react';
import { AppState, Linking, Platform, Pressable, Text, View } from 'react-native';
import { REMINDER_COUNTS } from '../core/reminders';
import { DAY_START_HOUR, formatTime, minutesIntoDay } from '../core/time';
import { MISSION_BY_ID } from '../content';
import { ONBOARDING } from '../content/copy/onboarding';
import type { RootProps } from '../navigation/types';
import { notificationStatus, requestNotifications, type Permission } from '../services/notifications';
import { useApp, useEntitlements } from '../state/store';
import { Card } from '../ui/blocks';
import { Button, InlineLink, NavRow, PageTitle, Screen, Segmented, TextButton, Toggle } from '../ui/kit';
import { T } from '../ui/text';
import { TimeSheet } from '../ui/TimeSheet';
import { color as C, GAP, hairline } from '../ui/tokens';
import { Walker } from '../ui/Walker';

/** Last stays after First in the 4 AM day: one at or before First moves to an hour after it (3:55 AM at most). */
function lastAfter(first: number, last: number): number {
  if (minutesIntoDay(last) > minutesIntoDay(first)) return last;
  return (Math.min(minutesIntoDay(first) + 60, 1435) + DAY_START_HOUR * 60) % 1440;
}

const SYSTEM = Platform.select({ ios: undefined, default: "-apple-system, BlinkMacSystemFont, 'SF Pro Text', 'Helvetica Neue', Inter_400Regular, sans-serif" });

/** One setting inside the card: its name on the left, its control on the right. No rules between them. */
function Row({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <View style={{ minHeight: 52, flexDirection: 'row', alignItems: 'center', gap: 12 }}>
      <T v="row" style={{ flex: 1 }}>
        {title}
      </T>
      {children}
    </View>
  );
}

function TimeValue({ value, onPress, disabled, label }: { value: number; onPress: () => void; disabled?: boolean; label: string }) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`${label}, ${formatTime(value)}`}
      disabled={disabled}
      onPress={onPress}
      hitSlop={8}
      style={({ pressed }) => ({ minHeight: 44, justifyContent: 'center', opacity: pressed ? 0.6 : 1 })}>
      <T v="small" color={disabled ? C.ash : C.bone} style={{ fontVariant: ['tabular-nums'] }}>
        {formatTime(value)}
      </T>
    </Pressable>
  );
}

const COPY = ONBOARDING.day;

/** Onboarding's last step (Goal → Reminders → Today), and You › Reminders. */
export function DayScreen({ navigation, route }: RootProps<'Day'>) {
  const edit = Boolean(route.params?.edit);
  const settings = useApp(s => s.settings);
  const update = useApp(s => s.updateSettings);
  const ent = useEntitlements();
  const [count, setCount] = useState(Math.min(settings.reminders.count, ent.maxReminders));
  const [first, setFirst] = useState(settings.reminders.first);
  const [last, setLast] = useState(settings.reminders.last);
  const [picker, setPicker] = useState<'first' | 'last' | null>(null);
  /** You › Reminders only: the switch at the top. Off hides the rest and saves on:false. */
  const [on, setOn] = useState(settings.reminders.on);
  const shown = !edit || on;
  const [perm, setPerm] = useState<Permission>('undetermined');

  // Checked again on return from iOS Settings, where Open Settings sends people.
  useEffect(() => {
    const check = () => notificationStatus().then(setPerm).catch(() => {});
    check();
    const sub = AppState.addEventListener('change', s => {
      if (s === 'active') check();
    });
    return () => sub.remove();
  }, []);

  // Onboarding offers only the counts the user can pick; You › Reminders also shows the
  // UNSETLD+ ones, locked, with the note.
  const disabled = REMINDER_COUNTS.filter(n => n > ent.maxReminders);
  const options: readonly (typeof REMINDER_COUNTS)[number][] = edit ? REMINDER_COUNTS : REMINDER_COUNTS.filter(n => n <= ent.maxReminders);

  // Today's missions, as the first reminder of the day names them.
  const plan = useApp(s => s.plans[s.currentDay]);
  const titles = (plan?.missions ?? []).map(p => MISSION_BY_ID[p.missionId]?.title).filter((t): t is string => Boolean(t));
  const previewBody = COPY.previewBody(titles);

  const save = (on: boolean) => update({ reminders: { on, count, first, last } });

  /** Onboarding ends here: today's plan is built and Today opens, with the tabs. No widget guide, no paywall. */
  const finish = () => {
    useApp.getState().completeOnboarding(false);
    navigation.reset({ index: 0, routes: [{ name: 'Main' }] });
  };

  const allow = async () => {
    const granted = await requestNotifications().catch(() => false);
    save(granted || Platform.OS === 'web');
    finish();
  };

  const saveEdit = async () => {
    // Off needs no permission. Saved as on:false, the scheduled reminders are cancelled (state/lifecycle).
    if (!on) {
      save(false);
      navigation.goBack();
      return;
    }
    const now = await notificationStatus().catch(() => perm);
    let ok = now === 'granted' || Platform.OS === 'web';
    if (now === 'undetermined') ok = await requestNotifications().catch(() => false);
    save(ok || settings.reminders.on);
    navigation.goBack();
  };

  const pickerTitle = picker === 'last' ? COPY.last : COPY.first;
  const pickerValue = picker === 'last' ? last : first;

  return (
    <View style={{ flex: 1 }}>
      <Screen
        nav={<NavRow onBack={() => navigation.goBack()} step={edit ? undefined : ONBOARDING.step(5)} />}
        footer={
          edit ? (
            <Button title={COPY.save} onPress={saveEdit} />
          ) : (
            <View>
              <Button title={COPY.allow} onPress={allow} />
              <TextButton
                title={COPY.notNow}
                style={{ marginTop: 8 }}
                onPress={() => {
                  save(false);
                  finish();
                }}
              />
            </View>
          )
        }>
        <PageTitle title={edit ? COPY.remindersTitle : COPY.title} body={edit ? undefined : COPY.body} />
        {edit && on && perm === 'denied' ? (
          <Card style={{ marginTop: 20, gap: 4 }}>
            <T v="small">{COPY.permOff}</T>
            <InlineLink title={COPY.openSettings} v="note" onPress={() => Linking.openSettings().catch(() => {})} />
          </Card>
        ) : null}

        <View
          accessible
          accessibilityLabel={COPY.a11yPreview(formatTime(first), previewBody)}
          style={{ marginTop: 24, backgroundColor: C.notification, borderRadius: 20, padding: 14, flexDirection: 'row', gap: 10, opacity: shown ? 1 : 0.4 }}>
          <View style={{ width: 38, height: 38, borderRadius: 9, backgroundColor: C.ink, borderWidth: hairline, borderColor: C.ruleStrong, alignItems: 'center', justifyContent: 'center' }}>
            <Walker height={26} />
          </View>
          <View style={{ flex: 1 }}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'baseline' }}>
              <Text maxFontSizeMultiplier={1.3} style={{ fontFamily: SYSTEM, fontSize: 15, fontWeight: '600', color: C.bone }}>
                {COPY.notificationTitle}
              </Text>
              <Text maxFontSizeMultiplier={1.3} style={{ fontFamily: SYSTEM, fontSize: 13, color: C.stone }}>
                {formatTime(first)}
              </Text>
            </View>
            <Text maxFontSizeMultiplier={1.3} style={{ fontFamily: SYSTEM, fontSize: 15, lineHeight: 20, color: C.bone, marginTop: 1 }}>
              {previewBody.replace(/'/g, '’')}
            </Text>
          </View>
        </View>

        <Card padding={0} style={{ marginTop: GAP.block, paddingHorizontal: 18, paddingVertical: 6 }}>
          {edit ? (
            <Row title={COPY.toggle}>
              <Toggle label={COPY.toggle} value={on} onChange={setOn} />
            </Row>
          ) : null}
          {shown ? (
            <>
              {/* The count on its own line, the control full width under it. */}
              <View style={{ paddingTop: 14, paddingBottom: 8, gap: 12 }}>
                <T v="row">{COPY.perDay}</T>
                <Segmented
                  options={options}
                  value={count as (typeof REMINDER_COUNTS)[number]}
                  onChange={setCount}
                  disabled={disabled}
                  style={{ alignSelf: 'stretch' }}
                />
                {edit && !ent.premium ? (
                  <T v="note" color={C.stone}>
                    {COPY.perDayNote}
                  </T>
                ) : null}
              </View>
              <Row title={COPY.first}>
                <TimeValue label={COPY.first} value={first} onPress={() => setPicker('first')} />
              </Row>
              <Row title={COPY.last}>
                <TimeValue label={COPY.last} value={last} onPress={() => setPicker('last')} disabled={count === 1} />
              </Row>
            </>
          ) : null}
        </Card>
        {shown ? (
          <T v="note" color={C.stone} style={{ marginTop: 10 }}>
            {COPY.note}
          </T>
        ) : null}
      </Screen>

      <TimeSheet
        title={pickerTitle}
        value={pickerValue}
        visible={picker !== null}
        onClose={() => setPicker(null)}
        onDone={m => {
          if (picker === 'first') {
            setFirst(m);
            setLast(lastAfter(m, last));
          }
          if (picker === 'last') setLast(lastAfter(first, m));
          setPicker(null);
        }}
      />
    </View>
  );
}
