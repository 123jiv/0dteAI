// Step 3, a mission of the user's own: what they'll do, its area, how they'll prove it (the
// same proof types and checks as every mission) and, for a timer, how long. What it earns in
// this spot is said before it's added, and it never earns more than the mission it replaces.
// While they type, the field stays in view above the keyboard and the pinned button. A title
// the app can't use (core/safety) gets one line after a pause in typing, and can't be added.
import { useRef, useState } from 'react';
import { ScrollView, TextInput, View, type LayoutRectangle } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { TRACK_BY_ID } from '../../content';
import { SWAP } from '../../content/copy/swap';
import { CUSTOM_PROOFS, CUSTOM_TIMER_MINUTES, CUSTOM_TITLE_MAX } from '../../core/custom';
import { settledCheck } from '../../core/safety';
import type { Mission, TrackId } from '../../core/types';
import { selection } from '../../services/haptics';
import { Button } from '../../ui/kit';
import { SafetyNote } from '../../ui/SafetyNote';
import { T } from '../../ui/text';
import { color as C, font, GAP, MARGIN, radius } from '../../ui/tokens';
import { useSettled } from '../../ui/useSettled';
import { Chip } from '../onboarding/TracksScreen';
import { draftFrom, draftInput, isTimed, ownEarns, sameAs, type OwnDraft } from './logic';
import { Back, GroupLabel, ROW, SHEET_GRABBER, useKeyboardInset } from './parts';

const COPY = SWAP.create;

export function CreateStep({
  draft,
  onChange,
  recent,
  tracks,
  worth,
  sheetHeight,
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
  /** The sheet's height in points, to know what the keyboard hides of it. */
  sheetHeight: number;
  /** Why the last try didn't go in, if it didn't. */
  note: string | null;
  onAdd: () => void;
  onBack: () => void;
}) {
  const insets = useSafeAreaInsets();
  const cut = useKeyboardInset(sheetHeight);
  const [focused, setFocused] = useState(false);
  const input = draftInput(draft);
  // What the title gets said about it, once typing pauses (null for most).
  const [settled] = useSettled(draft.title);
  const flagged = settledCheck(draft.title, settled, 'mission');
  const timed = isTimed(draft.proofType);
  const earns = ownEarns(draft.proofType, draft.minutes, worth);
  const length = draft.title.length;
  const set = (patch: Partial<OwnDraft>) => {
    selection();
    onChange({ ...draft, ...patch });
  };

  // Where the field is in the form, how much of the form shows, and how far it's scrolled.
  const scroller = useRef<ScrollView>(null);
  const field = useRef<LayoutRectangle | null>(null);
  const shown = useRef(0);
  const offset = useRef(0);
  const typing = useRef(false);
  /** While they type, scrolls just enough to show the whole field. */
  const reveal = () => {
    const f = field.current;
    const h = shown.current;
    if (!typing.current || !f || !h) return;
    const at = offset.current;
    const top = Math.max(0, f.y - 12);
    const bottom = f.y + f.height + 12 - h;
    const to = at > top ? top : at < bottom ? Math.min(top, bottom) : at;
    if (to !== at) scroller.current?.scrollTo({ y: to, animated: true });
  };

  return (
    // The keyboard covers the bottom of the sheet: the button stays just above it. In a browser
    // that shortens the page instead, the top goes above the screen: the form starts below that.
    <View style={{ flex: 1, paddingTop: Math.max(0, cut.top - SHEET_GRABBER), paddingBottom: cut.bottom }}>
      <ScrollView
        ref={scroller}
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode="interactive"
        showsVerticalScrollIndicator={false}
        scrollEventThrottle={32}
        onScroll={e => (offset.current = e.nativeEvent.contentOffset.y)}
        // The keyboard came or went: the form shows less or more of itself.
        onLayout={e => {
          shown.current = e.nativeEvent.layout.height;
          reveal();
        }}
        contentContainerStyle={{ paddingHorizontal: MARGIN, paddingBottom: 16 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center' }}>
          <Back onPress={onBack} label={COPY.back} hint={COPY.backHint} />
          <T v="title.m" accessibilityRole="header" style={{ flexShrink: 1 }}>
            {COPY.title}
          </T>
        </View>

        {/* One row however long the titles, so the field stays high in the sheet. */}
        {recent.length ? (
          <View accessibilityRole="radiogroup" accessibilityLabel={COPY.recent}>
            <GroupLabel>{COPY.recent}</GroupLabel>
            <ScrollView
              horizontal
              keyboardShouldPersistTaps="handled"
              showsHorizontalScrollIndicator={false}
              style={{ marginHorizontal: -MARGIN }}
              contentContainerStyle={{ paddingHorizontal: MARGIN, gap: GAP.tight }}>
              {recent.map(m => {
                const on = sameAs(m, input);
                return (
                  <Chip key={m.id} on={on} label={m.title} onPress={() => set(draftFrom(m, draft))} style={{ maxWidth: 240 }}>
                    <T v="small" numberOfLines={1} color={on ? C.ink : C.muted} style={{ fontFamily: font.sansMedium }}>
                      {m.title}
                    </T>
                  </Chip>
                );
              })}
            </ScrollView>
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
          onLayout={e => (field.current = e.nativeEvent.layout)}
          onFocus={() => {
            typing.current = true;
            setFocused(true);
            reveal();
          }}
          onBlur={() => {
            typing.current = false;
            setFocused(false);
          }}
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

      <View style={{ paddingHorizontal: MARGIN, paddingTop: 10, paddingBottom: cut.bottom ? 12 : insets.bottom + 12, backgroundColor: C.raise }}>
        <T v="meta" color={C.stone} accessibilityLabel={COPY.earnsA11y(earns)}>
          {COPY.earns(earns)}
        </T>
        {note ? (
          <T v="note" color={C.muted} accessibilityLiveRegion="polite" style={{ marginTop: 6 }}>
            {note}
          </T>
        ) : (
          <SafetyNote result={flagged} style={{ marginTop: 6 }} />
        )}
        <Button title={COPY.add} accessibilityLabel={COPY.add} disabled={!input} onPress={onAdd} style={{ marginTop: 12 }} />
      </View>
    </View>
  );
}
