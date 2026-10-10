import { Platform, Pressable, View } from 'react-native';
import { shortDate, type DayKey } from '../../core/time';
import { REWARD_TIERS } from '../../content';
import { REWARDS_COPY } from '../../content/copy/rewards';
import type { RootProps } from '../../navigation/types';
import { openStore } from '../../services/access';
import { useRewardTiers } from '../../state/missions';
import { useAccessEnabled, useApp } from '../../state/store';
import { showActions } from '../../ui/actions';
import { EmptyState } from '../../ui/blocks';
import { NavRow, PageTitle, Screen } from '../../ui/kit';
import { T } from '../../ui/text';
import { color as C, GAP, radius } from '../../ui/tokens';
import { copyCode, LINING } from './redeem';

const R = REWARDS_COPY;
const H = R.history;

interface CodeItem {
  key: string;
  title: string;
  code: string;
  url: string;
  day: DayKey;
  expires: DayKey;
}

function CodeCard({ item, expired }: { item: CodeItem; expired: boolean }) {
  const line = H.line(shortDate(item.day), shortDate(item.expires), expired);
  const open = () =>
    showActions({
      title: item.code,
      options: [
        { label: R.copyCode, onPress: () => copyCode(item.code) },
        { label: R.use, onPress: () => openStore(item.url) },
        { label: R.cancel, cancel: true },
      ],
    });
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={H.a11y(item.title, item.code, line)}
      accessibilityHint={expired ? undefined : H.hint}
      aria-disabled={expired}
      disabled={expired}
      onPress={open}
      style={({ pressed }) => ({ backgroundColor: pressed ? C.cardPressed : C.card, borderRadius: radius.card, padding: 18 })}>
      <T v="saved" color={expired ? C.muted : C.bone} style={LINING}>
        {item.title}
      </T>
      <T v="mono.l" color={expired ? C.stone : C.bone} style={{ marginTop: 8 }}>
        {item.code}
      </T>
      <T v="meta" color={C.stone} style={{ marginTop: 6 }}>
        {line}
      </T>
    </Pressable>
  );
}

/**
 * Your codes, newest first: every reward taken since 3.0 and the 2.x codes, each with when
 * it was taken and when it runs out. A code whose reward has since left the list keeps its
 * name. Tap one to copy it or use it at unsetld.com.
 */
export function RewardHistoryScreen({ navigation }: RootProps<'RewardHistory'>) {
  const record = useApp(s => s.record);
  const day = useApp(s => s.currentDay);
  const accessEnabled = useAccessEnabled();
  const tiers = useRewardTiers();

  const titleOf = (id: string) => (tiers.find(t => t.id === id) ?? REWARD_TIERS.find(t => t.id === id))?.title ?? H.retiredRewards[id] ?? H.unknownReward;
  const codes: CodeItem[] = [
    ...(record.redemptions ?? []).map((r, i) => ({ key: `r${i}:${r.code}`, title: titleOf(r.rewardId), code: r.code, url: r.url, day: r.day, expires: r.expires })),
    ...(Array.isArray(record.codes) ? record.codes : []).map((c, i) => ({ key: `c${i}:${c.code}`, title: H.legacyTitle(c.percent), code: c.code, url: c.url, day: c.day, expires: c.expires })),
  ].sort((a, b) => (a.day < b.day ? 1 : a.day > b.day ? -1 : 0));

  return (
    <Screen nav={<NavRow onBack={() => navigation.goBack()} />}>
      <PageTitle title={H.title} />
      {!accessEnabled ? (
        <T v="small" color={C.stone} style={{ marginTop: GAP.block }}>
          {R.off}
        </T>
      ) : codes.length ? (
        <View style={{ marginTop: GAP.block, gap: GAP.card }}>
          {codes.map(c => (
            <CodeCard key={c.key} item={c} expired={day > c.expires} />
          ))}
          {Platform.OS === 'web' ? (
            <T v="mono.s" style={{ marginTop: 4 }}>
              {R.previewCode}
            </T>
          ) : null}
        </View>
      ) : (
        <View style={{ marginTop: GAP.block }}>
          <EmptyState title={H.emptyTitle} body={H.emptyBody} />
        </View>
      )}
    </Screen>
  );
}
