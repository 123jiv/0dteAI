// TEMPORARY browser-preview harness for the Mission screen. Deleted before handoff.
import { CormorantGaramond_400Regular } from '@expo-google-fonts/cormorant-garamond/400Regular';
import { CormorantGaramond_500Medium } from '@expo-google-fonts/cormorant-garamond/500Medium';
import { IBMPlexMono_400Regular } from '@expo-google-fonts/ibm-plex-mono/400Regular';
import { Inter_400Regular } from '@expo-google-fonts/inter/400Regular';
import { Inter_500Medium } from '@expo-google-fonts/inter/500Medium';
import { Inter_600SemiBold } from '@expo-google-fonts/inter/600SemiBold';
import { DarkTheme, NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { registerRootComponent } from 'expo';
import { useFonts } from 'expo-font';
import { Pressable, View } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { startTimer } from '../../core/timer';
import { addDays } from '../../core/time';
import type { DayPlan, MissionDone } from '../../core/types';
import { MISSION_BY_ID } from '../../content';
import { today } from '../../services/clock';
import { useApp } from '../../state/store';
import { ActionHost } from '../../ui/actions';
import { T } from '../../ui/text';
import { color as C } from '../../ui/tokens';
import { MissionScreen } from './MissionScreen';

const q = new URLSearchParams(globalThis.location?.search ?? '');
const m = q.get('m') ?? 'focus-plan-tomorrow';
const scenario = q.get('s') ?? 'detail';
const d = today();
const ids = [m, 'school-10-pages', 'reset-desk'].filter((x, i, a) => a.indexOf(x) === i).slice(0, 3);
const plan: DayPlan = { day: d, missions: ids.map(id => ({ slot: MISSION_BY_ID[id].slot, missionId: id })), rerolls: 0, replaced: [] };
const now = Date.now();

function seed() {
  const s = useApp.getState();
  const accepted = (id: string, at: number, uri = ''): MissionDone => ({
    missionId: id,
    slot: MISSION_BY_ID[id].slot,
    track: MISSION_BY_ID[id].track,
    points: MISSION_BY_ID[id].points,
    doneAt: at,
    photos: [{ uri, takenAt: at, kind: 'single', hash: `h-${id}-${at}` }],
    verification: { status: 'accepted', method: 'on-device', checks: [], at },
  });
  const missions: Record<string, Record<string, MissionDone>> = {
    [addDays(d, -1)]: { 'school-10-pages': accepted('school-10-pages', now - 86400000) },
    [addDays(d, -2)]: { 'school-10-pages': accepted('school-10-pages', now - 2 * 86400000) },
  };
  if (scenario === 'last') missions[d] = { 'school-10-pages': accepted('school-10-pages', now - 3600000), 'reset-desk': accepted('reset-desk', now - 3000000) };
  if (scenario === 'proven') missions[d] = { [m]: accepted(m, now - 600000, q.get('uri') ?? '') };
  useApp.setState({
    settings: { ...s.settings, onboarded: true },
    plans: scenario === 'notinplan' ? { [d]: { ...plan, missions: plan.missions.slice(1) } } : { [d]: plan },
    record: { ...s.record, missions, legacyPoints: 330 },
    timer:
      scenario === 'timer'
        ? { ...startTimer(m, d, MISSION_BY_ID[m].timerMinutes ?? 25, now - 5 * 60000 - 1000) }
        : scenario === 'timerdone'
          ? startTimer(m, d, MISSION_BY_ID[m].timerMinutes ?? 25, now - 26 * 60000)
          : scenario === 'timerfast'
            ? startTimer(m, d, MISSION_BY_ID[m].timerMinutes ?? 25, now, 600)
            : null,
    pendingBefore:
      scenario === 'beforeold' ? { missionId: m, day: d, photo: { uri: 'web-proof:seed-before', takenAt: now - 300000, kind: 'before', hash: 'hb-seed' } } : null,
    currentDay: d,
  });
}
seed();
useApp.persist.onFinishHydration(seed);

const Stack = createNativeStackNavigator();

function Stub({ navigation }: { navigation: { navigate: (r: string, p: object) => void } }) {
  return (
    <View style={{ flex: 1, backgroundColor: C.ink, justifyContent: 'center' }}>
      <T v="title.l" align="center">
        HOME STUB
      </T>
      <Pressable accessibilityRole="button" accessibilityLabel="Reopen" onPress={() => navigation.navigate('Mission', { missionId: m })}>
        <T v="body" align="center">
          Reopen
        </T>
      </Pressable>
    </View>
  );
}

function Harness() {
  const [ok] = useFonts({ CormorantGaramond_400Regular, CormorantGaramond_500Medium, Inter_400Regular, Inter_500Medium, Inter_600SemiBold, IBMPlexMono_400Regular });
  if (!ok) return null;
  return (
    <SafeAreaProvider>
      <View style={{ flex: 1, backgroundColor: C.ink }}>
        <NavigationContainer initialState={{ index: 1, routes: [{ name: 'Today' }, { name: 'Mission', params: { missionId: m } }] }} theme={{ ...DarkTheme, colors: { ...DarkTheme.colors, background: C.ink } }}>
          <Stack.Navigator screenOptions={{ headerShown: false }}>
            <Stack.Screen name="Today" component={Stub as never} />
            <Stack.Screen name="Rewards" component={Stub as never} />
            <Stack.Screen name="Mission" component={MissionScreen as never} />
          </Stack.Navigator>
        </NavigationContainer>
        <ActionHost />
      </View>
    </SafeAreaProvider>
  );
}

registerRootComponent(Harness);
