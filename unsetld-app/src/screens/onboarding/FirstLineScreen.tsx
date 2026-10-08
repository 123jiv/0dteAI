import { useEffect, useRef, useState } from 'react';
import { Animated, FlatList, View, type ViewToken } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { catalogueNo } from '../../core/typography';
import type { Line } from '../../core/types';
import { chapterLabel, COLORWAY_BY_ID, LINE_BY_NO } from '../../content';
import { COPY } from '../../content/copy';
import type { RootProps } from '../../navigation/types';
import { useApp } from '../../state/store';
import { Icon } from '../../ui/icons';
import { Button, TextButton } from '../../ui/kit';
import type { ShareLine } from '../../ui/ShareCard';
import { T } from '../../ui/text';
import { color as C, ease, MARGIN } from '../../ui/tokens';
import { LinePage } from '../reader/pages';
import { RunningHead } from '../reader/RunningHead';
import { ShareSheet } from '../reader/ShareSheet';

const BLACK = COLORWAY_BY_ID.black;

/** O2: the real reader, on line 0001 then 0002. A real line within two taps of launch. */
export function FirstLineScreen({ navigation }: RootProps<'FirstLine'>) {
  const insets = useSafeAreaInsets();
  const saved = useApp(s => s.reading.saved);
  const toggleSave = useApp(s => s.toggleSave);
  const [height, setHeight] = useState(0);
  const [active, setActive] = useState(0);
  const [share, setShare] = useState<ShareLine | null>(null);
  const [timedOut, setTimedOut] = useState(false);
  const [fade] = useState(() => new Animated.Value(0));
  const listRef = useRef<FlatList<Line>>(null);
  const lines = [LINE_BY_NO[1], LINE_BY_NO[2]].filter(Boolean);

  // Continue appears once line 0002 has settled, or after 4 s.
  const ready = timedOut || active === 1;
  useEffect(() => {
    const t = setTimeout(() => setTimedOut(true), 4000);
    return () => clearTimeout(t);
  }, []);
  useEffect(() => {
    if (ready) Animated.timing(fade, { toValue: 1, duration: 300, easing: ease.out, useNativeDriver: true }).start();
  }, [ready, fade]);

  // FlatList needs these to stay the same object for its whole life.
  const [onViewable] = useState(() => ({ viewableItems }: { viewableItems: ViewToken[] }) => {
    const first = viewableItems.find(v => v.isViewable);
    if (first?.index != null) setActive(first.index);
  });
  const [viewability] = useState({ itemVisiblePercentThreshold: 60 });

  const line = lines[active] ?? lines[0];
  return (
    <View style={{ flex: 1, backgroundColor: BLACK.bg }} onLayout={e => setHeight(e.nativeEvent.layout.height)}>
      {height > 0 ? (
        <FlatList
          ref={listRef}
          data={lines}
          keyExtractor={l => String(l.no)}
          pagingEnabled
          decelerationRate="fast"
          showsVerticalScrollIndicator={false}
          getItemLayout={(_, index) => ({ length: height, offset: height * index, index })}
          onViewableItemsChanged={onViewable}
          viewabilityConfig={viewability}
          extraData={[active, saved]}
          renderItem={({ item, index }) => (
            <LinePage
              line={item}
              height={height}
              colorway={BLACK}
              active={index === active}
              saved={saved.includes(item.no)}
              onToggleSave={() => toggleSave(item.no)}
              onShare={() => setShare({ text: item.text, no: item.no })}
              onLongPress={() => setShare({ text: item.text, no: item.no })}
            />
          )}
        />
      ) : null}

      <RunningHead left={chapterLabel(line.chapter)} right={catalogueNo(line.no)} color={BLACK.secondary} />

      <Animated.View
        pointerEvents={ready ? 'none' : 'auto'}
        style={{
          position: 'absolute',
          left: MARGIN,
          right: MARGIN - 12,
          bottom: insets.bottom + 30 - 22,
          height: 44,
          flexDirection: 'row',
          alignItems: 'center',
          opacity: fade.interpolate({ inputRange: [0, 1], outputRange: [1, 0] }),
        }}>
        <View style={{ flex: 1, flexDirection: 'row', alignItems: 'center' }}>
          <T v="body" color={C.stone} style={{ flexShrink: 1 }}>
            {COPY.o2.caption}
          </T>
          <View style={{ marginLeft: 8 }}>
            <Icon name="chevron-up" size={12} color={C.stone} />
          </View>
        </View>
        <TextButton
          title={COPY.o2.next}
          onPress={() => listRef.current?.scrollToOffset({ offset: height, animated: true })}
          style={{ paddingHorizontal: 12 }}
        />
      </Animated.View>

      <Animated.View
        pointerEvents={ready ? 'auto' : 'none'}
        style={{ position: 'absolute', left: MARGIN, right: MARGIN, bottom: insets.bottom + 16, opacity: fade }}>
        <Button title={COPY.o2.continue} onPress={() => navigation.navigate('Standard')} />
      </Animated.View>

      <ShareSheet line={share} colorway={BLACK} premium={false} onClose={() => setShare(null)} onLocked={() => setShare(null)} />
    </View>
  );
}
