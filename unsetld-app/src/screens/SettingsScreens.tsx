import { View } from 'react-native';
import { AppConfig } from '../config/app';
import type { LaneId } from '../core/types';
import { LANES, ONBOARDING, THEMES } from '../content';
import type { RootProps } from '../navigation/types';
import { requestNotifications } from '../services/notifications';
import { setAcquisitionSource } from '../services/purchases';
import { useApp, useEntitlements } from '../state/store';
import { Button, Chip, Header, Screen, Stepper, T, ToggleRow } from '../ui/components';
import { space } from '../ui/theme';
import { HourPicker } from './components/HourPicker';
import { ThemeSwatch } from './onboarding/OnboardingScreen';

export function LanesScreen({ navigation }: RootProps<'Lanes'>) {
  const settings = useApp(s => s.settings);
  const update = useApp(s => s.updateSettings);
  const ent = useEntitlements();
  const toggle = (id: LaneId) => {
    const selected = settings.lanes.includes(id);
    if (selected) {
      if (settings.lanes.length === 1) return; // keep at least one lane
      update({ lanes: settings.lanes.filter(x => x !== id) });
      return;
    }
    if (!ent.premium && settings.lanes.length >= AppConfig.freeLaneLimit) {
      // Free: swap out the oldest pick so the newest two are active.
      update({ lanes: [...settings.lanes.slice(1), id] });
      return;
    }
    update({ lanes: [...settings.lanes, id] });
  };
  return (
    <Screen scroll>
      <Header title="Lanes" onBack={() => navigation.goBack()} />
      <T variant="muted" style={{ marginVertical: space.md }}>
        {ent.premium ? 'Pick as many as you want.' : `Free uses ${AppConfig.freeLaneLimit} lanes. Picking a third swaps out your oldest. Premium unlocks all of them.`}
      </T>
      <View style={{ gap: space.sm }}>
        {LANES.map(l => (
          <Chip key={l.id} label={l.name} sub={`${l.category} · ${l.blurb}`} selected={ent.lanes.includes(l.id)} onPress={() => toggle(l.id)} />
        ))}
      </View>
      {!ent.premium ? (
        <Button title="Unlock every lane" variant="secondary" onPress={() => navigation.navigate('Paywall', { from: 'feature' })} style={{ marginTop: space.xl }} />
      ) : null}
    </Screen>
  );
}

export function ToneScreen({ navigation }: RootProps<'Tone'>) {
  const settings = useApp(s => s.settings);
  const update = useApp(s => s.updateSettings);
  return (
    <Screen scroll>
      <Header title="Tone" onBack={() => navigation.goBack()} />
      <View style={{ gap: space.sm, marginTop: space.md }}>
        {(['clean', 'unfiltered'] as const).map(t => (
          <Chip key={t} label={ONBOARDING.tone[t].label} sub={ONBOARDING.tone[t].body} selected={settings.tone === t} onPress={() => update({ tone: t })} />
        ))}
      </View>
      <View style={{ marginTop: space.lg }}>
        <ToggleRow
          title={ONBOARDING.tone.lockScreen}
          sub={ONBOARDING.tone.lockScreenBody}
          value={settings.lockScreenClean}
          onChange={v => update({ lockScreenClean: v })}
        />
      </View>
    </Screen>
  );
}

export function RemindersScreen({ navigation }: RootProps<'Reminders'>) {
  const settings = useApp(s => s.settings);
  const update = useApp(s => s.updateSettings);
  const ent = useEntitlements();
  const r = settings.reminders;
  const max = ent.premium ? AppConfig.premiumReminderLimit : AppConfig.freeReminderLimit;
  return (
    <Screen scroll>
      <Header title="Reminders" onBack={() => navigation.goBack()} />
      <ToggleRow
        title="Daily reminders"
        sub="Random lines from your lanes, inside your window."
        value={r.enabled}
        onChange={async v => {
          if (v) await requestNotifications();
          update({ reminders: { ...r, enabled: v } });
        }}
      />
      <View style={{ alignItems: 'center', marginVertical: space.xl, opacity: r.enabled ? 1 : 0.4 }}>
        <T variant="label">Per day</T>
        <View style={{ marginTop: space.sm }}>
          <Stepper label="reminders per day" value={Math.min(r.perDay, max)} min={1} max={max} onChange={v => update({ reminders: { ...r, perDay: v } })} />
        </View>
        {!ent.premium ? (
          <T variant="caption" style={{ marginTop: space.sm }}>
            {`Free: up to ${AppConfig.freeReminderLimit} a day. Premium: up to ${AppConfig.premiumReminderLimit}.`}
          </T>
        ) : null}
      </View>
      <HourPicker label="Start" value={r.startHour} options={[5, 6, 7, 8, 9, 10, 11, 12]} onChange={h => update({ reminders: { ...r, startHour: h } })} />
      <HourPicker label="End" value={r.endHour} options={[17, 18, 19, 20, 21, 22, 23, 24]} onChange={h => update({ reminders: { ...r, endHour: h } })} />
      <T variant="caption" style={{ marginTop: space.xl }}>
        {settings.lockScreenClean ? 'Reminders use clean lines (lock screen setting is on).' : 'Reminders follow your tone setting.'}
      </T>
    </Screen>
  );
}

export function ThemesScreen({ navigation }: RootProps<'Themes'>) {
  const settings = useApp(s => s.settings);
  const update = useApp(s => s.updateSettings);
  const ent = useEntitlements();
  return (
    <Screen scroll>
      <Header title="Theme" onBack={() => navigation.goBack()} />
      <T variant="muted" style={{ marginVertical: space.md }}>
        {ent.premium ? 'Your feed and home screen widgets follow it.' : 'UNSETLD is free. The rest come with Premium.'}
      </T>
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: space.md }}>
        {THEMES.map(t => (
          <ThemeSwatch
            key={t.id}
            themeId={t.id}
            selected={ent.theme.id === t.id}
            locked={!t.free && !ent.premium}
            onPress={() => {
              if (!t.free && !ent.premium) navigation.navigate('Paywall', { from: 'feature' });
              else update({ themeId: t.id });
            }}
          />
        ))}
      </View>
      {settings.themeId !== ent.theme.id ? (
        <T variant="caption" style={{ marginTop: space.lg }}>
          Your Premium theme comes back when you upgrade.
        </T>
      ) : null}
    </Screen>
  );
}

export function SourceScreen({ navigation }: RootProps<'Source'>) {
  const settings = useApp(s => s.settings);
  const update = useApp(s => s.updateSettings);
  return (
    <Screen scroll>
      <Header title="How did you find us?" onBack={() => navigation.goBack()} />
      <View style={{ gap: space.sm, marginTop: space.md }}>
        {ONBOARDING.source.options.map(o => (
          <Chip
            key={o.id}
            label={o.label}
            selected={settings.source === o.id}
            onPress={() => {
              update({ source: o.id });
              setAcquisitionSource(o.id);
            }}
          />
        ))}
      </View>
    </Screen>
  );
}
