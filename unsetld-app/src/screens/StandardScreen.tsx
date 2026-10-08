import { useRef, useState } from 'react';
import { Animated, Pressable, TextInput, View } from 'react-native';
import { STANDARD_RULES } from '../content';
import { COPY } from '../content/copy';
import type { RootProps } from '../navigation/types';
import { selection, warning } from '../services/haptics';
import { useApp } from '../state/store';
import { Button, ListRow, NavRow, PageTitle, Screen, Square } from '../ui/kit';
import { T } from '../ui/text';
import { color as C, font, hairline } from '../ui/tokens';

/** O3, and Settings › Your standard: pick three plain rules or write one. */
export function StandardScreen({ navigation, route }: RootProps<'Standard'>) {
  const edit = Boolean(route.params?.edit);
  const settings = useApp(s => s.settings);
  const update = useApp(s => s.updateSettings);
  // A written rule never repeats a preset (older saves may have one).
  const saved = edit && settings.ownRule && !STANDARD_RULES.includes(settings.ownRule) ? settings.ownRule : null;
  const [own, setOwn] = useState<string | null>(saved);
  // Only rules this page can show count as chosen (no repeats, no preset since retired), so the counter matches what Save keeps.
  const [chosen, setChosen] = useState<string[]>(
    edit ? [...new Set(settings.standard)].filter(r => STANDARD_RULES.includes(r) || r === saved) : [],
  );
  const [writing, setWriting] = useState(false);
  const [draft, setDraft] = useState('');
  const [flash] = useState(() => new Animated.Value(1));
  const inputRef = useRef<TextInput>(null);

  const rules = own ? [...STANDARD_RULES, own] : STANDARD_RULES;
  // While rewriting, the input takes the written rule's place as row 09.
  const shown = writing ? STANDARD_RULES : rules;

  const blocked = () => {
    warning();
    Animated.sequence([
      Animated.timing(flash, { toValue: 0.4, duration: 150, useNativeDriver: true }),
      Animated.timing(flash, { toValue: 1, duration: 150, useNativeDriver: true }),
    ]).start();
  };

  const toggle = (rule: string) => {
    if (chosen.includes(rule)) {
      selection();
      setChosen(chosen.filter(r => r !== rule));
    } else if (chosen.length >= 3) blocked();
    else {
      selection();
      setChosen([...chosen, rule]);
    }
  };

  const commitOwn = () => {
    const text = draft.trim().replace(/\s+/g, ' ');
    setWriting(false);
    if (!text) return;
    const typed = /[.?]$/.test(text) ? text : `${text}.`;
    // A preset's own words pick that preset, so a rule never appears twice.
    const preset = STANDARD_RULES.find(r => r.toLowerCase() === typed.toLowerCase());
    const rule = preset ?? typed;
    const without = chosen.filter(r => r !== own);
    setOwn(preset ? null : rule);
    if (without.includes(rule)) setChosen(without);
    else if (without.length >= 3) {
      setChosen(without);
      blocked();
    } else setChosen([...without, rule]);
    setDraft('');
  };

  const save = () => {
    const ordered = rules.filter(r => chosen.includes(r));
    update({ standard: ordered, ownRule: own });
    if (edit) navigation.goBack();
    else navigation.navigate('Chapters');
  };

  return (
    <Screen
      nav={<NavRow onBack={() => navigation.goBack()} step={edit ? undefined : '01 / 04'} />}
      footer={
        <View style={{ gap: 12 }}>
          <Animated.View style={{ opacity: flash, alignItems: 'center' }}>
            <T v="mono" accessibilityLiveRegion="polite">
              {COPY.standard.counter(chosen.length)}
            </T>
          </Animated.View>
          <Button title={edit ? COPY.standard.save : COPY.standard.button} disabled={chosen.length !== 3} onPress={save} />
        </View>
      }>
      <PageTitle title={COPY.standard.title} body={COPY.standard.body} />
      <View style={{ marginTop: 28, borderBottomWidth: hairline, borderBottomColor: C.rule }}>
        {shown.map((rule, i) => {
          const on = chosen.includes(rule);
          return (
            <ListRow
              key={rule}
              onPress={() => toggle(rule)}
              accessibilityRole="checkbox"
              accessibilityLabel={rule}
              accessibilityState={{ checked: on }}
              style={{ paddingVertical: 10 }}>
              <T v="mono" style={{ width: 40 }}>
                {String(i + 1).padStart(2, '0')}
              </T>
              <T v="list" color={on ? C.bone : C.muted} style={{ flex: 1 }} numberOfLines={2}>
                {rule}
              </T>
              <Square on={on} />
            </ListRow>
          );
        })}
        {writing ? (
          <View style={{ minHeight: 48, borderTopWidth: hairline, borderTopColor: C.rule, flexDirection: 'row', alignItems: 'center' }}>
            <T v="mono" style={{ width: 40 }}>
              {String(STANDARD_RULES.length + 1).padStart(2, '0')}
            </T>
            <TextInput
              ref={inputRef}
              autoFocus
              value={draft}
              onChangeText={setDraft}
              onSubmitEditing={commitOwn}
              onBlur={commitOwn}
              placeholder={COPY.standard.placeholder}
              placeholderTextColor={C.ash}
              maxLength={32}
              maxFontSizeMultiplier={1.3}
              returnKeyType="done"
              accessibilityLabel={COPY.standard.writeOwn}
              style={{ flex: 1, fontFamily: font.serif, fontSize: 23, color: C.bone, paddingVertical: 10 }}
            />
          </View>
        ) : (
          <Pressable
            accessibilityRole="button"
            onPress={() => {
              setDraft(own ?? '');
              setWriting(true);
            }}
            style={({ pressed }) => ({
              minHeight: 48,
              borderTopWidth: hairline,
              borderTopColor: C.rule,
              flexDirection: 'row',
              alignItems: 'center',
              opacity: pressed ? 0.6 : 1,
            })}>
            <T v="mono" style={{ width: 40 }}>
              +
            </T>
            <T v="body" color={C.stone}>
              {COPY.standard.writeOwn}
            </T>
          </Pressable>
        )}
      </View>
    </Screen>
  );
}
