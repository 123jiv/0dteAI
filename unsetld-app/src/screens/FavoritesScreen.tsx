import { FlatList, Pressable, Text, View } from 'react-native';
import { customToLine } from '../core/lines';
import type { Line } from '../core/types';
import { LANE_NAMES, LINES_BY_ID } from '../content';
import type { RootProps } from '../navigation/types';
import { useApp } from '../state/store';
import { Header, IconButton, Screen, T } from '../ui/components';
import { fonts, radius, space, useTheme } from '../ui/theme';

export function FavoritesScreen({ navigation }: RootProps<'Favorites'>) {
  const theme = useTheme();
  const favorites = useApp(s => s.favorites);
  const custom = useApp(s => s.customLines);
  const toggle = useApp(s => s.toggleFavorite);
  const lines: Line[] = favorites
    .map(id => LINES_BY_ID[id] ?? custom.map(customToLine).find(c => c.id === id))
    .filter((l): l is Line => Boolean(l));

  return (
    <Screen>
      <Header title="Favorites" onBack={() => navigation.goBack()} />
      <FlatList
        data={lines}
        keyExtractor={l => l.id}
        contentContainerStyle={{ paddingBottom: space.xxl, gap: space.md, paddingTop: space.md }}
        ListEmptyComponent={
          <View style={{ alignItems: 'center', marginTop: space.xxl }}>
            <T variant="muted" center>
              Tap any line in your feed to save it here.
            </T>
          </View>
        }
        renderItem={({ item }) => (
          <Pressable
            onPress={() => navigation.navigate('Main', { screen: 'Today', params: { lineId: item.id } })}
            accessibilityRole="button"
            accessibilityLabel={`${item.text}. Open in feed.`}
            style={{ backgroundColor: theme.surface, borderRadius: radius.lg, borderWidth: 1, borderColor: theme.border, padding: space.lg, flexDirection: 'row', gap: space.md }}>
            <View style={{ flex: 1 }}>
              <T variant="label">{LANE_NAMES[item.lane] ?? ''}</T>
              <Text style={{ color: theme.text, fontFamily: fonts.serif, fontSize: 22, lineHeight: 27, marginTop: 6 }}>{item.text}</Text>
              {item.author ? <T variant="caption" style={{ marginTop: 6 }}>{item.author}</T> : null}
            </View>
            <IconButton icon="heart-filled" label="Remove favorite" color={theme.accent} onPress={() => toggle(item.id)} />
          </Pressable>
        )}
      />
    </Screen>
  );
}
