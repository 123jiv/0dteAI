import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { Platform } from 'react-native';
import { AccountScreen } from '../screens/AccountScreen';
import { DayScreen } from '../screens/DayScreen';
import { DevToolsScreen } from '../screens/DevToolsScreen';
import { DocScreen } from '../screens/DocScreen';
import { HomeScreen } from '../screens/home/HomeScreen';
import { LetterScreen } from '../screens/LetterScreen';
import { MilestoneScreen } from '../screens/MilestoneScreen';
import { MissionScreen } from '../screens/mission/MissionScreen';
import { AboutYouScreen } from '../screens/onboarding/AboutYouScreen';
import { NameScreen } from '../screens/onboarding/NameScreen';
import { PaceScreen } from '../screens/onboarding/PaceScreen';
import { TracksScreen } from '../screens/onboarding/TracksScreen';
import { PaywallScreen } from '../screens/PaywallScreen';
import { ProgramsScreen } from '../screens/programs/ProgramsScreen';
import { MomentScreen } from '../screens/progress/MomentScreen';
import { ProgressScreen } from '../screens/progress/ProgressScreen';
import { WeeklyReviewScreen } from '../screens/progress/WeeklyReviewScreen';
import { ProofGalleryScreen } from '../screens/ProofGalleryScreen';
import { RewardsScreen } from '../screens/rewards/RewardsScreen';
import { SettingsScreen } from '../screens/SettingsScreen';
import { WidgetScreen } from '../screens/WidgetScreen';
import { useApp } from '../state/store';
import { color as C } from '../ui/tokens';
import type { RootParams } from './types';

const Stack = createNativeStackNavigator<RootParams>();
const web = Platform.OS === 'web';
const fade = web ? ('none' as const) : ('fade' as const);

/** One native stack, no tab bar. Home (route "Today") draws its own sheets and bottom bar. */
export function RootNavigator() {
  // Read once: the navigator only mounts after the store has hydrated.
  const onboarded = useApp.getState().settings.onboarded;
  return (
    <Stack.Navigator
      initialRouteName={onboarded ? 'Today' : 'Name'}
      screenOptions={{
        headerShown: false,
        contentStyle: { backgroundColor: C.ink },
        animation: web ? 'none' : 'default',
      }}>
      <Stack.Screen name="Name" component={NameScreen} />
      {/* Onboarding starts a fresh stack at Tracks (no back); Settings opens it to edit. */}
      <Stack.Screen
        name="Tracks"
        component={TracksScreen}
        options={({ route }) => (route.params?.edit ? {} : { animation: fade, gestureEnabled: false })}
      />
      <Stack.Screen name="AboutYou" component={AboutYouScreen} />
      <Stack.Screen name="Pace" component={PaceScreen} />
      <Stack.Screen name="Day" component={DayScreen} />
      <Stack.Screen name="Widget" component={WidgetScreen} />
      <Stack.Screen name="Today" component={HomeScreen} options={{ animation: fade }} />
      <Stack.Screen name="Progress" component={ProgressScreen} />
      <Stack.Screen name="Rewards" component={RewardsScreen} />
      <Stack.Screen name="Programs" component={ProgramsScreen} />
      <Stack.Screen name="WeeklyReview" component={WeeklyReviewScreen} options={{ presentation: 'modal' }} />
      <Stack.Screen name="Settings" component={SettingsScreen} />
      <Stack.Screen name="Account" component={AccountScreen} />
      <Stack.Screen name="Doc" component={DocScreen} />
      <Stack.Screen name="Milestone" component={MilestoneScreen} />
      <Stack.Screen name="DevTools" component={DevToolsScreen} />
      <Stack.Screen name="ProofGallery" component={ProofGalleryScreen} />
      <Stack.Screen name="Mission" component={MissionScreen} options={{ presentation: 'fullScreenModal' }} />
      <Stack.Screen name="Paywall" component={PaywallScreen} options={{ presentation: 'fullScreenModal' }} />
      <Stack.Screen name="DocSheet" component={DocScreen} options={{ presentation: 'modal' }} />
      <Stack.Screen
        name="Letter"
        component={LetterScreen}
        options={{ presentation: 'fullScreenModal', animation: fade, animationDuration: 400 }}
      />
      <Stack.Screen
        name="Moment"
        component={MomentScreen}
        options={{ presentation: 'fullScreenModal', animation: fade, animationDuration: 400 }}
      />
    </Stack.Navigator>
  );
}
