import { useMemo, useState } from 'react';
import { FlatList, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { proofMonths } from '../../core/progress';
import { PROGRESS } from '../../content/copy/progress';
import type { RootProps } from '../../navigation/types';
import { useApp } from '../../state/store';
import { EmptyState } from '../../ui/blocks';
import { NavRow, PageTitle, Segmented } from '../../ui/kit';
import { T } from '../../ui/text';
import { color as C, GAP, MARGIN } from '../../ui/tokens';
import { useLayoutWidth } from './measure';
import { ProofTile, tileState } from './ProofTile';
import { HISTORY_BY, proofSections, type HistoryBy, type ProofSection, type ProofView } from './proofView';
import { ProofViewer } from './ProofViewer';

const H = PROGRESS.history;
const TILE_GAP = 6;

type Row = { type: 'section'; key: string; section: ProofSection } | { type: 'grid'; key: string; proofs: ProofView[] };

/** Sections and rows of three, for one virtualized list. */
function rowsOf(sections: readonly ProofSection[]): Row[] {
  const rows: Row[] = [];
  for (const s of sections) {
    rows.push({ type: 'section', key: s.key, section: s });
    for (let i = 0; i < s.proofs.length; i += 3) rows.push({ type: 'grid', key: `${s.key}:${i}`, proofs: s.proofs.slice(i, i + 3) });
  }
  return rows;
}

/** A section's head: a month over its counts, or a mission or an area with its count beside it. */
function SectionHead({ s }: { s: ProofSection }) {
  if (s.month) {
    return (
      <View style={{ marginTop: GAP.section, marginBottom: 14 }} accessible accessibilityRole="header" accessibilityLabel={s.said}>
        <T v="title.m">{s.title}</T>
        <T v="meta" color={C.stone} style={{ marginTop: 4 }}>
          {s.meta}
        </T>
      </View>
    );
  }
  return (
    <View
      style={{ marginTop: GAP.block + 4, marginBottom: 12, flexDirection: 'row', alignItems: 'baseline', justifyContent: 'space-between', gap: 12 }}
      accessible
      accessibilityRole="header"
      accessibilityLabel={s.said}>
      <T v="list" style={{ flex: 1 }}>
        {s.title}
      </T>
      <T v="meta" color={C.stone}>
        {s.meta}
      </T>
    </View>
  );
}

/**
 * Proof history (§8): every proven mission as a private visual record, by month, by mission or
 * by area. Photos the retention setting cleared, and timer-only proofs, keep their place as quiet
 * tiles with the mission, area and date. Tap one for the viewer: the photo with its stamp, what
 * it proved and when, and a way to its day on the record.
 */
export function ProofHistoryScreen({ navigation }: RootProps<'ProofHistory'>) {
  const insets = useSafeAreaInsets();
  const record = useApp(s => s.record);
  const today = useApp(s => s.currentDay);
  const keepDays = useApp(s => s.settings.proofRetentionDays);
  const [frame, onLayout] = useLayoutWidth();
  const [by, setBy] = useState<HistoryBy>('date');
  const [openKey, setOpenKey] = useState<string | null>(null);
  const thisYear = today.slice(0, 4);
  const months = useMemo(() => proofMonths(record), [record]);
  const sections = useMemo(() => proofSections(by, months, thisYear), [by, months, thisYear]);
  const rows = useMemo(() => rowsOf(sections), [sections]);
  const open = openKey ? (sections.flatMap(s => s.proofs).find(p => p.key === openKey) ?? null) : null;
  const size = Math.floor((frame - MARGIN * 2 - TILE_GAP * 2) / 3);
  const back = () => (navigation.canGoBack() ? navigation.goBack() : navigation.popTo('Main', { screen: 'Record' }));

  return (
    <View style={{ flex: 1, backgroundColor: C.ink }} onLayout={onLayout}>
      <NavRow onBack={back} />
      <FlatList
        data={rows}
        keyExtractor={r => r.key}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingHorizontal: MARGIN, paddingBottom: insets.bottom + 40 }}
        ListHeaderComponent={
          <View>
            <PageTitle title={H.title} />
            <T v="meta" color={C.stone} style={{ marginTop: 10 }}>
              {H.privacy}
            </T>
            {rows.length ? (
              <Segmented
                options={HISTORY_BY}
                value={by}
                onChange={setBy}
                labels={H.by}
                role="tabs"
                accessibilityLabel={H.a11yBy}
                style={{ marginTop: GAP.block - 4 }}
              />
            ) : null}
          </View>
        }
        ListEmptyComponent={
          <View style={{ marginTop: GAP.block }}>
            <EmptyState title={H.empty.title} body={H.empty.body} />
          </View>
        }
        ListFooterComponent={
          rows.length ? (
            <T v="note" color={C.stone} style={{ marginTop: GAP.block }}>
              {H.keep(keepDays)}
            </T>
          ) : null
        }
        renderItem={({ item }) =>
          item.type === 'section' ? (
            <SectionHead s={item.section} />
          ) : (
            <View style={{ flexDirection: 'row', gap: TILE_GAP, marginBottom: TILE_GAP }}>
              {item.proofs.map(p => (
                <ProofTile
                  key={p.key}
                  proof={p}
                  size={size}
                  name={by === 'mission' ? 'area' : 'title'}
                  label={H.a11yTile(p.title, p.area, p.day, today, tileState(p), p.timerSeconds)}
                  hint={H.a11yTileHint}
                  onPress={() => setOpenKey(p.key)}
                />
              ))}
            </View>
          )
        }
      />
      {open ? <ProofViewer proof={open} onClose={() => setOpenKey(null)} onOpenDay={() => navigation.navigate('RecordDay', { day: open.day })} /> : null}
    </View>
  );
}
