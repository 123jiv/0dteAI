import { useState } from 'react';
import { FlatList, Text, TextInput, View } from 'react-native';
import { wordCount } from '../core/lines';
import type { RootProps } from '../navigation/types';
import { useApp } from '../state/store';
import { Button, Header, IconButton, Screen, T } from '../ui/components';
import { fonts, radius, space, useTheme } from '../ui/theme';

const MAX_WORDS = 15;

export function CustomLinesScreen({ navigation }: RootProps<'CustomLines'>) {
  const theme = useTheme();
  const lines = useApp(s => s.customLines);
  const add = useApp(s => s.addCustomLine);
  const remove = useApp(s => s.removeCustomLine);
  const [text, setText] = useState('');
  const words = wordCount(text);
  const tooLong = words > MAX_WORDS;

  return (
    <Screen>
      <Header title="Your lines" onBack={() => navigation.goBack()} />
      <T variant="muted" style={{ marginTop: space.sm }}>
        Your own lines rotate into your widget, feed and reminders. First one each week: +10 XP.
      </T>
      <View style={{ marginTop: space.lg }}>
        <TextInput
          value={text}
          onChangeText={setText}
          placeholder="Write something you need to hear"
          placeholderTextColor={theme.muted}
          multiline
          maxLength={120}
          accessibilityLabel="New line"
          style={{
            minHeight: 84,
            borderWidth: 1,
            borderColor: tooLong ? theme.danger : theme.border,
            borderRadius: radius.md,
            padding: space.md,
            color: theme.text,
            fontFamily: fonts.serif,
            fontSize: 22,
            textAlignVertical: 'top',
          }}
        />
        <T variant="caption" style={{ marginTop: 6 }} color={tooLong ? theme.danger : undefined}>
          {`${words}/${MAX_WORDS} words${tooLong ? '. Shorter hits harder.' : ''}`}
        </T>
        <Button
          title="Add line"
          icon="plus"
          disabled={!text.trim() || tooLong}
          onPress={() => {
            add(text);
            setText('');
          }}
          style={{ marginTop: space.md }}
        />
      </View>
      <FlatList
        data={lines}
        keyExtractor={l => l.id}
        style={{ marginTop: space.lg }}
        contentContainerStyle={{ gap: space.sm, paddingBottom: space.xxl }}
        renderItem={({ item }) => (
          <View style={{ flexDirection: 'row', alignItems: 'center', backgroundColor: theme.surface, borderRadius: radius.md, borderWidth: 1, borderColor: theme.border, padding: space.md, gap: space.sm }}>
            <Text style={{ flex: 1, color: theme.text, fontFamily: fonts.serif, fontSize: 20 }}>{item.text}</Text>
            <IconButton icon="trash" label={`Delete: ${item.text}`} color={theme.muted} onPress={() => remove(item.id)} />
          </View>
        )}
      />
    </Screen>
  );
}
