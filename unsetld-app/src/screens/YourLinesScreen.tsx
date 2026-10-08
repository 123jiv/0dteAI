import { useState } from 'react';
import { Pressable, TextInput, View } from 'react-native';
import { COPY } from '../content/copy';
import type { RootProps } from '../navigation/types';
import { useApp, useEntitlements } from '../state/store';
import { showActions } from '../ui/actions';
import { Button, NavRow, PageTitle, Screen } from '../ui/kit';
import { T } from '../ui/text';
import { color as C, font, hairline } from '../ui/tokens';

const Y = COPY.yours;

/** Your lines (Full Edition): write the line you need to read. */
export function YourLinesScreen({ navigation }: RootProps<'YourLines'>) {
  const ent = useEntitlements();
  const lines = useApp(s => s.yourLines);
  const add = useApp(s => s.addYourLine);
  const edit = useApp(s => s.updateYourLine);
  const remove = useApp(s => s.removeYourLine);
  const [writing, setWriting] = useState<{ id: string | null; text: string } | null>(null);

  if (!ent.yourLines) {
    return (
      <Screen nav={<NavRow onBack={() => navigation.goBack()} />}>
        <View style={{ marginTop: 32, gap: 12 }}>
          <T v="title.m" accessibilityRole="header">
            {Y.lockedTitle}
          </T>
          <T v="body" color={C.stone}>
            {Y.lockedBody}
          </T>
          <Button title={Y.seeFull} onPress={() => navigation.navigate('Paywall', { from: 'yours' })} style={{ marginTop: 20 }} />
        </View>
      </Screen>
    );
  }

  // Editing another line first saves a new line you were still writing.
  const startEdit = (l: { id: string; text: string }) => {
    if (writing && !writing.id) {
      const t = writing.text.trim().replace(/\s+/g, ' ');
      if (t) add(t);
    }
    setWriting({ id: l.id, text: l.text });
  };

  const commit = () => {
    if (!writing) return;
    const text = writing.text.trim().replace(/\s+/g, ' ');
    if (text) {
      if (writing.id) edit(writing.id, text);
      else add(text);
    }
    setWriting(null);
  };

  const input = (
    <View style={{ borderTopWidth: hairline, borderTopColor: C.rule, paddingVertical: 12 }}>
      <TextInput
        autoFocus
        multiline
        value={writing?.text ?? ''}
        onChangeText={t => setWriting(w => (w ? { ...w, text: t.replace(/\n/g, ' ') } : w))}
        onBlur={commit}
        onSubmitEditing={commit}
        blurOnSubmit
        returnKeyType="done"
        maxLength={Y.max}
        maxFontSizeMultiplier={1.3}
        placeholder={Y.placeholder}
        placeholderTextColor={C.ash}
        accessibilityLabel={Y.write}
        style={{ fontFamily: font.serif, fontSize: 23, lineHeight: 27, color: C.bone, minHeight: 56, textAlignVertical: 'top' }}
      />
      <T v="mono" align="right">{`${writing?.text.length ?? 0} / ${Y.max}`}</T>
    </View>
  );

  return (
    <Screen nav={<NavRow onBack={() => navigation.goBack()} />}>
      <PageTitle title={Y.title} />
      <View style={{ marginTop: 28, borderBottomWidth: hairline, borderBottomColor: C.rule }}>
        {writing && !writing.id ? (
          input
        ) : (
          <Pressable
            accessibilityRole="button"
            onPress={() => setWriting({ id: null, text: '' })}
            style={({ pressed }) => ({ minHeight: 52, flexDirection: 'row', alignItems: 'center', borderTopWidth: hairline, borderTopColor: C.rule, opacity: pressed ? 0.6 : 1 })}>
            <T v="mono" style={{ width: 32 }}>
              +
            </T>
            <T v="body" color={C.stone}>
              {Y.write}
            </T>
          </Pressable>
        )}
        {lines.map(l =>
          writing?.id === l.id ? (
            <View key={l.id}>{input}</View>
          ) : (
            <Pressable
              key={l.id}
              accessibilityRole="button"
              accessibilityLabel={l.text}
              accessibilityHint="Long press to edit or delete"
              accessibilityActions={[
                { name: 'edit', label: Y.edit },
                { name: 'delete', label: Y.delete },
              ]}
              onAccessibilityAction={e => {
                if (e.nativeEvent.actionName === 'edit') startEdit(l);
                else if (e.nativeEvent.actionName === 'delete') remove(l.id);
              }}
              onLongPress={() =>
                showActions({
                  options: [
                    { label: Y.edit, onPress: () => startEdit(l) },
                    { label: Y.delete, onPress: () => remove(l.id) },
                    { label: COPY.reader.menu.cancel, cancel: true },
                  ],
                })
              }
              style={{ paddingVertical: 16, borderTopWidth: hairline, borderTopColor: C.rule }}>
              <T v="saved">{l.text}</T>
            </Pressable>
          ),
        )}
      </View>
      <T v="note" color={C.stone} style={{ marginTop: 12 }}>
        {Y.footnote}
      </T>
    </Screen>
  );
}
