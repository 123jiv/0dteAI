import { Pressable, ScrollView, View } from 'react-native';
import type { ChapterId } from '../../core/types';
import { CHAPTER_BY_ID, CHAPTERS, LINES, VOLUME } from '../../content';
import { COPY } from '../../content/copy';
import { selection } from '../../services/haptics';
import { useApp, useEntitlements } from '../../state/store';
import { showActions } from '../../ui/actions';
import { Square } from '../../ui/kit';
import { Sheet } from '../../ui/Sheet';
import { T } from '../../ui/text';
import { color as C, hairline, MARGIN } from '../../ui/tokens';

/** Chapters: where the daily task and lines come from. */
export function ChaptersSheet({
  visible,
  onClose,
  onSaved,
  onYourLines,
  onFull,
}: {
  visible: boolean;
  onClose: () => void;
  onSaved: () => void;
  onYourLines: () => void;
  onFull: () => void;
}) {
  const ent = useEntitlements();
  const settings = useApp(s => s.settings);
  const update = useApp(s => s.updateSettings);
  const saved = useApp(s => s.reading.saved.length);
  const yours = useApp(s => s.yourLines.length);

  const locked = (id: ChapterId) => !ent.premium && id !== 'discipline' && id !== settings.freeChapter;

  const lockedMenu = (id: ChapterId) => {
    const name = CHAPTER_BY_ID[id].name;
    showActions({
      title: COPY.chapters.lockedTitle(name),
      options: [
        {
          label: COPY.chapters.makeFree(name),
          onPress: () => {
            selection();
            update({ freeChapter: id, chapters: [...new Set<ChapterId>([...settings.chapters, id])] });
          },
        },
        { label: COPY.chapters.seeFull, onPress: onFull },
        { label: COPY.chapters.cancel, cancel: true },
      ],
    });
  };

  const toggle = (id: ChapterId) => {
    if (id === 'discipline') return;
    if (locked(id)) return lockedMenu(id);
    if (!ent.premium) return; // the free chapter stays on; swap it from a locked row
    selection();
    const on = settings.chapters.includes(id);
    update({ chapters: on ? settings.chapters.filter(c => c !== id) : [...settings.chapters, id] });
  };

  return (
    <Sheet visible={visible} onClose={onClose} detent={0.92} accessibilityLabel={COPY.chapters.sheetTitle}>
      <ScrollView contentContainerStyle={{ paddingBottom: 48 }} showsVerticalScrollIndicator={false}>
        <View style={{ paddingHorizontal: MARGIN, flexDirection: 'row', alignItems: 'baseline', justifyContent: 'space-between', marginTop: 8 }}>
          <T v="title.m" style={{ fontSize: 34, lineHeight: 38 }} accessibilityRole="header">
            {COPY.chapters.sheetTitle}
          </T>
          <T v="mono">{COPY.chapters.sheetHeader(VOLUME, LINES.length)}</T>
        </View>

        <T v="note" color={C.stone} style={{ marginHorizontal: MARGIN, marginTop: 8, marginBottom: 16 }}>
          {COPY.chapters.sheetNote}
        </T>

        <View style={{ marginHorizontal: MARGIN }}>
          {CHAPTERS.map((c, i) => {
            const isLocked = locked(c.id);
            const on = c.id === 'discipline' || (ent.premium ? settings.chapters.includes(c.id) : c.id === settings.freeChapter);
            return (
              <View
                key={c.id}
                style={{
                  minHeight: 60,
                  flexDirection: 'row',
                  alignItems: 'center',
                  borderTopWidth: hairline,
                  borderBottomWidth: i === CHAPTERS.length - 1 ? hairline : 0,
                  borderColor: C.rule,
                }}>
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel={`${c.name}. ${c.scope}${isLocked ? ' Full Edition.' : ''}`}
                  onPress={() => toggle(c.id)}
                  style={({ pressed }) => ({ flex: 1, flexDirection: 'row', alignItems: 'center', paddingVertical: 8, opacity: pressed ? 0.6 : 1 })}>
                  <T v="mono" style={{ width: 40 }}>
                    {String(c.no).padStart(2, '0')}
                  </T>
                  <View style={{ flex: 1 }}>
                    <T v="list" color={isLocked ? C.muted : C.bone}>
                      {c.name}
                    </T>
                    <T v="note" color={C.stone}>
                      {c.scope}
                    </T>
                  </View>
                </Pressable>
                <Pressable
                  accessibilityRole="checkbox"
                  accessibilityLabel={`${c.name} in the mix`}
                  accessibilityState={{ checked: on, disabled: c.id === 'discipline' }}
                  onPress={() => toggle(c.id)}
                  // A fixed 64 column, so the scope keeps its width on every row. 'FULL EDITION'
                  // sits on two lines in it; each word fits 64.
                  style={{ width: 64, height: 60, alignItems: 'flex-end', justifyContent: 'center' }}>
                  {c.id === 'discipline' ? (
                    <T v="label" align="right" numberOfLines={1} adjustsFontSizeToFit>
                      {COPY.chapters.always}
                    </T>
                  ) : isLocked ? (
                    <T v="label" align="right" numberOfLines={2} adjustsFontSizeToFit>
                      {COPY.chapters.locked}
                    </T>
                  ) : (
                    <Square on={on} />
                  )}
                </Pressable>
              </View>
            );
          })}
        </View>

        <View style={{ marginTop: 32, marginHorizontal: MARGIN }}>
          <Pressable
            accessibilityRole="button"
            onPress={() => {
              onClose();
              onSaved();
            }}
            style={{ height: 52, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', borderTopWidth: hairline, borderTopColor: C.rule }}>
            <T v="row">{COPY.chapters.saved}</T>
            <T v="mono">{String(saved)}</T>
          </Pressable>
          <Pressable
            accessibilityRole="button"
            onPress={() => {
              onClose();
              onYourLines();
            }}
            style={{ height: 52, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', borderTopWidth: hairline, borderBottomWidth: hairline, borderColor: C.rule }}>
            <T v="row">{COPY.chapters.yourLines}</T>
            {ent.premium ? <T v="mono">{String(yours)}</T> : <T v="label">{COPY.chapters.locked}</T>}
          </Pressable>
        </View>
      </ScrollView>
    </Sheet>
  );
}
