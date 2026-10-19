import { useState } from 'react';
import { KeyboardAvoidingView, Platform, TextInput, View } from 'react-native';
import { goalAreaToSave, goalQuestion } from '../../core/areaChoice';
import { settledCheck, usableText } from '../../core/safety';
import type { TrackId } from '../../core/types';
import { MISSIONS, TRACK_BY_ID } from '../../content';
import { GOAL_MAX, ONBOARDING } from '../../content/copy/onboarding';
import type { RootProps } from '../../navigation/types';
import { selection } from '../../services/haptics';
import { useApp } from '../../state/store';
import { Button, NavRow, PageTitle, Screen, TextButton } from '../../ui/kit';
import { SafetyNote } from '../../ui/SafetyNote';
import { T } from '../../ui/text';
import { color as C, font, GAP, radius } from '../../ui/tokens';
import { useAnnounce } from '../../ui/useAnnounce';
import { useSettled } from '../../ui/useSettled';
import { Chip, useProfileDraft } from './TracksScreen';

const COPY = ONBOARDING.goal;

/** One line, at most 80 characters, no stray spaces: what Profile.goal holds. Empty is null. */
function clean(text: string): string | null {
  const t = text.replace(/\s+/g, ' ').trim().slice(0, GOAL_MAX);
  return t.length ? t : null;
}

/**
 * Onboarding's last step, and You › What you're working toward. Optional: a few words of
 * their own, or one of the examples to start from. The plan engine reads it
 * (core/personalize) to lean missions toward it. When the words reach none of the user's
 * areas, it asks which one the goal is about (core/areaChoice) and keeps the answer beside
 * the text; text the app can't use (core/safety) gets one line and can't be saved.
 */
export function GoalScreen({ navigation, route }: RootProps<'Goal'>) {
  const edit = Boolean(route.params?.edit);
  const { value, save } = useProfileDraft(edit);
  const day = useApp(s => s.currentDay);
  const [text, setText] = useState(() => value.goal ?? '');
  const [pick, setPick] = useState<TrackId | null>(() => value.goalArea ?? null);
  const [focused, setFocused] = useState(false);
  // Notes wait for a pause in typing; Continue before the pause shows them at once.
  const [settled, settleNow] = useSettled(text);

  // One line about the text itself (support, then block, then a note), checked as typed.
  const flagged = settledCheck(text, settled, 'goal');
  const refused = flagged !== null && flagged.level !== 'note';
  // Then, for words that reach none of the user's areas: which one is it about?
  const question = goalQuestion(MISSIONS, value, text, day);
  const asking = !refused && question.ask && goalQuestion(MISSIONS, value, settled, day).ask;
  const outside = asking && question.outside ? COPY.outside(TRACK_BY_ID[question.outside]?.short ?? question.outside) : null;
  // VoiceOver on iOS reads no live region: the question is said as it appears.
  useAnnounce(asking ? [outside, COPY.area].filter(Boolean).join(' ') : null);

  /**
   * Onboarding ends here: the answer is written, today's plan is built around it, and Today
   * opens with the tabs (no reminders step: Today offers them after the first proof).
   */
  const finish = (goal: string | null, goalArea: TrackId | null) => {
    if (edit) {
      save({ goal, goalArea });
      navigation.goBack();
      return;
    }
    const s = useApp.getState();
    s.setProfile({ goal, goalArea });
    s.replanToday();
    s.completeOnboarding(false);
    navigation.reset({ index: 0, routes: [{ name: 'Main' }] });
  };

  /** Continue, Save and Return: not with text the app can't use, and the area question shows before the goal is kept. */
  const submit = () => {
    if (!usableText(text, 'goal')) {
      settleNow();
      return;
    }
    if (question.ask && !asking) {
      settleNow();
      return;
    }
    finish(clean(text), goalAreaToSave(question, pick));
  };

  const fillWith = (example: string) => {
    selection();
    setText(example);
  };

  const choose = (area: TrackId) => {
    if (area === pick) return;
    selection();
    setPick(area);
  };

  const length = text.length;

  return (
    <KeyboardAvoidingView style={{ flex: 1, backgroundColor: C.ink }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <Screen
        nav={<NavRow onBack={() => navigation.goBack()} step={edit ? undefined : ONBOARDING.step(4)} />}
        footer={
          edit ? (
            <Button title={ONBOARDING.save} onPress={submit} disabled={refused} />
          ) : (
            <View>
              <Button title={ONBOARDING.continue} onPress={submit} disabled={refused} />
              <TextButton title={ONBOARDING.skip} style={{ marginTop: 8 }} onPress={() => finish(null, null)} />
            </View>
          )
        }>
        <PageTitle title={COPY.title} body={COPY.body} />
        <TextInput
          value={text}
          onChangeText={t => setText(t.replace(/\n/g, ' '))}
          maxLength={GOAL_MAX}
          // Wraps so a whole goal stays readable; Return still submits (submitBehavior) and newlines are dropped.
          multiline
          scrollEnabled={false}
          placeholder={COPY.placeholder}
          placeholderTextColor={C.ash}
          accessibilityLabel={COPY.a11yInput}
          accessibilityHint={COPY.a11yCount(length)}
          autoCapitalize="sentences"
          returnKeyType="done"
          submitBehavior="blurAndSubmit"
          onSubmitEditing={submit}
          onFocus={() => setFocused(true)}
          onBlur={() => setFocused(false)}
          maxFontSizeMultiplier={1.3}
          selectionColor={C.bone}
          cursorColor={C.bone}
          style={{
            marginTop: 28,
            minHeight: 56,
            paddingHorizontal: 16,
            paddingVertical: 14,
            borderRadius: radius.card,
            borderWidth: 1,
            borderColor: focused ? C.ruleStrong : 'transparent',
            backgroundColor: C.card,
            color: C.bone,
            fontFamily: font.sans,
            fontSize: 17,
            outlineWidth: 0,
          }}
        />
        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', minHeight: 44 }}>
          {length ? (
            <TextButton
              title={COPY.clear}
              align="left"
              onPress={() => {
                setText('');
                setPick(null);
              }}
              style={{ paddingRight: 12 }}
            />
          ) : (
            <View />
          )}
          <T v="mono" color={length >= GOAL_MAX ? C.bone : C.stone} accessibilityElementsHidden importantForAccessibility="no">
            {COPY.count(length)}
          </T>
        </View>
        <SafetyNote result={flagged} style={{ marginBottom: GAP.tight }} />
        {asking ? (
          <View style={{ marginBottom: GAP.block }}>
            {outside ? (
              <T v="note" color={C.muted} style={{ marginBottom: 4 }}>
                {outside}
              </T>
            ) : null}
            <T v="note" color={C.bone}>
              {COPY.area}
            </T>
            <View accessibilityRole="radiogroup" accessibilityLabel={COPY.area} style={{ marginTop: 12, flexDirection: 'row', flexWrap: 'wrap', gap: GAP.tight }}>
              {question.choices.map(t => {
                const name = TRACK_BY_ID[t]?.short ?? t;
                return <Chip key={t} title={name} label={name} on={pick === t} onPress={() => choose(t)} />;
              })}
            </View>
          </View>
        ) : null}

        <T v="note" color={C.stone} style={{ marginTop: GAP.tight }}>
          {COPY.examplesLabel}
        </T>
        <View style={{ marginTop: 12, flexDirection: 'row', flexWrap: 'wrap', gap: GAP.tight }}>
          {COPY.examples.map(e => (
            <Chip key={e} role="button" title={e} label={COPY.a11yExample(e)} on={text.trim() === e} onPress={() => fillWith(e)} />
          ))}
        </View>
      </Screen>
    </KeyboardAvoidingView>
  );
}
