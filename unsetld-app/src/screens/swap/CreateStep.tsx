// Step 3, a mission of the user's own: what they'll do, its area, how they'll prove it (the
// same proof types and checks as every mission) and, for a timer, how long. What it earns in
// this spot is said before it's added, and it never earns more than the mission it replaces.
import { useState } from 'react';
import { ScrollView, TextInput, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { TRACK_BY_ID } from '../../content';
import { SWAP } from '../../content/copy/swap';
import { CUSTOM_PROOFS, CUSTOM_TIMER_MINUTES, CUSTOM_TITLE_MAX } from '../../core/custom';
import type { Mission, TrackId } from '../../core/types';
import { selection } from '../../services/haptics';
import { Button } from '../../ui/kit';
import { T } from '../../ui/text';
import { color as C, font, GAP, MARGIN, radius } from '../../ui/tokens';
import { Chip } from '../onboarding/TracksScreen';
import { draftFrom, draftInput, isTimed, ownEarns, sameAs, type OwnDraft } from './logic';
import { Back, GroupLabel, ROW, useKeyboardInset } from './parts';

const COPY = SWAP.create;

export function CreateStep({
  draft,
  onChange,
  recent,
  tracks,
  worth,
  note,
  onAdd,
  onBack,
}: {
  draft: OwnDraft;
  onChange: (next: OwnDraft) => void;
  /** Missions of their own from before, newest first (logic recentOwn). */
  recent: readonly Mission[];
  tracks: readonly TrackId[];
  /** What the mission being replaced is worth (logic slotWorth). */
  worth: number | null;
  /** Why the last try didn't go in, if it didn't. */
  note: string | null;
  onAdd: () => void;
  onBack: () => void;
}) {
  const insets = useSafeAreaInsets();
  const keyboard = useKeyboardInset();
  const [focused, setFocused] = useState(false);
  const input = draftInput(draft);
  const timed = isTimed(draft.proofType);
  const earns = ownEarns(draft.proofType, draft.minutes, worth);
  const length = draft.title.length;
  const set = (patch: Partial<OwnDraft>) => {
    selection();
    onChange({ ...draft, ...patch });
  };

  return (
    // The keyboard covers the bottom of the sheet: the button stays just above it.
    <View style={{ flex: 1, paddingBottom: keyboard }}>
      <ScrollView
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode="interactive"
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingHorizontal: MARGIN, paddingBottom: 16 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center' }}>
          <Back onPress={onBack} label={COPY.back} hint={COPY.backHint} />
          <T v="title.m" accessibilityRole="header" style={{ flexShrink: 1 }}>
            {COPY.title}
          </T>
        </View>

        {recent.length ? (
          <View accessibilityRole="radiogroup" accessibilityLabel={COPY.recent}>
            <GroupLabel>{COPY.recent}</GroupLabel>
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: GAP.tight }}>
              {recent.map(m => {
                const on = sameAs(m, input);
                return (
                  <Chip key={m.id} on={on} label={m.title} onPress={() => set(draftFrom(m, draft))} style={{ maxWidth: '100%' }}>
                    <T v="small" numberOfLines={1} color={on ? C.ink : C.muted} style={{ fontFamily: font.sansMedium }}>
                      {m.title}
                    </T>
                  </Chip>
                );
              })}
            </View>
          </View>
        ) : null}

        <TextInput
          value={draft.title}
          onChangeText={t => onChange({ ...draft, title: t.replace(/\n/g, ' ') })}
          maxLength={CUSTOM_TITLE_MAX}
          autoFocus
          placeholder={COPY.placeholder}
          placeholderTextColor={C.ash}
          accessibilityLabel={COPY.field}
          accessibilityHint={COPY.countA11y(length, CUSTOM_TITLE_MAX)}
          autoCapitalize="sentences"
          autoCorrect
          returnKeyType="done"
          submitBehavior="blurAndSubmit"
          onFocus={() => setFocused(true)}
          onBlur={() => setFocused(false)}
          maxFontSizeMultiplier={1.3}
          selectionColor={C.bone}
          cursorColor={C.bone}
          style={{
            marginTop: recent.length ? 16 : 22,
            minHeight: 52,
            paddingHorizontal: 16,
            paddingVertical: 14,
            borderRadius: radius.card,
            borderWidth: 1,
            borderColor: focused ? C.ruleStrong : 'transparent',
            backgroundColor: ROW,
            color: C.bone,
            fontFamily: font.sans,
            fontSize: 17,
            outlineWidth: 0,
          }}
        />
        <T
          v="mono"
          color={length >= CUSTOM_TITLE_MAX ? C.bone : C.stone}
          align="right"
          accessibilityElementsHidden
          importantForAccessibility="no"
          style={{ marginTop: 6 }}>
          {COPY.count(length, CUSTOM_TITLE_MAX)}
        </T>

        <View accessibilityRole="radiogroup" accessibilityLabel={COPY.area}>
          <GroupLabel>{COPY.area}</GroupLabel>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: GAP.tight }}>
            {tracks.map(t => {
              const name = TRACK_BY_ID[t]?.short ?? t;
              return <Chip key={t} title={name} label={name} on={draft.track === t} onPress={() => draft.track !== t && set({ track: t })} />;
            })}
          </View>
        </View>

        {/* Two by two: "Timer + photo" doesn't fit a quarter of a phone's width. */}
        <View accessibilityRole="radiogroup" accessibilityLabel={COPY.proofA11y}>
          <GroupLabel>{COPY.proof}</GroupLabel>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: GAP.tight }}>
            {CUSTOM_PROOFS.map(p => (
              <Chip
                key={p}
                title={COPY.proofLabel(p)}
                label={COPY.proofLabel(p)}
                on={draft.proofType === p}
                onPress={() => draft.proofType !== p && set({ proofType: p })}
                style={{ flexBasis: '40%', flexGrow: 1 }}
              />
            ))}
          </View>
        </View>

        {timed ? (
          <View accessibilityRole="radiogroup" accessibilityLabel={COPY.lengthA11y}>
            <GroupLabel>{COPY.length}</GroupLabel>
            <View style={{ flexDirection: 'row', gap: GAP.tight }}>
              {CUSTOM_TIMER_MINUTES.map(n => (
                <Chip
                  key={n}
                  title={COPY.minutes(n)}
                  label={COPY.minutesA11y(n)}
                  on={draft.minutes === n}
                  onPress={() => draft.minutes !== n && set({ minutes: n })}
                  style={{ flex: 1, minWidth: 0, paddingHorizontal: 4 }}
                />
              ))}
            </View>
          </View>
        ) : null}
      </ScrollView>

      <View style={{ paddingHorizontal: MARGIN, paddingTop: 10, paddingBottom: keyboard ? 12 : insets.bottom + 12, backgroundColor: C.raise }}>
        <T v="meta" color={C.stone} accessibilityLabel={COPY.earnsA11y(earns)}>
          {COPY.earns(earns)}
        </T>
        {note ? (
          <T v="note" color={C.muted} accessibilityLiveRegion="polite" style={{ marginTop: 6 }}>
            {note}
          </T>
        ) : null}
        <Button title={COPY.add} accessibilityLabel={COPY.add} disabled={!input} onPress={onAdd} style={{ marginTop: 12 }} />
      </View>
    </View>
  );
}
