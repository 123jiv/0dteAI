import * as Clipboard from 'expo-clipboard';
import { useState } from 'react';
import { Linking, Platform, Pressable, Text, TextInput, View } from 'react-native';
import { AppConfig } from '../config/app';
import { claimStatus, rankIndex, rankProgress, shieldsLeft } from '../core/rank';
import { hash32 } from '../core/random';
import { addDays, diffDays, parseDay, weekStart } from '../core/time';
import { MISSIONS, ONBOARDING, RANK_CONFIG } from '../content';
import type { TabProps } from '../navigation/types';
import { getDayOffset } from '../services/clock';
import { success } from '../services/haptics';
import { requestNotifications } from '../services/notifications';
import { useApp } from '../state/store';
import { Button, Card, Chip, ProgressBar, Screen, SectionLabel, T, ToggleRow } from '../ui/components';
import { Icon } from '../ui/icons';
import { Sheet } from '../ui/overlays';
import { RankEmblem } from '../ui/RankEmblem';
import { fonts, radius, space, useTheme } from '../ui/theme';

export function RankScreen({ navigation }: TabProps<'Rank'>) {
  const theme = useTheme();
  const progress = useApp(s => s.progress);
  const settings = useApp(s => s.settings);
  const setNN = useApp(s => s.setNonNegotiable);
  const completeMission = useApp(s => s.completeMission);
  const claimCode = useApp(s => s.claimCode);
  const update = useApp(s => s.updateSettings);
  const pushToast = useApp(s => s.pushToast);
  const day = useApp(s => s.currentDay);
  const rec = progress.days[day];
  const ri = rankIndex(RANK_CONFIG, progress.rankXP);
  const rank = RANK_CONFIG.ranks[ri];
  const prog = rankProgress(RANK_CONFIG, progress.rankXP);
  const shields = shieldsLeft(progress, RANK_CONFIG, day);

  const [nnOpen, setNnOpen] = useState(false);
  const [nnText, setNnText] = useState('');
  const [code, setCode] = useState<{ code: string; percent: number; expires: string } | null>(null);
  const [dropSheet, setDropSheet] = useState(false);

  const tagged = MISSIONS.filter(m => m.tags.some(t => settings.struggles.includes(t)));
  const missionPool = tagged.length >= 3 ? tagged : MISSIONS;
  const mission = missionPool[hash32(`${progress.installSalt}:mission:${day}`) % missionPool.length];

  // The browser preview can't read server time, and time travel fakes the date.
  const preview = Platform.OS === 'web' || getDayOffset() !== 0;
  const claim = claimStatus(progress, RANK_CONFIG, day, { rankSync: AppConfig.rankSyncEnabled, skipVerification: preview });

  const week = weekStart(day);
  const weekDots = Array.from({ length: 7 }, (_, i) => {
    const d = addDays(week, i);
    const r = progress.days[d];
    return { d, done: Boolean(r?.line && r?.nonNegotiable), future: diffDays(day, d) > 0 };
  });

  const missedRun = progress.lastOpenDay && progress.lastOpenDay !== day ? diffDays(progress.lastOpenDay, day) - 1 : 0;

  return (
    <Screen scroll>
      <View style={{ alignItems: 'center', marginTop: space.xl }}>
        <RankEmblem rank={ri} size={104} color={theme.text} />
        <T variant="label" style={{ marginTop: space.lg }}>
          Your rank
        </T>
        <T variant="title" center style={{ fontSize: 40, lineHeight: 44, marginTop: 4 }}>
          {rank.name}
        </T>
        <View style={{ alignSelf: 'stretch', marginTop: space.lg }}>
          <ProgressBar fraction={prog.fraction} />
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginTop: space.sm }}>
            <T variant="caption">{`${progress.rankXP.toLocaleString()} XP`}</T>
            <T variant="caption">{prog.next ? `${prog.toNext.toLocaleString()} to ${prog.next.name}` : 'Top rank. Hold it.'}</T>
          </View>
        </View>
      </View>

      {progress.comeback ? (
        <Card style={{ marginTop: space.lg, borderColor: theme.accent }}>
          <T variant="h2">Comeback mode</T>
          <T variant="muted" style={{ marginTop: 4 }}>
            {`Double XP on daily actions until you win back ${progress.comeback.remaining} XP.`}
          </T>
        </Card>
      ) : null}

      <View style={{ flexDirection: 'row', gap: space.md, marginTop: space.lg }}>
        <Stat icon="flame" label="Streak" value={`${progress.streak}d`} sub={`Best ${progress.bestStreak}d`} />
        <Stat icon="shield" label="Shields" value={`${shields}`} sub="left this month" />
        <Stat icon="bolt" label="Lifetime" value={`${progress.lifetimeXP.toLocaleString()}`} sub="XP, never decays" />
      </View>
      {missedRun > 0 ? (
        <T variant="caption" style={{ marginTop: space.sm }} color={theme.danger}>
          {`You've missed ${missedRun} day${missedRun > 1 ? 's' : ''}. Open today's line to stop the slide.`}
        </T>
      ) : null}

      <SectionLabel>{"Today's work"}</SectionLabel>
      <Card style={{ gap: 0, paddingVertical: space.sm }}>
        <TaskRow done={Boolean(rec?.line)} title="Read today's line" xp={RANK_CONFIG.xp.line} onPress={() => navigation.navigate('Today')} />
        <TaskRow
          done={Boolean(rec?.nonNegotiable)}
          title={rec?.nonNegotiable ? `Non-negotiable: ${rec.nonNegotiable}` : "Set today's non-negotiable"}
          xp={RANK_CONFIG.xp.nonNegotiable}
          onPress={() => {
            setNnText(rec?.nonNegotiable ?? '');
            setNnOpen(true);
          }}
        />
        <TaskRow
          done={Boolean(rec?.mission)}
          title={mission.text}
          sub="Today's mission"
          xp={RANK_CONFIG.xp.mission}
          last
          onPress={() => {
            if (rec?.mission) return;
            completeMission(mission.id);
            success();
          }}
          actionLabel="Done"
        />
      </Card>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: space.sm, marginTop: space.md }}>
        <T variant="caption" style={{ flex: 1 }}>
          {`Full week (line + non-negotiable, Mon–Sun): +${RANK_CONFIG.xp.fullWeek} XP`}
        </T>
        <View style={{ flexDirection: 'row', gap: 4 }}>
          {weekDots.map(w => (
            <View
              key={w.d}
              accessibilityLabel={`${parseDay(w.d).toDateString()}: ${w.done ? 'done' : 'not done'}`}
              style={{ width: 10, height: 10, borderRadius: 5, backgroundColor: w.done ? theme.accent : w.future ? 'transparent' : theme.border, borderWidth: 1, borderColor: theme.border }}
            />
          ))}
        </View>
      </View>

      <SectionLabel>UNSETLD perks</SectionLabel>
      <Card style={{ gap: space.md }}>
        {claim.ok ? (
          <>
            <T variant="h2">{`${claim.percent}% off is unlocked`}</T>
            <T variant="muted">You earned this by showing up. One code per order, $60 minimum.</T>
            <Button
              title={`Claim ${claim.percent}% code`}
              onPress={() => {
                const res = claimCode({ skipVerification: preview });
                if ('error' in res) pushToast(res.error, 'warn');
                else {
                  success();
                  setCode(res);
                }
              }}
            />
          </>
        ) : (
          <>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: space.sm }}>
              <Icon name="lock" size={16} color={theme.muted} />
              <T variant="h2">{claim.percent ? `${claim.percent}% code` : 'Discount codes'}</T>
            </View>
            <T variant="muted">
              {claim.reason}
              {'nextDay' in claim && claim.nextDay ? ` Next one: ${parseDay(claim.nextDay).toDateString()}.` : ''}
            </T>
          </>
        )}
        <ToggleRow
          title="Drop alerts"
          sub="Get told first when UNSETLD drops. Off by default."
          value={settings.dropAlerts}
          onChange={v => (v ? setDropSheet(true) : update({ dropAlerts: false }))}
        />
        <Pressable accessibilityRole="link" onPress={() => Linking.openURL(AppConfig.storeUrl).catch(() => {})} style={{ flexDirection: 'row', alignItems: 'center', gap: space.sm }}>
          <Icon name="bag" size={16} color={theme.muted} />
          <Text style={{ color: theme.muted, fontFamily: fonts.sansMedium, fontSize: 14 }}>unsetld.com</Text>
        </Pressable>
      </Card>

      <SectionLabel>The ladder</SectionLabel>
      <View style={{ gap: space.sm }}>
        {RANK_CONFIG.ranks.map((r, i) => {
          const reached = i <= ri;
          return (
            <View
              key={r.id}
              style={{
                flexDirection: 'row',
                gap: space.md,
                padding: space.md,
                borderRadius: radius.md,
                borderWidth: 1,
                borderColor: i === ri ? theme.accent : theme.border,
                backgroundColor: theme.surface,
                opacity: reached ? 1 : 0.75,
              }}>
              <RankEmblem rank={i} size={44} color={theme.text} locked={!reached} dim={theme.muted} />
              <View style={{ flex: 1 }}>
                <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                  <Text style={{ color: theme.text, fontFamily: fonts.sansSemi, fontSize: 14, letterSpacing: 1 }}>{r.name}</Text>
                  <T variant="caption">{`${r.xp.toLocaleString()} XP · ${r.approx}`}</T>
                </View>
                {r.perks.map(p => (
                  <T key={p} variant="caption" style={{ marginTop: 3 }} color={reached ? theme.text : theme.muted}>
                    {`· ${p}`}
                  </T>
                ))}
                {r.needsRankSync && !AppConfig.rankSyncEnabled ? (
                  <T variant="caption" style={{ marginTop: 4 }} color={theme.accent}>
                    Discount tier unlocks with Rank Sync (coming soon)
                  </T>
                ) : null}
              </View>
            </View>
          );
        })}
      </View>
      <Pressable accessibilityRole="link" onPress={() => navigation.navigate('Legal', { doc: 'rewards' })} style={{ marginTop: space.lg, alignSelf: 'center' }}>
        <Text style={{ color: theme.muted, fontFamily: fonts.sansMedium, fontSize: 13, textDecorationLine: 'underline' }}>
          How rank, decay and codes work
        </Text>
      </Pressable>

      <Sheet visible={nnOpen} onClose={() => setNnOpen(false)}>
        <T variant="h2">{"Today's non-negotiable"}</T>
        <T variant="muted" style={{ marginTop: 4 }}>
          {"One thing you'll do today, no matter what."}
        </T>
        <TextInput
          value={nnText}
          onChangeText={setNnText}
          placeholder="e.g. Train"
          placeholderTextColor={theme.muted}
          maxLength={60}
          autoFocus
          accessibilityLabel="Today's non-negotiable"
          style={{
            marginTop: space.lg,
            borderWidth: 1,
            borderColor: theme.border,
            borderRadius: radius.md,
            padding: space.md,
            color: theme.text,
            fontFamily: fonts.sans,
            fontSize: 17,
          }}
        />
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: space.sm, marginTop: space.md }}>
          {ONBOARDING.nonNegotiables.map(n => (
            <Chip key={n} label={n} selected={nnText === n} onPress={() => setNnText(n)} />
          ))}
        </View>
        <Button
          title={rec?.nonNegotiable ? 'Update' : `Lock it in · +${RANK_CONFIG.xp.nonNegotiable} XP`}
          disabled={!nnText.trim()}
          onPress={() => {
            setNN(nnText);
            setNnOpen(false);
          }}
          style={{ marginTop: space.xl }}
        />
      </Sheet>

      <Sheet visible={Boolean(code)} onClose={() => setCode(null)}>
        <T variant="label" color={theme.accent}>
          {`${code?.percent ?? 0}% off · unsetld.com`}
        </T>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={`Code ${code?.code}. Tap to copy.`}
          onPress={async () => {
            if (!code) return;
            await Clipboard.setStringAsync(code.code).catch(() => {});
            pushToast('Code copied', 'info');
          }}
          style={{ marginTop: space.md, borderWidth: 1, borderStyle: 'dashed', borderColor: theme.accent, borderRadius: radius.md, padding: space.lg, alignItems: 'center' }}>
          <Text selectable style={{ color: theme.text, fontFamily: fonts.sansBold, fontSize: 24, letterSpacing: 2 }}>
            {code?.code}
          </Text>
          <T variant="caption" style={{ marginTop: 4 }}>
            Tap to copy
          </T>
        </Pressable>
        <T variant="caption" style={{ marginTop: space.md }}>
          {`Expires ${code ? parseDay(code.expires).toDateString() : ''}. One per customer, $${RANK_CONFIG.claims.minOrder} minimum, no stacking. Not valid on new drops for 72 hours.`}
        </T>
        <Button title="Shop unsetld.com" icon="bag" onPress={() => Linking.openURL(AppConfig.shopUrl).catch(() => {})} style={{ marginTop: space.lg }} />
      </Sheet>

      <Sheet visible={dropSheet} onClose={() => setDropSheet(false)}>
        <T variant="h2">Turn on drop alerts?</T>
        <T variant="muted" style={{ marginTop: space.sm }}>
          These are marketing notifications from UNSETLD: new drops and early access, nothing else. Separate from your daily reminders. Turn them off anytime here.
        </T>
        <Button
          title="Yes, alert me on drops"
          style={{ marginTop: space.xl }}
          onPress={async () => {
            await requestNotifications();
            update({ dropAlerts: true });
            setDropSheet(false);
          }}
        />
        <Button title="No thanks" variant="ghost" onPress={() => setDropSheet(false)} />
      </Sheet>
    </Screen>
  );
}

function Stat({ icon, label, value, sub }: { icon: 'flame' | 'shield' | 'bolt'; label: string; value: string; sub: string }) {
  const theme = useTheme();
  return (
    <Card style={{ flex: 1, padding: space.md }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
        <Icon name={icon} size={14} color={theme.accent} />
        <T variant="label">{label}</T>
      </View>
      <Text style={{ color: theme.text, fontFamily: fonts.sansSemi, fontSize: 24, marginTop: 6 }}>{value}</Text>
      <T variant="caption" style={{ fontSize: 11 }}>
        {sub}
      </T>
    </Card>
  );
}

function TaskRow({
  done,
  title,
  sub,
  xp,
  onPress,
  last,
  actionLabel,
}: {
  done: boolean;
  title: string;
  sub?: string;
  xp: number;
  onPress: () => void;
  last?: boolean;
  actionLabel?: string;
}) {
  const theme = useTheme();
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ checked: done }}
      accessibilityLabel={`${title}. ${done ? 'Done' : `${xp} XP`}`}
      onPress={onPress}
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        gap: space.md,
        paddingVertical: space.md,
        borderBottomWidth: last ? 0 : 1,
        borderBottomColor: theme.border,
      }}>
      <View
        style={{
          width: 24,
          height: 24,
          borderRadius: 12,
          borderWidth: 1.5,
          borderColor: done ? theme.accent : theme.muted,
          backgroundColor: done ? theme.accent : 'transparent',
          alignItems: 'center',
          justifyContent: 'center',
        }}>
        {done ? <Icon name="check" size={14} color={theme.onAccent} /> : null}
      </View>
      <View style={{ flex: 1 }}>
        {sub ? <T variant="label">{sub}</T> : null}
        <T variant="body" style={{ textDecorationLine: done ? 'line-through' : 'none', color: done ? theme.muted : theme.text }}>
          {title}
        </T>
      </View>
      {done ? (
        <T variant="caption">{`+${xp}`}</T>
      ) : actionLabel ? (
        <View style={{ paddingHorizontal: 12, paddingVertical: 6, borderRadius: radius.pill, backgroundColor: theme.accent }}>
          <Text style={{ color: theme.onAccent, fontFamily: fonts.sansSemi, fontSize: 12 }}>{`${actionLabel} +${xp}`}</Text>
        </View>
      ) : (
        <T variant="caption" color={theme.accent}>{`+${xp} XP`}</T>
      )}
    </Pressable>
  );
}
