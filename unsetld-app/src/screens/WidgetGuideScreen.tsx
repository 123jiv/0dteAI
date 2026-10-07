import { useEffect, useState } from 'react';
import { Pressable, Text, View } from 'react-native';
import { AppConfig } from '../config/app';
import { buildPool, dailyLine } from '../core/lines';
import { LINES } from '../content';
import type { RootProps } from '../navigation/types';
import { today } from '../services/clock';
import { useApp, useEntitlements } from '../state/store';
import { Button, Header, Screen, T } from '../ui/components';
import { fonts, radius, space, useTheme } from '../ui/theme';

type Mode = 'lock' | 'home';

const STEPS: Record<Mode, { title: string; body: string }[]> = {
  lock: [
    { title: 'Press and hold your Lock Screen', body: 'Unlock with Face ID first, then press and hold anywhere on the wallpaper.' },
    { title: 'Tap Customize, then Lock Screen', body: 'Pick the Lock Screen side, not Home Screen.' },
    { title: 'Tap the box under the clock', body: 'That row is where widgets live.' },
    { title: `Find ${AppConfig.name}`, body: 'Scroll the list or search. Tap the wide rectangle to add today\'s line.' },
    { title: 'Tap Done', body: 'Every unlock now shows your line. It changes at midnight.' },
  ],
  home: [
    { title: 'Press and hold an empty spot', body: 'On your Home Screen, until the apps start to jiggle.' },
    { title: 'Tap Edit, then Add Widget', body: 'Edit is in the top-left corner.' },
    { title: `Search ${AppConfig.name}`, body: 'Tap it in the list.' },
    { title: 'Pick a size and tap Add Widget', body: 'Small shows the line. Medium adds your streak and rank.' },
    { title: 'Tap Done', body: 'Drag it next to the apps you open most.' },
  ],
};

export function WidgetGuideScreen({ navigation, route }: RootProps<'WidgetGuide'>) {
  const theme = useTheme();
  const fromOnboarding = route.params?.from === 'onboarding';
  const completeOnboarding = useApp(s => s.completeOnboarding);
  const update = useApp(s => s.updateSettings);
  const [mode, setMode] = useState<Mode>('lock');
  const [step, setStep] = useState(0);
  const steps = STEPS[mode];

  // Auto-advance the highlighted step so the guide plays like a short video.
  useEffect(() => {
    const t = setInterval(() => setStep(s => (s + 1) % steps.length), 2600);
    return () => clearInterval(t);
  }, [steps.length, mode]);

  const finish = () => {
    update({ widgetGuideSeen: true });
    if (fromOnboarding) {
      completeOnboarding({});
      navigation.reset({ index: 0, routes: [{ name: 'Main' }] });
    } else navigation.goBack();
  };

  return (
    <Screen
      scroll
      footer={
        <View style={{ gap: space.sm }}>
          <Button title={mode === 'lock' ? 'Next: Home Screen widget' : fromOnboarding ? "Done. Show me today's line" : 'Done'} onPress={() => (mode === 'lock' ? (setMode('home'), setStep(0)) : finish())} />
          {mode === 'lock' ? <Button title={fromOnboarding ? 'Skip for now' : 'Close'} variant="ghost" onPress={finish} /> : null}
        </View>
      }>
      {!fromOnboarding ? <Header title="Add the widget" onBack={() => navigation.goBack()} /> : <View style={{ height: space.lg }} />}
      <T variant="label" color={theme.accent}>
        {mode === 'lock' ? 'Step 1 of 2 · Lock Screen' : 'Step 2 of 2 · Home Screen'}
      </T>
      <T variant="title" style={{ marginTop: space.sm }}>
        {mode === 'lock' ? 'Put it where you look 100 times a day.' : 'Now your Home Screen.'}
      </T>

      <View style={{ flexDirection: 'row', gap: space.sm, marginTop: space.lg }}>
        {(['lock', 'home'] as Mode[]).map(m => (
          <Pressable
            key={m}
            accessibilityRole="tab"
            accessibilityState={{ selected: mode === m }}
            onPress={() => {
              setMode(m);
              setStep(0);
            }}
            style={{
              flex: 1,
              paddingVertical: 10,
              borderRadius: radius.pill,
              alignItems: 'center',
              backgroundColor: mode === m ? theme.text : theme.surface,
              borderWidth: 1,
              borderColor: theme.border,
            }}>
            <Text style={{ fontFamily: fonts.sansSemi, fontSize: 13, color: mode === m ? theme.bg : theme.text }}>
              {m === 'lock' ? 'Lock Screen' : 'Home Screen'}
            </Text>
          </Pressable>
        ))}
      </View>

      <PhoneMock mode={mode} step={step} />

      <View style={{ marginTop: space.xl, gap: space.sm }}>
        {steps.map((s, i) => (
          <Pressable
            key={s.title}
            onPress={() => setStep(i)}
            accessibilityLabel={`Step ${i + 1}. ${s.title}. ${s.body}`}
            style={{
              flexDirection: 'row',
              gap: space.md,
              padding: space.md,
              borderRadius: radius.md,
              backgroundColor: i === step ? theme.surface : 'transparent',
              borderWidth: 1,
              borderColor: i === step ? theme.border : 'transparent',
            }}>
            <View
              style={{
                width: 26,
                height: 26,
                borderRadius: 13,
                backgroundColor: i === step ? theme.accent : theme.surface,
                alignItems: 'center',
                justifyContent: 'center',
              }}>
              <Text style={{ color: i === step ? theme.onAccent : theme.muted, fontFamily: fonts.sansSemi, fontSize: 13 }}>{i + 1}</Text>
            </View>
            <View style={{ flex: 1 }}>
              <T variant="body" style={{ fontFamily: fonts.sansSemi }}>
                {s.title}
              </T>
              <T variant="caption">{s.body}</T>
            </View>
          </Pressable>
        ))}
      </View>
    </Screen>
  );
}

/** A drawn iPhone showing where the widget goes, highlighting the current step. */
function PhoneMock({ mode, step }: { mode: Mode; step: number }) {
  const theme = useTheme();
  const ent = useEntitlements();
  const settings = useApp(s => s.settings);
  const salt = useApp(s => s.progress.installSalt);
  const pool = buildPool(LINES, { lanes: ent.lanes, tone: settings.tone, cleanOnly: settings.lockScreenClean });
  const line = dailyLine(pool, salt, today())?.text ?? 'Pick one non-negotiable today. Then don\'t negotiate.';
  const highlight = theme.accent;
  const glow = (on: boolean) => (on ? { borderColor: highlight, borderWidth: 2 } : { borderColor: 'transparent', borderWidth: 2 });

  return (
    <View style={{ alignItems: 'center', marginTop: space.xl }}>
      <View
        style={{
          width: 230,
          height: 440,
          borderRadius: 38,
          borderWidth: 6,
          borderColor: '#222',
          backgroundColor: '#15161a',
          overflow: 'hidden',
          padding: 14,
        }}>
        {mode === 'lock' ? (
          <View style={{ flex: 1, alignItems: 'center' }}>
            {step === 1 ? (
              <View style={{ position: 'absolute', bottom: 30, flexDirection: 'row', gap: 8 }}>
                <View style={{ paddingHorizontal: 12, paddingVertical: 6, borderRadius: 14, backgroundColor: '#2c2c2e', ...glow(true) }}>
                  <Text style={{ color: '#fff', fontSize: 10, fontFamily: fonts.sansSemi }}>Customize</Text>
                </View>
              </View>
            ) : null}
            <Text style={{ color: '#d0d4dc', fontFamily: fonts.sansMedium, fontSize: 11, marginTop: 18 }}>Wednesday, October 7</Text>
            <Text style={{ color: '#eef1f6', fontFamily: fonts.sansBold, fontSize: 64, lineHeight: 70 }}>9:41</Text>
            <View
              style={{
                marginTop: 6,
                width: '100%',
                minHeight: 58,
                borderRadius: 14,
                padding: 8,
                backgroundColor: step >= 3 ? 'rgba(255,255,255,0.08)' : 'rgba(255,255,255,0.04)',
                ...glow(step === 2 || step === 3),
                justifyContent: 'center',
              }}>
              {step >= 3 ? (
                <Text style={{ color: '#f2f2f2', fontFamily: fonts.serif, fontSize: 14, lineHeight: 17 }} numberOfLines={3}>
                  {line}
                </Text>
              ) : (
                <Text style={{ color: '#8a8f99', fontFamily: fonts.sans, fontSize: 10, textAlign: 'center' }}>+ Add widgets</Text>
              )}
            </View>
            {step === 0 ? <PressHint /> : null}
            {step === 4 ? (
              <View style={{ position: 'absolute', top: 2, right: 2, paddingHorizontal: 10, paddingVertical: 4, borderRadius: 12, backgroundColor: '#2c2c2e', ...glow(true) }}>
                <Text style={{ color: '#fff', fontSize: 10, fontFamily: fonts.sansSemi }}>Done</Text>
              </View>
            ) : null}
          </View>
        ) : (
          <View style={{ flex: 1 }}>
            {step === 1 || step === 4 ? (
              <View style={{ position: 'absolute', top: 0, left: step === 1 ? 0 : undefined, right: step === 4 ? 0 : undefined, paddingHorizontal: 10, paddingVertical: 4, borderRadius: 12, backgroundColor: '#2c2c2e', ...glow(true) }}>
                <Text style={{ color: '#fff', fontSize: 10, fontFamily: fonts.sansSemi }}>{step === 1 ? 'Edit' : 'Done'}</Text>
              </View>
            ) : null}
            <View style={{ marginTop: 32, flexDirection: 'row', flexWrap: 'wrap', gap: 12 }}>
              <View
                style={{
                  width: 182,
                  height: 86,
                  borderRadius: 18,
                  backgroundColor: step >= 3 ? ent.theme.bg : 'rgba(255,255,255,0.05)',
                  padding: 10,
                  justifyContent: 'space-between',
                  ...glow(step === 2 || step === 3),
                }}>
                {step >= 3 ? (
                  <>
                    <Text style={{ color: ent.theme.accent, fontFamily: fonts.sansSemi, fontSize: 7, letterSpacing: 1 }}>TODAY</Text>
                    <Text style={{ color: ent.theme.text, fontFamily: fonts.serif, fontSize: 13, lineHeight: 15 }} numberOfLines={3}>
                      {line}
                    </Text>
                  </>
                ) : (
                  <Text style={{ color: '#8a8f99', fontFamily: fonts.sans, fontSize: 10, textAlign: 'center', marginTop: 28 }}>
                    {step === 2 ? `Search "${AppConfig.name}"` : ''}
                  </Text>
                )}
              </View>
              {Array.from({ length: 12 }).map((_, i) => (
                <View key={i} style={{ width: 37, height: 37, borderRadius: 9, backgroundColor: i % 3 === 0 ? '#2c2c2e' : '#24252a' }} />
              ))}
            </View>
            {step === 0 ? <PressHint /> : null}
            <View style={{ position: 'absolute', bottom: 2, left: 0, right: 0, height: 52, borderRadius: 18, backgroundColor: 'rgba(255,255,255,0.06)' }} />
          </View>
        )}
      </View>
    </View>
  );
}

function PressHint() {
  const theme = useTheme();
  return (
    <View style={{ position: 'absolute', top: '58%', alignSelf: 'center', alignItems: 'center' }}>
      <View style={{ width: 44, height: 44, borderRadius: 22, borderWidth: 2, borderColor: theme.accent, backgroundColor: `${theme.accent}33` }} />
      <Text style={{ color: '#fff', fontFamily: fonts.sansSemi, fontSize: 10, marginTop: 6 }}>Press and hold</Text>
    </View>
  );
}
