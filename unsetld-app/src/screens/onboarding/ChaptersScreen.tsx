import { View } from 'react-native';
import type { ChapterId } from '../../core/types';
import { CHAPTERS } from '../../content';
import { COPY } from '../../content/copy';
import type { RootProps } from '../../navigation/types';
import { selection } from '../../services/haptics';
import { useApp } from '../../state/store';
import { Button, ListRow, NavRow, PageTitle, Screen, Square } from '../../ui/kit';
import { T } from '../../ui/text';
import { color as C, hairline } from '../../ui/tokens';

/** O4: choose chapters. Discipline is always in; any number of others. */
export function ChaptersScreen({ navigation }: RootProps<'Chapters'>) {
  const chapters = useApp(s => s.settings.chapters);
  const update = useApp(s => s.updateSettings);

  const toggle = (id: ChapterId) => {
    if (id === 'discipline') return;
    selection();
    update({ chapters: chapters.includes(id) ? chapters.filter(c => c !== id) : [...chapters, id] });
  };

  return (
    <Screen
      nav={<NavRow onBack={() => navigation.goBack()} step="02 / 04" />}
      footer={<Button title={COPY.chapters.button} onPress={() => navigation.navigate('Day')} />}>
      <PageTitle title={COPY.chapters.title} body={COPY.chapters.body} />
      <View style={{ marginTop: 28, borderBottomWidth: hairline, borderBottomColor: C.rule }}>
        {CHAPTERS.map(c => {
          const on = c.id === 'discipline' || chapters.includes(c.id);
          return (
            <ListRow
              key={c.id}
              height={60}
              onPress={c.id === 'discipline' ? undefined : () => toggle(c.id)}
              accessibilityRole="checkbox"
              accessibilityLabel={`${c.name}. ${c.scope}`}
              accessibilityState={{ checked: on, disabled: c.id === 'discipline' }}
              style={{ paddingVertical: 8 }}>
              <T v="mono" style={{ width: 40 }}>
                {String(c.no).padStart(2, '0')}
              </T>
              <View style={{ flex: 1 }}>
                <T v="list" color={on ? C.bone : C.muted}>
                  {c.name}
                </T>
                <T v="note" color={C.stone}>
                  {c.scope}
                </T>
              </View>
              {c.id === 'discipline' ? <T v="label">{COPY.chapters.always}</T> : <Square on={on} />}
            </ListRow>
          );
        })}
      </View>
    </Screen>
  );
}
