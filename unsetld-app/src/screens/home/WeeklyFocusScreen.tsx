// "What matters most this week?" (docs/UX_REDESIGN.md §3, §13): one choice for the week, which
// the plan leans toward (core/personalize activeFocus). Opened from Today's card and
// focus line, and from You. Never required: "Not this week" keeps the question away until Monday.
// "Something else" never dead-ends: words that name no area ask which area they're about
// (core/areaChoice), and text the app can't use (core/safety) gets one line and can't be set.
import { LinearGradient } from 'expo-linear-gradient';
import { useRef, useState } from 'react';
import { Platform, Pressable, ScrollView, TextInput, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { focusAreaChoices, focusNeedsArea } from '../../core/areaChoice';
import { focusFor } from '../../core/personalize';
import { focusChoices, weekStart } from '../../core/review';
import { settledCheck, usableText } from '../../core/safety';
import type { FocusId, TrackId } from '../../core/types';
import { MISSIONS, TRACK_BY_ID } from '../../content';
import { FOCUS } from '../../content/copy/focus';
import type { RootProps } from '../../navigation/types';
import { selection } from '../../services/haptics';
import { useApp } from '../../state/store';
import { Button, NavRow, PageTitle, Square, TextButton } from '../../ui/kit';
import { T } from '../../ui/text';
import { color as C, font, GAP, MARGIN, radius } from '../../ui/tokens';
import { SafetyNote } from '../../ui/SafetyNote';
import { useAnnounce } from '../../ui/useAnnounce';
import { useSettled } from '../../ui/useSettled';
import { Chip } from '../onboarding/TracksScreen';

/** iOS scrolls the focused field above the keyboard itself; the prop means nothing elsewhere. */
const KEYBOARD = Platform.OS === 'ios' ? { automaticallyAdjustKeyboardInsets: true } : undefined;
/** The browser draws its own focus ring around a text field; the field shows focus itself. */
const NO_RING = Platform.OS === 'web' ? { outlineWidth: 0 } : null;
/** Room for the fixed footer (button, text button, safe area) under the list. */
const FOOTER = 54 + 6 + 44 + 16;

function Option({ label, on, onPress }: { label: string; on: boolean; onPress: () => void }) {
  return (
    <Pressable
      accessibilityRole="radio"
      accessibilityLabel={label}
      // aria-checked rather than accessibilityState: react-native-web only reads the former.
      aria-checked={on}
      accessibilityState={{ checked: on }}
      onPress={onPress}
      style={({ pressed }) => ({
        minHeight: 56,
        paddingHorizontal: 18,
        paddingVertical: 14,
        flexDirection: 'row',
        alignItems: 'center',
        gap: 14,
        borderRadius: radius.card,
        borderWidth: 1,
        borderColor: on ? C.bone : 'transparent',
        backgroundColor: pressed ? C.cardPressed : C.card,
      })}>
      <Square on={on} />
      <T v="row" color={on ? C.bone : C.muted} style={{ flex: 1 }}>
        {label}
      </T>
    </Pressable>
  );
}

export function WeeklyFocusScreen({ navigation }: RootProps<'WeeklyFocus'>) {
  const day = useApp(s => s.currentDay);
  const week = weekStart(day);
  // This week's: set this week, or picked ahead in Sunday's review (kept aside until Monday).
  const saved = useApp(s => s.profile.focus);
  const ahead = useApp(s => s.profile.nextFocus);
  const current = focusFor({ focus: saved, nextFocus: ahead }, week);
  // Only options the user's answers can get missions for (brief §13), the one already set, and
  // "Something else": nothing about school for someone not in school.
  const profile = useApp(s => s.profile);
  const plannable = focusChoices(FOCUS.order, MISSIONS, profile);
  // The plannable ones (the user's own areas first), the one already set, then "Something else".
  const options = [...plannable, ...(current && current.id !== 'other' && !plannable.includes(current.id) ? [current.id] : []), 'other' as const];
  const [id, setId] = useState<FocusId | null>(current?.id ?? null);
  const [text, setText] = useState(current?.id === 'other' ? current.text ?? '' : '');
  // The area picked for what was typed: the saved one when the screen reopens.
  const [area, setArea] = useState<TrackId | null>(current?.id === 'other' ? current.area ?? null : null);
  const [typing, setTyping] = useState(false);
  const other = id === 'other';
  // Notes wait for a pause in typing; "Set this week" before the pause shows them at once.
  const [settled, settleNow] = useSettled(other ? text : '');
  const flagged = other ? settledCheck(text, settled, 'focus') : null;
  const refused = flagged !== null && flagged.level !== 'note';
  // Words that name no area: which area is it about? All eight the user can get missions in.
  const needsArea = other && focusNeedsArea(text);
  const asking = needsArea && !refused && focusNeedsArea(settled);
  const areas = focusAreaChoices(MISSIONS, profile);
  const picked = area && areas.includes(area) ? area : null;
  const usable = !other || (text.trim().length > 0 && usableText(text, 'focus'));
  const valid = Boolean(id) && usable && (!needsArea || picked !== null);
  // VoiceOver on iOS reads no live region: the question is said as it appears.
  useAnnounce(asking ? FOCUS.otherArea : null);
  const insets = useSafeAreaInsets();
  // "Something else" opens a field at the end of the list: bring it into view once it's laid out.
  const scroll = useRef<ScrollView>(null);
  // Also on opening with "Something else" already chosen, so the answer is in view.
  const [reveal, setReveal] = useState(current?.id === 'other');

  const choose = (next: FocusId) => {
    if (next === id) return;
    selection();
    setId(next);
    if (next === 'other') setReveal(true);
  };

  const set = () => {
    if (!id) return;
    // Text the app can't use, or words with no area picked yet: show why (at once), keep nothing.
    if (!valid) {
      if (other) settleNow();
      return;
    }
    selection();
    useApp.getState().setFocus(other ? { week, id, text: text.trim(), ...(needsArea && picked ? { area: picked } : {}) } : { week, id });
    navigation.goBack();
  };

  const chooseArea = (t: TrackId) => {
    if (t === area) return;
    selection();
    setArea(t);
  };

  const skip = () => {
    selection();
    useApp.getState().skipFocus(week);
    navigation.goBack();
  };

  // Clearing also keeps the question off Today for the rest of the week: they've just answered it.
  const clear = () => {
    selection();
    const s = useApp.getState();
    s.setFocus(null, week);
    s.skipFocus(week);
    navigation.goBack();
  };

  return (
    <View style={{ flex: 1, backgroundColor: C.ink }}>
      <NavRow onClose={() => navigation.goBack()} />
      <ScrollView
        ref={scroll}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
        {...KEYBOARD}
        onContentSizeChange={() => {
          if (!reveal) return;
          setReveal(false);
          scroll.current?.scrollToEnd({ animated: true });
        }}
        contentContainerStyle={{ paddingHorizontal: MARGIN, paddingBottom: FOOTER + insets.bottom + 24 }}>
        <PageTitle title={FOCUS.title} body={FOCUS.body} style={{ marginTop: 8 }} />
        <View accessibilityRole="radiogroup" accessibilityLabel={FOCUS.title} style={{ marginTop: GAP.block, gap: GAP.tight }}>
          {options.map(f => (
            <Option key={f} label={FOCUS.option(f, profile.gym)} on={id === f} onPress={() => choose(f)} />
          ))}
        </View>
        {other ? (
          <View style={{ marginTop: GAP.card }}>
            <TextInput
              value={text}
              onChangeText={setText}
              maxLength={FOCUS.otherMax}
              placeholder={FOCUS.otherPlaceholder}
              placeholderTextColor={C.stone}
              accessibilityLabel={FOCUS.otherA11y}
              autoFocus={!current || current.id !== 'other'}
              autoCapitalize="sentences"
              returnKeyType="done"
              onSubmitEditing={set}
              onFocus={() => setTyping(true)}
              onBlur={() => setTyping(false)}
              selectionColor={C.bone}
              style={[
                {
                  minHeight: 54,
                  paddingHorizontal: 18,
                  paddingVertical: 14,
                  borderRadius: radius.card,
                  borderWidth: 1,
                  borderColor: typing ? C.ruleStrong : 'transparent',
                  backgroundColor: C.card,
                  color: C.bone,
                  fontFamily: font.sans,
                  fontSize: 16,
                },
                NO_RING,
              ]}
            />
            <T v="mono.s" color={C.stone} align="right" style={{ marginTop: 8 }} accessibilityElementsHidden importantForAccessibility="no">
              {FOCUS.otherCount(text.length, FOCUS.otherMax)}
            </T>
            {/* Brought into view as they appear: they sit at the end of the list, behind the footer. */}
            <SafetyNote result={flagged} style={{ marginTop: 4 }} onLayout={() => scroll.current?.scrollToEnd({ animated: true })} />
            {asking ? (
              <View style={{ marginTop: 4 }} onLayout={() => scroll.current?.scrollToEnd({ animated: true })}>
                <T v="note" color={C.bone}>
                  {FOCUS.otherArea}
                </T>
                <View accessibilityRole="radiogroup" accessibilityLabel={FOCUS.otherArea} style={{ marginTop: 12, flexDirection: 'row', flexWrap: 'wrap', gap: GAP.tight }}>
                  {areas.map(t => {
                    const name = TRACK_BY_ID[t]?.short ?? t;
                    return <Chip key={t} title={name} label={name} on={picked === t} onPress={() => chooseArea(t)} />;
                  })}
                </View>
              </View>
            ) : null}
          </View>
        ) : null}
      </ScrollView>
      <View style={{ position: 'absolute', left: 0, right: 0, bottom: 0, pointerEvents: 'box-none' }}>
        <LinearGradient colors={['rgba(10,10,10,0)', C.ink]} style={{ height: 24, pointerEvents: 'none' }} />
        <View style={{ backgroundColor: C.ink, paddingHorizontal: MARGIN, paddingBottom: insets.bottom + 16 }}>
          {/* Pressable while the reason it can't be set is still waiting on a pause in typing: pressing shows it. */}
          <Button title={FOCUS.save} onPress={set} disabled={!id || (other && (!text.trim() || refused || (asking && !picked)))} />
          <TextButton title={current ? FOCUS.clear : FOCUS.skip} onPress={current ? clear : skip} style={{ marginTop: 6 }} />
        </View>
      </View>
    </View>
  );
}
