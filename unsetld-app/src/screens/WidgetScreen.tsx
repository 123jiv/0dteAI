import { LinearGradient } from 'expo-linear-gradient';
import { useState, type ReactNode } from 'react';
import { StyleSheet, useWindowDimensions, View } from 'react-native';
import type { Mission } from '../core/types';
import { COLORWAYS, MISSION_BY_ID, TRACK_BY_ID } from '../content';
import { HOME } from '../content/copy/home';
import { PLATFORM } from '../content/copy/platform';
import type { RootProps } from '../navigation/types';
import { Card, SectionLabel } from '../ui/blocks';
import { NavRow, PageTitle, Screen, Segmented } from '../ui/kit';
import { T } from '../ui/text';
import { color as C, GAP, hairline, MARGIN, radius, type TextVariant } from '../ui/tokens';
import { Walker } from '../ui/Walker';

const G = PLATFORM.widgetGuide;
const W = PLATFORM.widgets;
type Tab = 'lock' | 'home';
const TABS: Tab[] = ['lock', 'home'];

// ---------------------------------------------------------------------------
// The preview: the 3.0 widgets drawn from the same copy the real ones use, on
// an example day (Make Your Bed proven, Study for 30 Minutes next). Drawn rather
// than photographed so it always matches what the widgets say.

/** The example day, in plan order. Missing ids (a library change) drop out. */
const SAMPLE: Mission[] = ['discipline-make-your-bed', 'school-study-30', 'fitness-workout']
  .map(id => MISSION_BY_ID[id])
  .filter((m): m is Mission => Boolean(m));
const NEXT = SAMPLE[1] ?? SAMPLE[0] ?? null;
/** Next mission: the title, then "School · 30 min · +15" as Home and the real widget show it. */
const LINE = NEXT
  ? {
      heading: W.next,
      title: NEXT.title,
      meta: HOME.meta(TRACK_BY_ID[NEXT.track]?.short ?? '', NEXT.minutes, NEXT.points, null),
      progress: W.count(1, SAMPLE.length),
    }
  : { heading: W.today, title: W.waiting(3), meta: '', progress: '' };

/**
 * 28 days, oldest first (see RecordWidgetProps.bars): a missed day early on,
 * then a day an Off Day covered, then the 16-day streak up to today.
 */
const BARS = ' '.repeat(5) + 'ooooo-ooooo' + 'c' + 'o'.repeat(10) + 't';

/** The Black colorway: the widgets' look for everyone. */
const BLACK = COLORWAYS[0];
const WALLPAPER = ['#3A3632', '#1C1A18', '#0B0B0A'] as const;
const WHITE = '#FFFFFF';
const WHITE_DIM = 'rgba(255,255,255,0.68)';

/** Illustration text: sized to the picture, so it doesn't grow with Dynamic Type. */
function P({
  v,
  size,
  lh,
  ls,
  color,
  lines = 1,
  children,
}: {
  v: TextVariant;
  size: number;
  lh?: number;
  ls?: number;
  color: string;
  lines?: number;
  children: ReactNode;
}) {
  return (
    <T
      v={v}
      color={color}
      maxFontSizeMultiplier={1}
      numberOfLines={lines}
      style={{ fontSize: size, lineHeight: lh ?? Math.round(size * 1.22), ...(ls !== undefined ? { letterSpacing: ls } : null) }}>
      {children}
    </T>
  );
}

function Bars({ s, ink, secondary }: { s: number; ink: string; secondary: string }) {
  return (
    <View style={{ flexDirection: 'row', alignItems: 'flex-end', height: 18 * s, marginTop: 10 * s }}>
      {BARS.split('').map((b, i) => (
        <View
          key={i}
          style={{
            width: 2 * s,
            marginRight: 1.5 * s,
            height: (b === 'o' || b === 't' ? 18 : b === 'c' ? 9 : 3) * s,
            backgroundColor: b === 't' ? C.signal : b === 'o' ? ink : b === ' ' ? 'transparent' : secondary,
          }}
        />
      ))}
    </View>
  );
}

/** A Home Screen widget on the Black colorway, with the app's name under it. */
function HomeWidget({ s, width, children }: { s: number; width: number; children: ReactNode }) {
  return (
    <View style={{ width, alignItems: 'center' }}>
      <View
        style={{
          width,
          height: 158 * s,
          borderRadius: 22 * s,
          backgroundColor: BLACK.bg,
          borderWidth: hairline,
          borderColor: 'rgba(255,255,255,0.08)',
          padding: 16 * s,
          overflow: 'hidden',
        }}>
        {children}
      </View>
      <View style={{ marginTop: 6 * s }}>
        <P v="note" size={11 * s} color={WHITE}>
          {G.preview.app}
        </P>
      </View>
    </View>
  );
}

function LockPreview({ s }: { s: number }) {
  return (
    <View style={{ alignItems: 'center', paddingTop: 76 * s }}>
      <P v="row" size={19 * s} color={WHITE_DIM}>
        {G.preview.date}
      </P>
      <P v="price" size={92 * s} lh={100 * s} ls={-2 * s} color={WHITE}>
        {G.preview.time}
      </P>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 * s, marginTop: 14 * s }}>
        {/* Next mission, accessoryRectangular */}
        <View style={{ width: 158 * s, height: 72 * s, justifyContent: 'center', gap: 1 * s }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 * s }}>
            <Walker height={14 * s} color={WHITE} lapelColor={WHITE_DIM} />
            <P v="label" size={9.5 * s} ls={1 * s} color={WHITE_DIM}>
              {LINE.heading}
            </P>
          </View>
          <P v="list" size={16 * s} lh={19 * s} color={WHITE} lines={2}>
            {LINE.title}
          </P>
          {LINE.meta ? (
            <P v="mono" size={10.5 * s} color={WHITE_DIM}>
              {LINE.meta}
            </P>
          ) : null}
        </View>
        {/* Streak, accessoryCircular */}
        <View
          style={{
            width: 64 * s,
            height: 64 * s,
            borderRadius: 32 * s,
            borderWidth: 4 * s,
            borderColor: 'rgba(255,255,255,0.3)',
            alignItems: 'center',
            justifyContent: 'center',
          }}>
          <P v="numeral" size={24 * s} lh={28 * s} ls={0} color={WHITE}>
            {String(G.preview.streak)}
          </P>
        </View>
      </View>
    </View>
  );
}

function HomePreview({ s }: { s: number }) {
  const ink = BLACK.ink;
  const secondary = BLACK.secondary;
  return (
    <View style={{ paddingTop: 28 * s, paddingHorizontal: 26 * s, gap: 18 * s }}>
      {/* Next mission, systemMedium */}
      <HomeWidget s={s} width={338 * s}>
        <View style={{ flexDirection: 'row', alignItems: 'center' }}>
          <View style={{ flex: 1 }}>
            <P v="label" size={10 * s} ls={1.5 * s} color={secondary}>
              {LINE.heading}
            </P>
          </View>
          <P v="mono" size={10 * s} color={secondary}>
            {LINE.progress}
          </P>
        </View>
        <View style={{ flex: 1 }} />
        <P v="list" size={24 * s} lh={27 * s} color={ink} lines={2}>
          {LINE.title}
        </P>
        <View style={{ flexDirection: 'row', alignItems: 'flex-end', marginTop: 6 * s }}>
          <View style={{ flex: 1 }}>
            <P v="mono" size={10 * s} color={secondary}>
              {LINE.meta}
            </P>
          </View>
          <Walker height={27 * s} color={ink} />
        </View>
      </HomeWidget>

      <View style={{ flexDirection: 'row', gap: 22 * s }}>
        {/* Streak, systemSmall */}
        <HomeWidget s={s} width={158 * s}>
          <View style={{ flexDirection: 'row', alignItems: 'center' }}>
            <View style={{ flex: 1 }}>
              <P v="label" size={10 * s} ls={1.5 * s} color={secondary}>
                {W.streak}
              </P>
            </View>
            <P v="mono" size={10 * s} color={secondary}>
              {W.points(G.preview.points)}
            </P>
          </View>
          <View style={{ flex: 1 }} />
          <P v="numeral" size={50 * s} lh={52 * s} ls={-1 * s} color={ink}>
            {String(G.preview.streak)}
          </P>
          <P v="italic" size={13 * s} lh={16 * s} color={secondary}>
            {W.streakUnit(G.preview.streak)}
          </P>
          <Bars s={s} ink={ink} secondary={secondary} />
        </HomeWidget>
        {/* The rest of the home screen: other apps. */}
        <View style={{ flex: 1, flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between', alignContent: 'flex-start', rowGap: 30 * s }}>
          {[0, 1, 2, 3].map(i => (
            <View key={i} style={{ width: 62 * s, height: 62 * s, borderRadius: 14 * s, backgroundColor: 'rgba(255,255,255,0.09)' }} />
          ))}
        </View>
      </View>
    </View>
  );
}

/** You › Widgets: how to add one, and what each shows. Not part of onboarding any more. */
export function WidgetScreen({ navigation }: RootProps<'Widget'>) {
  const { width } = useWindowDimensions();
  const [tab, setTab] = useState<Tab>('lock');
  const steps = tab === 'lock' ? G.lockSteps : G.homeSteps;
  const w = Math.max(0, width - MARGIN * 2);
  /** The picture is the top of a phone screen 390 points wide, drawn at w. */
  const s = w / 390;
  // The lock screen's widgets sit under the clock; below them is only wallpaper, so that picture is shorter.
  const h = Math.round((tab === 'lock' ? 330 : 430) * s);

  return (
    <Screen nav={<NavRow onBack={() => navigation.goBack()} />}>
      <PageTitle title={G.title} body={G.body} />
      <Segmented
        options={TABS}
        value={tab}
        onChange={setTab}
        labels={{ lock: G.tabs[0], home: G.tabs[1] }}
        style={{ marginTop: GAP.block }}
      />
      <View
        accessible
        accessibilityRole="image"
        accessibilityLabel={tab === 'lock' ? G.a11yLock : G.a11yHome}
        style={{ marginTop: 16, width: w, height: h, borderRadius: radius.card, overflow: 'hidden', backgroundColor: C.raise }}>
        <LinearGradient colors={WALLPAPER} style={StyleSheet.absoluteFill} />
        {tab === 'lock' ? <LockPreview s={s} /> : <HomePreview s={s} />}
      </View>

      <View style={{ marginTop: GAP.section }}>
        <SectionLabel>{G.stepsLabel}</SectionLabel>
        <Card style={{ gap: 14 }}>
          {steps.map((step, i) => (
            <View key={step} style={{ flexDirection: 'row', alignItems: 'flex-start' }}>
              <T v="mono" style={{ width: 32, marginTop: 4 }}>
                {String(i + 1).padStart(2, '0')}
              </T>
              <T v="body" style={{ flex: 1 }}>
                {step}
              </T>
            </View>
          ))}
        </Card>
      </View>

      <View style={{ marginTop: GAP.section }}>
        <SectionLabel>{G.kindsLabel}</SectionLabel>
        <View style={{ gap: GAP.tight }}>
          {G.kinds.map(k => (
            <Card key={k.name} accessibilityLabel={`${k.name}. ${k.body}`}>
              <T v="saved">{k.name}</T>
              <T v="small" color={C.stone} style={{ marginTop: 4 }}>
                {k.body}
              </T>
            </Card>
          ))}
        </View>
      </View>
    </Screen>
  );
}
