import { View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { cooldownEnds, nextStatus, pointsEarned, rewardStatus, statusAccess, upNext } from '../../core/rewards';
import { shortDate } from '../../core/time';
import type { RewardTier } from '../../core/types';
import { REWARDS_COPY } from '../../content/copy/rewards';
import type { TabProps } from '../../navigation/types';
import { useBalance, useNextReward, useRewardTiers } from '../../state/missions';
import { useAccessEnabled, useApp } from '../../state/store';
import { Card, LinkRow, Meter } from '../../ui/blocks';
import { Icon } from '../../ui/icons';
import { Button, Screen } from '../../ui/kit';
import { T } from '../../ui/text';
import { color as C, GAP } from '../../ui/tokens';
import { accessDays, accessRecord, useStatusTiers } from '../access';
import { LINING, RedeemNote, useRedeem } from './redeem';

const R = REWARDS_COPY;

/** When nothing is open: every reward cooling down, taken this collection, or none switched on. */
function nothingOpenText(statuses: { tier: RewardTier; status: ReturnType<typeof rewardStatus> }[], ends: (t: RewardTier) => string | null): string {
  const cooling = statuses
    .filter(s => s.status === 'cooldown')
    .map(s => ends(s.tier))
    .filter((d): d is string => Boolean(d))
    .sort();
  if (cooling.length) return R.coolingNext(shortDate(cooling[0]));
  return statuses.some(s => s.status === 'used') ? R.allTaken : R.noneOpen;
}

/**
 * Rewards (docs/UX_REDESIGN.md section 9): points, the next reward with its meter (and
 * "Get the code" once it's ready), the two after it, links to every reward, your codes and
 * how points work, and a separate UNSETLD status card. No rules on this page: How points
 * work holds them. With rewards switched off (accessEnabled false) only the points and how
 * they're earned show.
 */
export function RewardsScreen({ navigation }: TabProps<'Rewards'>) {
  const insets = useSafeAreaInsets();
  const record = useApp(s => s.record);
  const day = useApp(s => s.currentDay);
  const collection = useApp(s => s.remote.collection);
  const signedIn = useApp(s => Boolean(s.account.userId));
  const accessEnabled = useAccessEnabled();
  const balance = useBalance();
  const tiers = useRewardTiers();
  const next = useNextReward(day);
  const status = useStatusTiers();
  const { busy, noteFor, take, sheet } = useRedeem(() => navigation.navigate('Account'));

  const earned = pointsEarned(record) > 0;
  const codes = (record.redemptions?.length ?? 0) + (Array.isArray(record.codes) ? record.codes.length : 0);
  const later = next ? upNext(record, tiers, collection, day, next.tier) : [];

  // Status counts active days on the record as Access sees it.
  const ar = accessRecord(record);
  const activeN = accessDays(record);
  const nextTier = nextStatus(activeN, status);
  const paused = statusAccess(ar, day, status).paused && status.some(t => t.pausable && activeN >= t.day);

  return (
    <View style={{ flex: 1, backgroundColor: C.ink }}>
      <Screen nav={<View style={{ height: insets.top + 8 }} />}>
        <T v="title.l" accessibilityRole="header" style={{ marginTop: 24 }}>
          {R.title}
        </T>

        {earned ? (
          <View style={{ marginTop: 14, flexDirection: 'row', alignItems: 'baseline', gap: 10 }} accessible accessibilityLabel={R.balanceA11y(balance)}>
            <T v="letter.day" style={LINING}>
              {R.number(balance)}
            </T>
            <T v="meta" color={C.stone}>
              {R.pointsUnit(balance)}
            </T>
          </View>
        ) : (
          <T v="saved" color={C.muted} style={{ marginTop: 14 }}>
            {R.firstPoints}
          </T>
        )}

        {accessEnabled ? (
          <>
            {next ? (
              <Card style={{ marginTop: GAP.block }}>
                {/* One element for screen readers (title, progress, what it gives); the button stays its own. */}
                <View accessible accessibilityLabel={next.ready ? `${R.nextA11y(next.tier.title, next.have, next.tier.points)}. ${R.readyLine(next.tier)}` : R.nextA11y(next.tier.title, next.have, next.tier.points)}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
                    <T v="kicker" color={C.stone}>
                      {R.next}
                    </T>
                    {next.ready ? (
                      <T v="meta" color={C.bone}>
                        {R.ready}
                      </T>
                    ) : null}
                  </View>
                  <T v="title.m" style={[LINING, { marginTop: 10 }]}>
                    {next.tier.title}
                  </T>
                  <View style={{ marginTop: 16 }}>
                    <Meter value={next.have} max={next.tier.points} />
                  </View>
                  <T v="meta" color={next.ready ? C.muted : C.stone} style={{ marginTop: 10 }}>
                    {next.ready ? R.readyLine(next.tier) : earned ? R.progress(next.have, next.tier.points) : R.progressFirst(next.tier.points)}
                  </T>
                </View>
                {next.ready ? (
                  <>
                    <Button title={R.getCode} onPress={() => take(next.tier)} disabled={busy !== null} style={{ marginTop: 20 }} />
                    {!signedIn ? (
                      <T v="note" color={C.stone} style={{ marginTop: 10 }}>
                        {R.signInNote}
                      </T>
                    ) : null}
                  </>
                ) : null}
                <RedeemNote text={noteFor(next.tier.id)} />
              </Card>
            ) : (
              <Card style={{ marginTop: GAP.block }}>
                <T v="kicker" color={C.stone}>
                  {R.next}
                </T>
                <T v="small" color={C.muted} style={{ marginTop: 10 }}>
                  {nothingOpenText(
                    tiers.map(t => ({ tier: t, status: rewardStatus(record, t, collection, day) })),
                    t => cooldownEnds(record, t, day),
                  )}
                </T>
              </Card>
            )}

            {later.length ? (
              <Card style={{ marginTop: GAP.card }}>
                <T v="kicker" color={C.stone} accessibilityRole="header">
                  {R.upNext}
                </T>
                <View style={{ marginTop: 12, gap: 8 }}>
                  {later.map(t => (
                    <View key={t.id} style={{ flexDirection: 'row', alignItems: 'baseline', gap: 14 }} accessible accessibilityLabel={R.upNextA11y(t.title, t.points)}>
                      <T v="list" style={[LINING, { minWidth: 72 }]}>
                        {R.number(t.points)}
                      </T>
                      <T v="small" color={C.muted} style={{ flex: 1 }}>
                        {t.title}
                      </T>
                    </View>
                  ))}
                </View>
              </Card>
            ) : null}

            <View style={{ marginTop: GAP.block - 6 }}>
              <LinkRow title={R.links.all} onPress={() => navigation.navigate('AllRewards')} />
              <LinkRow title={R.links.history} value={codes ? R.links.historyValue(codes) : undefined} onPress={() => navigation.navigate('RewardHistory')} />
              <LinkRow title={R.links.how} onPress={() => navigation.navigate('HowPoints')} />
            </View>

            {status.length ? (
              <Card
                style={{ marginTop: GAP.block - 6 }}
                onPress={() => navigation.navigate('Status')}
                accessibilityLabel={nextTier ? R.statusCard.a11y(nextTier.title, activeN, nextTier.day) : R.statusCard.a11yAll(activeN)}>
                <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
                  <T v="kicker" color={C.stone}>
                    {R.statusCard.kicker}
                  </T>
                  <Icon name="chevron-right" size={18} color={C.stone} />
                </View>
                {nextTier ? (
                  <>
                    <T v="list" style={[LINING, { marginTop: 8 }]}>
                      {R.statusCard.next(nextTier.title)}
                    </T>
                    <View style={{ marginTop: 14 }}>
                      <Meter value={activeN} max={nextTier.day} />
                    </View>
                    <T v="meta" color={C.stone} style={{ marginTop: 10 }}>
                      {R.statusCard.progress(activeN, nextTier.day)}
                    </T>
                  </>
                ) : (
                  <>
                    <T v="list" style={{ marginTop: 8 }}>
                      {R.statusCard.allReachedTitle}
                    </T>
                    <T v="meta" color={C.stone} style={{ marginTop: 6 }}>
                      {R.statusCard.allReached(activeN)}
                    </T>
                  </>
                )}
                {paused ? (
                  <T v="meta" color={C.stone} style={{ marginTop: 4 }}>
                    {R.statusCard.paused}
                  </T>
                ) : null}
              </Card>
            ) : null}
          </>
        ) : (
          <>
            {earned ? (
              <T v="small" color={C.stone} style={{ marginTop: GAP.block }}>
                {R.off}
              </T>
            ) : null}
            <View style={{ marginTop: GAP.block - 6 }}>
              <LinkRow title={R.links.how} onPress={() => navigation.navigate('HowPoints')} />
            </View>
          </>
        )}
        <View style={{ height: 24 }} />
      </Screen>
      {sheet}
    </View>
  );
}
