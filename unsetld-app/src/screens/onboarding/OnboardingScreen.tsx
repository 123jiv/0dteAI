import { useState } from 'react';
import { Image, Pressable, Text, View } from 'react-native';
import { AppConfig } from '../../config/app';
import type { LaneId } from '../../core/types';
import { LANES, ONBOARDING, THEMES } from '../../content';
import type { RootProps } from '../../navigation/types';
import { requestNotifications } from '../../services/notifications';
import { setAcquisitionSource } from '../../services/purchases';
import { useApp } from '../../state/store';
import { Button, Chip, IconButton, ProgressBar, Screen, Stepper, T, TextureBackground } from '../../ui/components';
import { Icon } from '../../ui/icons';
import { RankEmblem } from '../../ui/RankEmblem';
import { fonts, radius, space, useTheme } from '../../ui/theme';
import { HourPicker } from '../components/HourPicker';

const STEPS = ['welcome', 'goals', 'struggles', 'tone', 'reminders', 'theme', 'source', 'notifications', 'rank'] as const;
type Step = (typeof STEPS)[number];

export function OnboardingScreen({ navigation }: RootProps<'Onboarding'>) {
  const theme = useTheme();
  const settings = useApp(s => s.settings);
  const update = useApp(s => s.updateSettings);
  const premium = useApp(s => s.premium.active);
  const [i, setI] = useState(0);
  const step: Step = STEPS[i];

  const next = () => {
    if (i < STEPS.length - 1) setI(i + 1);
    else navigation.navigate('Paywall', { from: 'onboarding' });
  };
  const back = () => setI(Math.max(0, i - 1));

  const canContinue = step !== 'goals' || settings.lanes.length > 0;
  const cta =
    step === 'welcome' ? "Let's go" : step === 'notifications' ? 'Turn on reminders' : step === 'rank' ? 'Start' : 'Continue';

  const onCta = async () => {
    if (step === 'notifications') await requestNotifications();
    if (step === 'source') setAcquisitionSource(settings.source);
    next();
  };

  return (
    <Screen
      scroll
      footer={
        <View style={{ gap: space.sm }}>
          <Button title={cta} onPress={onCta} disabled={!canContinue} />
          {step === 'notifications' || step === 'source' ? (
            <Button title={step === 'source' ? 'Skip' : 'Not now'} variant="ghost" onPress={next} />
          ) : null}
        </View>
      }>
      {step !== 'welcome' ? (
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: space.md, marginTop: space.sm, marginLeft: -8 }}>
          <IconButton icon="chevron-left" label="Back" onPress={back} />
          <View style={{ flex: 1 }}>
            <ProgressBar fraction={i / (STEPS.length - 1)} height={3} />
          </View>
          <View style={{ width: 24 }} />
        </View>
      ) : null}

      {step === 'welcome' && (
        <View style={{ minHeight: 560, justifyContent: 'center', alignItems: 'center' }}>
          <Image source={require('../../../assets/figure-mark.png')} style={{ width: 110, height: 110, marginBottom: space.xl }} accessibilityLabel={`${AppConfig.name} logo`} />
          <T variant="label" color={theme.accent}>
            {AppConfig.name}
          </T>
          <T variant="title" center style={{ fontSize: 46, lineHeight: 50, marginTop: space.md }}>
            {ONBOARDING.welcome.title}
          </T>
          <T variant="muted" center style={{ marginTop: space.lg, maxWidth: 300 }}>
            {ONBOARDING.welcome.body}
          </T>
        </View>
      )}

      {step === 'goals' && (
        <StepBody title={ONBOARDING.goals.title} body={ONBOARDING.goals.body}>
          {LANES.map(l => {
            const selected = settings.lanes.includes(l.id);
            return (
              <Chip
                key={l.id}
                label={l.name}
                sub={l.category}
                selected={selected}
                onPress={() =>
                  update({ lanes: selected ? settings.lanes.filter(x => x !== l.id) : [...settings.lanes, l.id as LaneId] })
                }
              />
            );
          })}
          <T variant="caption" style={{ marginTop: space.sm }}>
            {`Free includes ${AppConfig.freeLaneLimit} lanes. Premium unlocks all of them.`}
          </T>
        </StepBody>
      )}

      {step === 'struggles' && (
        <StepBody title={ONBOARDING.struggles.title} body={ONBOARDING.struggles.body}>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: space.sm }}>
            {ONBOARDING.struggles.options.map(o => {
              const selected = settings.struggles.includes(o.id);
              return (
                <Chip
                  key={o.id}
                  label={o.label}
                  selected={selected}
                  onPress={() =>
                    update({ struggles: selected ? settings.struggles.filter(x => x !== o.id) : [...settings.struggles, o.id] })
                  }
                />
              );
            })}
          </View>
        </StepBody>
      )}

      {step === 'tone' && (
        <StepBody title={ONBOARDING.tone.title}>
          {(['clean', 'unfiltered'] as const).map(t => (
            <Chip
              key={t}
              label={ONBOARDING.tone[t].label}
              sub={ONBOARDING.tone[t].body}
              selected={settings.tone === t}
              onPress={() => update({ tone: t })}
            />
          ))}
          <Pressable
            accessibilityRole="switch"
            accessibilityState={{ checked: settings.lockScreenClean }}
            onPress={() => update({ lockScreenClean: !settings.lockScreenClean })}
            style={{ flexDirection: 'row', gap: space.md, marginTop: space.lg, alignItems: 'flex-start' }}>
            <View
              style={{
                width: 24,
                height: 24,
                borderRadius: 6,
                borderWidth: 1.5,
                borderColor: settings.lockScreenClean ? theme.accent : theme.border,
                backgroundColor: settings.lockScreenClean ? theme.accent : 'transparent',
                alignItems: 'center',
                justifyContent: 'center',
                marginTop: 2,
              }}>
              {settings.lockScreenClean ? <Icon name="check" size={16} color={theme.onAccent} /> : null}
            </View>
            <View style={{ flex: 1 }}>
              <T variant="body">{ONBOARDING.tone.lockScreen}</T>
              <T variant="caption" style={{ marginTop: 2 }}>
                {ONBOARDING.tone.lockScreenBody}
              </T>
            </View>
          </Pressable>
        </StepBody>
      )}

      {step === 'reminders' && (
        <StepBody title={ONBOARDING.reminders.title} body={ONBOARDING.reminders.body}>
          <T variant="label">Reminders per day</T>
          <View style={{ alignItems: 'center', marginVertical: space.md }}>
            <Stepper
              label="reminders per day"
              value={settings.reminders.perDay}
              min={1}
              max={AppConfig.premiumReminderLimit}
              onChange={v => update({ reminders: { ...settings.reminders, perDay: v } })}
            />
            {settings.reminders.perDay > AppConfig.freeReminderLimit ? (
              <T variant="caption" style={{ marginTop: space.sm }}>
                {`More than ${AppConfig.freeReminderLimit} a day is Premium.`}
              </T>
            ) : null}
          </View>
          <HourPicker
            label="Start"
            value={settings.reminders.startHour}
            options={[5, 6, 7, 8, 9, 10, 11, 12]}
            onChange={h => update({ reminders: { ...settings.reminders, startHour: h } })}
          />
          <HourPicker
            label="End"
            value={settings.reminders.endHour}
            options={[17, 18, 19, 20, 21, 22, 23, 24]}
            onChange={h => update({ reminders: { ...settings.reminders, endHour: h } })}
          />
        </StepBody>
      )}

      {step === 'theme' && (
        <StepBody title={ONBOARDING.theme.title} body={ONBOARDING.theme.body}>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: space.md }}>
            {THEMES.map(t => (
              <ThemeSwatch key={t.id} themeId={t.id} selected={settings.themeId === t.id} locked={!t.free && !premium} onPress={() => update({ themeId: t.id })} />
            ))}
          </View>
        </StepBody>
      )}

      {step === 'source' && (
        <StepBody title={ONBOARDING.source.title}>
          {ONBOARDING.source.options.map(o => (
            <Chip key={o.id} label={o.label} selected={settings.source === o.id} onPress={() => update({ source: o.id })} />
          ))}
        </StepBody>
      )}

      {step === 'notifications' && (
        <StepBody title={ONBOARDING.notifications.title} body={ONBOARDING.notifications.body}>
          <MockNotification />
        </StepBody>
      )}

      {step === 'rank' && (
        <View style={{ minHeight: 520, justifyContent: 'center', alignItems: 'center' }}>
          <RankEmblem rank={0} size={120} color={theme.text} />
          <T variant="title" center style={{ marginTop: space.xl }}>
            {ONBOARDING.rank.title}
          </T>
          <T variant="muted" center style={{ marginTop: space.md, maxWidth: 320 }}>
            {ONBOARDING.rank.body}
          </T>
        </View>
      )}
    </Screen>
  );
}

function StepBody({ title, body, children }: { title: string; body?: string; children: React.ReactNode }) {
  return (
    <View style={{ marginTop: space.xl, gap: space.sm }}>
      <T variant="title" style={{ marginBottom: body ? 0 : space.lg }}>
        {title}
      </T>
      {body ? (
        <T variant="muted" style={{ marginBottom: space.lg }}>
          {body}
        </T>
      ) : null}
      {children}
    </View>
  );
}

export function ThemeSwatch({ themeId, selected, onPress, locked }: { themeId: string; selected: boolean; onPress: () => void; locked?: boolean }) {
  const current = useTheme();
  const t = THEMES.find(x => x.id === themeId)!;
  return (
    <Pressable
      accessibilityRole="radio"
      accessibilityState={{ checked: selected }}
      accessibilityLabel={`${t.name} theme${t.free ? '' : ', Premium'}`}
      onPress={onPress}
      style={{
        width: '47%',
        height: 128,
        borderRadius: radius.md,
        overflow: 'hidden',
        backgroundColor: t.bg,
        borderWidth: selected ? 2 : 1,
        borderColor: selected ? current.accent : t.border,
        padding: space.md,
        justifyContent: 'space-between',
      }}>
      <TextureBackground texture={t.texture} />
      <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
        <View style={{ width: 18, height: 3, backgroundColor: t.accent, borderRadius: 2, marginTop: 6 }} />
        {(locked ?? !t.free) ? <Icon name="lock" size={14} color={t.muted} /> : null}
      </View>
      <Text style={{ color: t.text, fontFamily: fonts.serif, fontSize: 20, lineHeight: 22 }}>Do it tired.</Text>
      <Text style={{ color: t.muted, fontFamily: fonts.sansMedium, fontSize: 12 }}>{t.name}</Text>
    </Pressable>
  );
}

function MockNotification() {
  const theme = useTheme();
  return (
    <View
      style={{
        marginTop: space.md,
        backgroundColor: '#1c1c1e',
        borderRadius: 20,
        padding: space.lg,
        flexDirection: 'row',
        gap: space.md,
        alignItems: 'center',
      }}>
      <Image source={require('../../../assets/icon.png')} style={{ width: 38, height: 38, borderRadius: 9 }} />
      <View style={{ flex: 1 }}>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
          <Text style={{ color: '#fff', fontFamily: fonts.sansSemi, fontSize: 14 }}>{AppConfig.name}</Text>
          <Text style={{ color: '#8e8e93', fontFamily: fonts.sans, fontSize: 12 }}>now</Text>
        </View>
        <Text style={{ color: '#fff', fontFamily: fonts.sans, fontSize: 14, marginTop: 2 }}>
          {"Pick one non-negotiable today. Then don't negotiate."}
        </Text>
      </View>
      <View style={{ position: 'absolute', right: -6, top: -6, width: 12, height: 12, borderRadius: 6, backgroundColor: theme.accent }} />
    </View>
  );
}
