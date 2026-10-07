import { useEffect } from 'react';
import { Modal, View } from 'react-native';
import { rankIndex } from '../core/rank';
import { RANK_CONFIG } from '../content';
import { success } from '../services/haptics';
import { useApp } from '../state/store';
import { Button, T } from './components';
import { RankEmblem } from './RankEmblem';
import { space, useTheme } from './theme';

const COPY: Record<string, string> = {
  hungry: "A week of showing up. That's not luck, that's you.",
  'dialed-in': "A month locked in. Most people quit by now. You didn't.",
  relentless: 'Two and a half months. This is who you are now.',
  unsetld: "Six months of never settling. Top rank. Don't get comfortable.",
};

/** Celebrates the person first; the perk is mentioned second. */
export function RankUpCelebration() {
  const theme = useTheme();
  const xp = useApp(s => s.progress.rankXP);
  const seen = useApp(s => s.progress.seenRank);
  const onboarded = useApp(s => s.settings.onboarded);
  const markSeen = useApp(s => s.markRankSeen);
  const ri = rankIndex(RANK_CONFIG, xp);
  const visible = onboarded && ri > seen;
  useEffect(() => {
    if (visible) success();
  }, [visible, ri]);
  if (!visible) return null;
  const rank = RANK_CONFIG.ranks[ri];
  return (
    <Modal visible transparent animationType="fade" onRequestClose={markSeen}>
      <View style={{ flex: 1, backgroundColor: theme.bg, alignItems: 'center', justifyContent: 'center', padding: space.xl }}>
        <T variant="label" color={theme.accent}>
          Rank up
        </T>
        <View style={{ marginVertical: space.xl }}>
          <RankEmblem rank={ri} size={120} color={theme.text} />
        </View>
        <T variant="title" center>
          {rank.name}
        </T>
        <T variant="muted" center style={{ marginTop: space.md, maxWidth: 320 }}>
          {COPY[rank.id] ?? 'You moved up.'}
        </T>
        <View style={{ marginTop: space.xl, gap: 6, maxWidth: 320 }}>
          {rank.perks.map(p => (
            <T key={p} variant="caption" center>
              {`Unlocked: ${p}`}
            </T>
          ))}
        </View>
        <Button title="Keep going" onPress={markSeen} style={{ marginTop: space.xxl, alignSelf: 'stretch', maxWidth: 360 }} />
      </View>
    </Modal>
  );
}
