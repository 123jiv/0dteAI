import { View } from 'react-native';
import { cooldownEnds, rewardStatus } from '../../core/rewards';
import { shortDate } from '../../core/time';
import { REWARDS_COPY } from '../../content/copy/rewards';
import type { RootProps } from '../../navigation/types';
import { useBalance, useRewardTiers } from '../../state/missions';
import { useAccessEnabled, useApp } from '../../state/store';
import { Card } from '../../ui/blocks';
import { NavRow, PageTitle, Screen } from '../../ui/kit';
import { T } from '../../ui/text';
import { color as C, GAP } from '../../ui/tokens';
import { LINING, RedeemNote, SmallButton, statusText, useRedeem } from './redeem';

const R = REWARDS_COPY;

/**
 * Every reward tier, cheapest first: its points, title and detail, where it stands
 * (Ready / 220 to go / Used this collection / Not available / Cooling down) and its
 * limits, all from the tier's own fields. A ready tier can be taken from here.
 */
export function AllRewardsScreen({ navigation }: RootProps<'AllRewards'>) {
  const record = useApp(s => s.record);
  const day = useApp(s => s.currentDay);
  const collection = useApp(s => s.remote.collection);
  const signedIn = useApp(s => Boolean(s.account.userId));
  const accessEnabled = useAccessEnabled();
  const balance = useBalance();
  const tiers = useRewardTiers();
  const { busy, noteFor, take, sheet } = useRedeem(() => navigation.navigate('Account'));

  // A tier the config switched off isn't offered at all (nothing is promised that can't be had);
  // one outside its dates or sold out still shows, as Not available.
  const sorted = tiers.filter(t => t.active).sort((a, b) => a.points - b.points || (a.percent ?? 0) - (b.percent ?? 0));
  const anyReady = sorted.some(t => rewardStatus(record, t, collection, day) === 'ready');

  return (
    <View style={{ flex: 1, backgroundColor: C.ink }}>
      <Screen nav={<NavRow onBack={() => navigation.goBack()} />}>
        <PageTitle title={R.all.title} body={accessEnabled ? R.all.intro : undefined} />
        {!accessEnabled ? (
          <T v="small" color={C.stone} style={{ marginTop: GAP.block }}>
            {R.off}
          </T>
        ) : (
          <View style={{ marginTop: GAP.block, gap: GAP.card }}>
            {sorted.map(t => {
              const s = rewardStatus(record, t, collection, day);
              const ready = s === 'ready';
              const dim = s === 'used' || s === 'unavailable' || s === 'cooldown';
              const word = statusText(s, t, Math.max(0, t.points - balance));
              const ends = s === 'cooldown' ? cooldownEnds(record, t, day) : null;
              const why = ends ? R.all.cooldownLine(shortDate(ends)) : s === 'used' && !t.oneTimeOnly ? R.all.usedLine : null;
              return (
                <Card key={t.id}>
                  <View accessible accessibilityLabel={R.all.tierA11y(t, word)}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}>
                      <T v="kicker" color={C.stone}>
                        {R.all.pointsKicker(t.points)}
                      </T>
                      <T v="meta" color={ready ? C.bone : C.stone}>
                        {word}
                      </T>
                    </View>
                    <T v="list" color={dim ? C.muted : C.bone} style={[LINING, { marginTop: 8 }]}>
                      {t.title}
                    </T>
                    <T v="meta" color={C.stone} style={{ marginTop: 6 }}>
                      {R.all.terms(t)}
                    </T>
                    {why ? (
                      <T v="meta" color={C.muted} style={{ marginTop: 4 }}>
                        {why}
                      </T>
                    ) : null}
                  </View>
                  {ready ? (
                    <View style={{ marginTop: 16 }}>
                      <SmallButton title={R.getCode} onPress={() => take(t)} disabled={busy !== null} accessibilityLabel={`${R.getCode}: ${t.title}`} />
                    </View>
                  ) : null}
                  <RedeemNote text={noteFor(t.id)} />
                </Card>
              );
            })}
            {anyReady && !signedIn ? (
              <T v="note" color={C.stone} style={{ marginTop: 4 }}>
                {R.signInNote}
              </T>
            ) : null}
          </View>
        )}
      </Screen>
      {sheet}
    </View>
  );
}
