// Step 2, RECOMMENDED FOR YOU: up to three missions for the reason given, each drawn like the
// card it becomes on Today (area, title, minutes · proof · points), then + Create my own.
import { ScrollView, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { TRACK_BY_ID } from '../../content';
import { SWAP } from '../../content/copy/swap';
import type { SlotPick } from '../../core/missions';
import { T } from '../../ui/text';
import { color as C, GAP, MARGIN } from '../../ui/tokens';
import { Back, Row } from './parts';

export function ChoicesStep({
  choices,
  canOwn,
  note,
  onPick,
  onOwn,
  onBack,
}: {
  choices: readonly SlotPick[];
  /** The day has room for a mission of the user's own (one a day). */
  canOwn: boolean;
  /** Why the last pick didn't go in, if it didn't. */
  note: string | null;
  onPick: (missionId: string) => void;
  onOwn: () => void;
  onBack: () => void;
}) {
  const insets = useSafeAreaInsets();
  return (
    <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingHorizontal: MARGIN, paddingBottom: insets.bottom + 24 }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 10 }}>
        <Back onPress={onBack} label={SWAP.choices.back} hint={SWAP.choices.backHint} />
        <T v="kicker" color={C.muted} accessibilityRole="header">
          {SWAP.choices.kicker}
        </T>
      </View>

      {choices.length ? (
        <View style={{ gap: GAP.tight }}>
          {choices.map(({ mission: m, area }) => {
            const areaName = TRACK_BY_ID[area]?.short ?? '';
            return (
              <Row
                key={m.id}
                onPress={() => onPick(m.id)}
                accessibilityLabel={SWAP.choices.a11y(m.title, areaName, m.minutes, m.proofType, m.points)}
                accessibilityHint={SWAP.choices.hint}>
                {areaName ? (
                  <T v="kicker" color={C.stone}>
                    {areaName}
                  </T>
                ) : null}
                <T v="list" style={{ marginTop: areaName ? 6 : 0 }}>
                  {m.title}
                </T>
                <T v="meta" color={C.stone} style={{ marginTop: 6 }}>
                  {SWAP.choices.meta(m.minutes, m.proofType, m.points)}
                </T>
              </Row>
            );
          })}
        </View>
      ) : (
        <T v="saved" style={{ marginTop: 4 }}>
          {SWAP.choices.nothing}
        </T>
      )}

      {note ? (
        <T v="note" color={C.muted} accessibilityLiveRegion="polite" style={{ marginTop: 14 }}>
          {note}
        </T>
      ) : null}

      {canOwn ? (
        <Row
          outline
          label={SWAP.choices.own}
          accessibilityLabel={SWAP.choices.ownA11y}
          accessibilityHint={SWAP.choices.ownHint}
          onPress={onOwn}
          style={{ marginTop: choices.length ? GAP.block - 8 : 20 }}
        />
      ) : (
        <T v="meta" color={C.stone} style={{ marginTop: 20 }}>
          {SWAP.choices.onePerDay}
        </T>
      )}
    </ScrollView>
  );
}
