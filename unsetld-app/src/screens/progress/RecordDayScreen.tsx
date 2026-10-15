import { useMemo, useState } from 'react';
import { Pressable, ScrollView, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { dayDetail, type LegacyTask } from '../../core/history';
import type { DayKey } from '../../core/time';
import { PROGRESS } from '../../content/copy/progress';
import type { RootProps } from '../../navigation/types';
import { proofImage } from '../../services/proof';
import { useApp } from '../../state/store';
import { Button, NavRow } from '../../ui/kit';
import { clockTime } from '../../ui/ProofStamp';
import { T } from '../../ui/text';
import { color as C, GAP, MARGIN } from '../../ui/tokens';
import { useMissionTitle } from '../titles';
import { hasPhoto, ProofTile, TILE_RADIUS } from './ProofTile';
import { fromDay, openMissions, type ProofView } from './proofView';
import { ProofViewer } from './ProofViewer';

const D = PROGRESS.day;
const H = PROGRESS.history;
/** The thumbnail beside each mission. */
const THUMB = 60;

const timeOf = (at: number) => (at > 0 ? clockTime(at) : '');

/**
 * A mission proven that day: its proof (the photo, the timer's time, or a quiet placeholder once
 * the photo is cleared), the title, the area and time, and "Proven +15". A row whose photo is
 * still on this phone opens it full screen.
 */
function ProvenRow({ p, onOpen }: { p: ProofView; onOpen: () => void }) {
  const time = timeOf(p.doneAt);
  const label = D.a11yRow(p.title, p.area, time, p.points);
  const body = (
    <>
      <ProofTile proof={p} size={THUMB} />
      <View style={{ flex: 1, minWidth: 0 }}>
        <T v="saved" numberOfLines={2}>
          {p.title}
        </T>
        <T v="meta" color={C.stone} style={{ marginTop: 4 }}>
          {D.meta(p.area, time)}
        </T>
      </View>
      <View style={{ alignItems: 'flex-end', gap: 6 }}>
        <T v="kicker" color={C.bone}>
          {D.proven}
        </T>
        <T v="mono" color={C.muted}>
          {D.plus(p.points)}
        </T>
      </View>
    </>
  );
  const row = { flexDirection: 'row' as const, alignItems: 'center' as const, gap: 14 };
  if (!hasPhoto(p)) {
    return (
      <View accessible accessibilityLabel={label} style={row}>
        {body}
      </View>
    );
  }
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityHint={D.a11yRowHint}
      onPress={onOpen}
      style={({ pressed }) => [row, { opacity: pressed ? 0.7 : 1 }]}>
      {body}
    </Pressable>
  );
}

/** A mission the day's plan held that wasn't proven: dim, no points. */
function OpenRow({ title, area, today }: { title: string; area: string; today: boolean }) {
  return (
    <View accessible accessibilityLabel={D.a11yOpen(title, today)} style={{ flexDirection: 'row', alignItems: 'center', gap: 14 }}>
      <View style={{ width: THUMB, height: THUMB, borderRadius: TILE_RADIUS, borderWidth: 1.5, borderColor: C.rule }} />
      <View style={{ flex: 1, minWidth: 0 }}>
        <T v="saved" color={C.stone} numberOfLines={2}>
          {title}
        </T>
        {area ? (
          <T v="meta" color={C.ash} style={{ marginTop: 4 }}>
            {area}
          </T>
        ) : null}
      </View>
      <T v="kicker" color={C.ash}>
        {today ? D.stillToDo : D.notProven}
      </T>
    </View>
  );
}

/** A 2.x task's photo as a proof tile, so one that's gone shows a camera mark, never a broken image. */
function legacyTile(day: DayKey, task: LegacyTask, index: number): ProofView | null {
  if (task.uri === null) return null;
  const photo = { uri: task.uri, takenAt: task.doneAt, kind: 'single' as const, hash: '' };
  return { key: `${day}:legacy:${index}`, day, missionId: '', title: task.text, area: '', points: 0, doneAt: task.doneAt, photos: [photo], cover: photo, timerSeconds: 0 };
}

/**
 * A 2.x task: its text and time, beside its photo while that's still on this phone (a camera
 * mark once it's gone; nothing beside it when there never was one).
 */
function LegacyRow({ day, task, index }: { day: DayKey; task: LegacyTask; index: number }) {
  const time = timeOf(task.doneAt);
  const tile = legacyTile(day, task, index);
  return (
    <View accessible accessibilityLabel={D.a11yLegacy(task.text, time)} style={{ flexDirection: 'row', alignItems: 'center', gap: 14 }}>
      {tile ? <ProofTile proof={tile} size={THUMB} /> : null}
      <View style={{ flex: 1, minWidth: 0 }}>
        <T v="saved">{task.text}</T>
        {time ? (
          <T v="meta" color={C.stone} style={{ marginTop: 4 }}>
            {time}
          </T>
        ) : null}
      </View>
    </View>
  );
}

/**
 * Record › a day: its number and date, how it went ("3 / 3 · Perfect day"), each mission proven
 * in the order proven, what the plan held that wasn't, 2.x tasks on a day from before missions,
 * then the points: the missions, the perfect-day bonus and the total. A photo the retention
 * setting cleared leaves the mission on record with a placeholder.
 */
export function RecordDayScreen({ navigation, route }: RootProps<'RecordDay'>) {
  const { day } = route.params;
  const insets = useSafeAreaInsets();
  const today = useApp(s => s.currentDay);
  const record = useApp(s => s.record);
  const plans = useApp(s => s.plans);
  const [openKey, setOpenKey] = useState<string | null>(null);
  const detail = useMemo(() => dayDetail(record, plans, day), [record, plans, day]);
  const proofs = useMemo(() => detail.proven.map(p => fromDay(day, p)), [detail, day]);
  const isToday = day === today;
  const titleOf = useMissionTitle();
  // 2.x put a day on record without a mission (record.days); nothing proven on it since.
  const legacyDay = proofs.length === 0 && day <= today && Boolean(record.days?.[day]);
  const status = D.status({ proven: proofs.length, planned: detail.planned, perfect: detail.perfect, legacy: legacyDay, today: isToday });
  // What the plan held that wasn't proven; a mission retired since shows by the title it had.
  const open = openMissions(detail.open, plans[day]?.missions, titleOf);
  const legacy = detail.legacy.filter(t => t.text.trim());
  // The privacy line only while a photo shown here is still on this phone (cleared ones are nothing to keep private).
  const photos = proofs.some(hasPhoto) || legacy.some(t => Boolean(t.uri && proofImage(t.uri)));
  const viewing = openKey ? (proofs.find(p => p.key === openKey) ?? null) : null;
  // popTo, not navigate: navigate from a stack screen pushes a second tab navigator on top of this page.
  const back = () => (navigation.canGoBack() ? navigation.goBack() : navigation.popTo('Main', { screen: 'Record' }));

  return (
    <View style={{ flex: 1, backgroundColor: C.ink }}>
      <NavRow onBack={back} />
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingHorizontal: MARGIN, paddingBottom: insets.bottom + 40 }}>
        <View style={{ marginTop: 24 }}>
          {detail.number ? (
            <T v="kicker" color={C.stone} style={{ marginBottom: 10 }}>
              {D.number(detail.number)}
            </T>
          ) : null}
          <T v="title.l" accessibilityRole="header">
            {D.title(day, today)}
          </T>
          <T v="saved" color={detail.perfect ? C.bone : C.muted} style={{ marginTop: 10 }}>
            {status}
          </T>
          {isToday && proofs.length === 0 ? (
            <Button title={D.goToday} onPress={() => navigation.popTo('Main', { screen: 'Today' })} style={{ marginTop: GAP.block }} />
          ) : null}
        </View>

        {proofs.length || open.length || legacy.length ? (
          <View style={{ marginTop: GAP.section, gap: 20 }}>
            {proofs.map(p => (
              <ProvenRow key={p.key} p={p} onOpen={() => setOpenKey(p.key)} />
            ))}
            {open.map(o => (
              <OpenRow key={o.id} title={o.title} area={o.area} today={isToday} />
            ))}
            {legacy.map((t, i) => (
              <LegacyRow key={`${t.doneAt}-${i}`} day={day} task={t} index={i} />
            ))}
          </View>
        ) : null}

        {/* The points: the missions, the perfect-day bonus, the total. Right-aligned, tabular. */}
        {proofs.length ? (
          <View style={{ marginTop: GAP.section, gap: 12 }}>
            {detail.bonus > 0 ? (
              <View accessible accessibilityLabel={D.a11yBonus(detail.bonus)} style={{ flexDirection: 'row', alignItems: 'baseline', justifyContent: 'space-between', gap: 12 }}>
                <T v="meta" color={C.stone}>
                  {D.bonus}
                </T>
                <T v="mono" color={C.muted}>
                  {D.plus(detail.bonus)}
                </T>
              </View>
            ) : null}
            <View accessible accessibilityLabel={D.a11yTotal(detail.total)} style={{ flexDirection: 'row', alignItems: 'baseline', justifyContent: 'space-between', gap: 12 }}>
              <T v="kicker" color={C.stone}>
                {D.total}
              </T>
              <View style={{ flexDirection: 'row', alignItems: 'baseline', gap: 6 }}>
                <T v="stat">{D.plus(detail.total)}</T>
                <T v="meta" color={C.stone}>
                  {D.pts}
                </T>
              </View>
            </View>
          </View>
        ) : null}

        {photos ? (
          <T v="note" color={C.stone} style={{ marginTop: GAP.block }}>
            {H.privacy}
          </T>
        ) : null}
      </ScrollView>
      {viewing ? <ProofViewer proof={viewing} onClose={() => setOpenKey(null)} /> : null}
    </View>
  );
}
