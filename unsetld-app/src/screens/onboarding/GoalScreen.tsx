import { useEffect, useState } from 'react';
import { KeyboardAvoidingView, Platform, TextInput, View } from 'react-native';
import { goalLean } from '../../core/personalize';
import { GOAL_MAX, ONBOARDING } from '../../content/copy/onboarding';
import type { RootProps } from '../../navigation/types';
import { selection } from '../../services/haptics';
import { useApp } from '../../state/store';
import { Button, NavRow, PageTitle, Screen, TextButton } from '../../ui/kit';
import { T } from '../../ui/text';
import { color as C, font, GAP, radius } from '../../ui/tokens';
import { Chip, useProfileDraft } from './TracksScreen';

const COPY = ONBOARDING.goal;

/** One line, at most 80 characters, no stray spaces: what Profile.goal holds. Empty is null. */
function clean(text: string): string | null {
  const t = text.replace(/\s+/g, ' ').trim().slice(0, GOAL_MAX);
  return t.length ? t : null;
}

const steersNothing = (text: string) => {
  const lean = goalLean(text);
  return lean.areas.length === 0 && lean.tags.length === 0;
};

/**
 * True when what's typed matches nothing the plan can lean toward (core/personalize goalLean),
 * so the screen says so rather than promise a lean. It waits for a pause in typing, so a
 * half-typed word ("gy") or a thumb's pause between words ("Get a … better job") doesn't
 * flash the note; a match hides it at once. Also used by "Something else" on the weekly focus.
 */
export function useSteersNothing(text: string): boolean {
  const [settled, setSettled] = useState(text);
  useEffect(() => {
    // Emptied (Clear, or every letter deleted) starts over at once, so a note for the old
    // words can't flash on the first letter of new ones.
    const t = setTimeout(() => setSettled(text), text.trim() ? 1200 : 0);
    return () => clearTimeout(t);
  }, [text]);
  return Boolean(text.trim() && settled.trim()) && steersNothing(text) && steersNothing(settled);
}

/**
 * Onboarding step 4, and You › What you're working toward. Optional: a few words of
 * their own, or one of the examples to start from. The plan engine reads it
 * (core/personalize) to lean missions toward it.
 */
export function GoalScreen({ navigation, route }: RootProps<'Goal'>) {
  const edit = Boolean(route.params?.edit);
  const { value, save } = useProfileDraft(edit);
  const [text, setText] = useState(() => value.goal ?? '');
  const [focused, setFocused] = useState(false);

  /** Onboarding: write the answer, build today's plan around it (the reminder preview names it), then Reminders. */
  const finish = (goal: string | null) => {
    if (edit) {
      save({ goal });
      navigation.goBack();
      return;
    }
    const s = useApp.getState();
    s.setProfile({ goal });
    s.replanToday();
    navigation.navigate('Day');
  };

  const fillWith = (example: string) => {
    selection();
    setText(example);
  };

  const length = text.length;
  const noMatch = useSteersNothing(text);

  return (
    <KeyboardAvoidingView style={{ flex: 1, backgroundColor: C.ink }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <Screen
        nav={<NavRow onBack={() => navigation.goBack()} step={edit ? undefined : ONBOARDING.step(4)} />}
        footer={
          edit ? (
            <Button title={ONBOARDING.save} onPress={() => finish(clean(text))} />
          ) : (
            <View>
              <Button title={ONBOARDING.continue} onPress={() => finish(clean(text))} />
              <TextButton title={ONBOARDING.skip} style={{ marginTop: 8 }} onPress={() => finish(null)} />
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
          onSubmitEditing={() => finish(clean(text))}
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
            <TextButton title={COPY.clear} align="left" onPress={() => setText('')} style={{ paddingRight: 12 }} />
          ) : (
            <View />
          )}
          <T v="mono" color={length >= GOAL_MAX ? C.bone : C.stone} accessibilityElementsHidden importantForAccessibility="no">
            {COPY.count(length)}
          </T>
        </View>
        {noMatch ? (
          <T v="note" color={C.muted} accessibilityLiveRegion="polite" style={{ marginBottom: GAP.tight }}>
            {COPY.noMatch}
          </T>
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
