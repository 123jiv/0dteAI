import { Pressable, View } from 'react-native';
import { achievementsView, milestones, type MilestoneState } from '../../core/progress';
import { PROGRESS } from '../../content/copy/progress';
import type { RootProps } from '../../navigation/types';
import { useApp } from '../../state/store';
import { Card, EmptyState, Meter, SectionLabel } from '../../ui/blocks';
import { Icon } from '../../ui/icons';
import { NavRow, PageTitle, Screen } from '../../ui/kit';
import { T } from '../../ui/text';
import { color as C, GAP } from '../../ui/tokens';

const A = PROGRESS.achievements;

/** A milestone reached: a check, its name in serif and the day. Opens its moment again. */
function Reached({ m, onOpen }: { m: MilestoneState; onOpen: () => void }) {
  const title = A.byKey[m.key]?.title ?? m.title;
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={A.a11yReached(title, m.reached!)}
      accessibilityHint={A.a11yReachedHint}
      onPress={onOpen}
      style={({ pressed }) => ({ minHeight: 48, paddingVertical: 10, flexDirection: 'row', alignItems: 'center', gap: 14, opacity: pressed ? 0.6 : 1 })}>
      <Icon name="check" size={18} color={C.bone} />
      <T v="saved" style={{ flex: 1, fontVariant: ['lining-nums'] }}>
        {title}
      </T>
      <T v="meta" color={C.stone}>
        {PROGRESS.date(m.reached!)}
      </T>
    </Pressable>
  );
}

/** One still to reach: its name, what it takes, and how far along it is when there's a count. */
function Next({ m }: { m: MilestoneState }) {
  const words = A.byKey[m.key] ?? { title: m.title, how: '' };
  const progress = A.progress(m.kind, m.progress, m.target);
  return (
    <Card>
      <View accessible accessibilityLabel={A.a11yNext(words.title, words.how, progress)}>
        <T v="saved" color={C.muted} style={{ fontVariant: ['lining-nums'] }}>
          {words.title}
        </T>
        <T v="meta" color={C.stone} style={{ marginTop: 4 }}>
          {words.how}
        </T>
        {progress ? (
          <View style={{ marginTop: 14, gap: 8 }}>
            <Meter value={m.progress} max={m.target} />
            <T v="meta" color={C.muted}>
              {progress}
            </T>
          </View>
        ) : null}
      </View>
    </Card>
  );
}

/** Progress › Achievements: the milestones reached (with the day), then the next three. Nothing else. */
export function AchievementsScreen({ navigation }: RootProps<'Achievements'>) {
  const today = useApp(s => s.currentDay);
  const record = useApp(s => s.record);
  const { reached, next } = achievementsView(milestones(record, today));
  const back = () => (navigation.canGoBack() ? navigation.goBack() : navigation.navigate('Main', { screen: 'Progress' }));

  return (
    <Screen nav={<NavRow onBack={back} />}>
      <PageTitle title={A.title} />
      {reached.length === 0 ? (
        <View style={{ marginTop: GAP.block }}>
          <EmptyState title={A.empty.title} body={A.empty.body} />
        </View>
      ) : (
        <View style={{ marginTop: GAP.block }}>
          <SectionLabel>{A.reached}</SectionLabel>
          <Card style={{ paddingVertical: 8 }}>
            {reached.map(m => (
              <Reached key={m.key} m={m} onOpen={() => navigation.navigate('Moment', { key: m.key })} />
            ))}
          </Card>
        </View>
      )}
      {next.length ? (
        <View style={{ marginTop: GAP.section }}>
          <SectionLabel>{A.next}</SectionLabel>
          <View style={{ gap: GAP.card }}>
            {next.map(m => (
              <Next key={m.key} m={m} />
            ))}
          </View>
        </View>
      ) : (
        <T v="meta" color={C.stone} style={{ marginTop: GAP.block }}>
          {A.allReached}
        </T>
      )}
    </Screen>
  );
}
