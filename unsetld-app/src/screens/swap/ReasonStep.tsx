// Step 1, WHY ARE YOU SWAPPING?: six one-tap reasons, nothing to type. The reason goes with the
// swap, and the plan learns from it (core/personalize learnFrom).
import { ScrollView, View } from 'react-native';
import { SWAP } from '../../content/copy/swap';
import type { SwapReason } from '../../core/types';
import { useRerollsLeft } from '../../state/missions';
import type { DayKey } from '../../core/time';
import { T } from '../../ui/text';
import { color as C, GAP, MARGIN } from '../../ui/tokens';
import { Row } from './parts';

export function ReasonStep({ title, onPick }: { title: string; onPick: (reason: SwapReason) => void }) {
  return (
    <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingHorizontal: MARGIN, paddingTop: 6, paddingBottom: 12 }}>
      <View style={{ flexDirection: 'row', alignItems: 'baseline', gap: 10 }}>
        <T v="kicker" color={C.muted}>
          {SWAP.kicker}
        </T>
        <T v="meta" color={C.stone} numberOfLines={1} style={{ flexShrink: 1 }}>
          {title}
        </T>
      </View>
      <T v="title.m" accessibilityRole="header" style={{ marginTop: 8, marginBottom: 20 }}>
        {SWAP.why.title}
      </T>
      <View style={{ gap: GAP.tight }}>
        {SWAP.why.reasons.map(r => (
          <Row key={r.id} label={r.label} accessibilityHint={SWAP.why.hint} onPress={() => onPick(r.id)} />
        ))}
      </View>
    </ScrollView>
  );
}

/** Under the reasons, pinned to the sheet's bottom: "1 swap left today". */
export function SwapsLeft({ day }: { day: DayKey }) {
  const left = useRerollsLeft(day);
  return (
    <T v="meta" color={C.stone} style={{ paddingHorizontal: MARGIN, paddingTop: 12 }}>
      {SWAP.why.left(left)}
    </T>
  );
}
