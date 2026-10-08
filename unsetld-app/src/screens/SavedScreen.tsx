import { useState } from 'react';
import { FlatList, Pressable, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { catalogueNo } from '../core/typography';
import type { Line } from '../core/types';
import { chapterLabel, LINE_BY_NO } from '../content';
import { COPY } from '../content/copy';
import type { RootProps } from '../navigation/types';
import { useApp, useEntitlements } from '../state/store';
import { showActions } from '../ui/actions';
import { NavRow, PageTitle } from '../ui/kit';
import type { ShareLine } from '../ui/ShareCard';
import { ShareSheet } from './today/ShareSheet';
import { T } from '../ui/text';
import { color as C, hairline, MARGIN } from '../ui/tokens';

export function SavedScreen({ navigation }: RootProps<'Saved'>) {
  const insets = useSafeAreaInsets();
  const saved = useApp(s => s.reading.saved);
  const lines = saved.map(n => LINE_BY_NO[n]).filter((l): l is Line => Boolean(l));

  const ent = useEntitlements();
  const [share, setShare] = useState<ShareLine | null>(null);
  const open = (l: Line) => setShare({ text: l.text, no: l.no, attribution: l.attribution });

  return (
    <View style={{ flex: 1, backgroundColor: C.ink }}>
      <NavRow onBack={() => navigation.goBack()} />
      <FlatList
        data={lines}
        keyExtractor={l => String(l.no)}
        contentContainerStyle={{ paddingHorizontal: MARGIN, paddingBottom: insets.bottom + 40 }}
        ListHeaderComponent={<PageTitle title={COPY.saved.title} style={{ marginBottom: 24 }} />}
        ListEmptyComponent={
          <View style={{ marginTop: 32, gap: 8 }}>
            <T v="title.m">{COPY.saved.emptyTitle}</T>
            <T v="body" color={C.stone}>
              {COPY.saved.emptyBody}
            </T>
          </View>
        }
        renderItem={({ item, index }) => (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={`${item.text}. ${catalogueNo(item.no)}`}
            accessibilityHint="Opens it to share"
            accessibilityActions={[{ name: 'remove', label: COPY.saved.remove }]}
            onAccessibilityAction={e => {
              if (e.nativeEvent.actionName === 'remove') useApp.getState().toggleSave(item.no);
            }}
            onPress={() => open(item)}
            onLongPress={() =>
              showActions({
                options: [
                  { label: COPY.saved.remove, onPress: () => useApp.getState().toggleSave(item.no) },
                  { label: COPY.reader.menu.cancel, cancel: true },
                ],
              })
            }
            style={({ pressed }) => ({
              paddingVertical: 16,
              borderTopWidth: hairline,
              borderBottomWidth: index === lines.length - 1 ? hairline : 0,
              borderColor: C.rule,
              opacity: pressed ? 0.6 : 1,
            })}>
            <T v="saved" numberOfLines={3}>
              {item.text}
            </T>
            <T v="mono" style={{ marginTop: 8 }}>
              {`${catalogueNo(item.no)} · ${chapterLabel(item.chapter)}`}
            </T>
          </Pressable>
        )}
      />
      <ShareSheet
        line={share}
        colorway={ent.colorway}
        premium={ent.premium}
        onClose={() => setShare(null)}
        onLocked={() => {
          setShare(null);
          navigation.navigate('Paywall', { from: 'share' });
        }}
      />
    </View>
  );
}
