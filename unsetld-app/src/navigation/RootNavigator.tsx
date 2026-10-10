import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { Platform } from 'react-native';
import { AccountScreen } from '../screens/AccountScreen';
import { DayScreen } from '../screens/DayScreen';
import { DevToolsScreen } from '../screens/DevToolsScreen';
import { DocScreen } from '../screens/DocScreen';
import { HomeScreen } from '../screens/home/HomeScreen';
import { WeeklyFocusScreen } from '../screens/home/WeeklyFocusScreen';
import { LetterScreen } from '../screens/LetterScreen';
import { MilestoneScreen } from '../screens/MilestoneScreen';
import { MissionScreen } from '../screens/mission/MissionScreen';
import { AboutYouScreen } from '../screens/onboarding/AboutYouScreen';
import { GoalScreen } from '../screens/onboarding/GoalScreen';
import { NameScreen } from '../screens/onboarding/NameScreen';
import { PaceScreen } from '../screens/onboarding/PaceScreen';
import { TracksScreen } from '../screens/onboarding/TracksScreen';
import { PaywallScreen } from '../screens/PaywallScreen';
import { PlansScreen } from '../screens/plans/PlansScreen';
import { AchievementsScreen } from '../screens/progress/AchievementsScreen';
import { MomentScreen } from '../screens/progress/MomentScreen';
import { ProgressScreen } from '../screens/progress/ProgressScreen';
import { ProofHistoryScreen } from '../screens/progress/ProofHistoryScreen';
import { StatsScreen } from '../screens/progress/StatsScreen';
import { WeeklyReviewScreen } from '../screens/progress/WeeklyReviewScreen';
import { AllRewardsScreen } from '../screens/rewards/AllRewardsScreen';
import { HowPointsScreen } from '../screens/rewards/HowPointsScreen';
import { RewardHistoryScreen } from '../screens/rewards/RewardHistoryScreen';
import { RewardsScreen } from '../screens/rewards/RewardsScreen';
import { StatusScreen } from '../screens/rewards/StatusScreen';
import { ShareScreen } from '../screens/share/ShareScreen';
import { WidgetScreen } from '../screens/WidgetScreen';
import { YouScreen } from '../screens/you/YouScreen';
import { useApp } from '../state/store';
import { TabBar } from '../ui/TabBar';
import { color as C } from '../ui/tokens';
import type { RootParams, TabParams } from './types';

const Stack = createNativeStackNavigator<RootParams>();
const Tabs = createBottomTabNavigator<TabParams>();
const web = Platform.OS === 'web';
const fade = web ? ('none' as const) : ('fade' as const);

/** The four main screens, with the bottom navigation. Everything opened from them goes on the stack above. */
function MainTabs() {
  return (
    <Tabs.Navigator
      tabBar={props => <TabBar {...props} />}
      screenOptions={{ headerShown: false, sceneStyle: { backgroundColor: C.ink }, animation: 'none' }}>
      <Tabs.Screen name="Today" component={HomeScreen} />
      <Tabs.Screen name="Progress" component={ProgressScreen} />
      <Tabs.Screen name="Rewards" component={RewardsScreen} />
      <Tabs.Screen name="You" component={YouScreen} />
    </Tabs.Navigator>
  );
}

/** One native stack: onboarding, the tabs, and everything opened from them. */
export function RootNavigator() {
  // Read once: the navigator only mounts after the store has hydrated.
  const onboarded = useApp.getState().settings.onboarded;
  return (
    <Stack.Navigator
      initialRouteName={onboarded ? 'Main' : 'Name'}
      screenOptions={{
        headerShown: false,
        contentStyle: { backgroundColor: C.ink },
        animation: web ? 'none' : 'default',
      }}>
      <Stack.Screen name="Name" component={NameScreen} />
      {/* Onboarding starts a fresh stack at Tracks (no back); You opens it to edit. */}
      <Stack.Screen
        name="Tracks"
        component={TracksScreen}
        options={({ route }) => (route.params?.edit ? {} : { animation: fade, gestureEnabled: false })}
      />
      <Stack.Screen name="AboutYou" component={AboutYouScreen} />
      <Stack.Screen name="Pace" component={PaceScreen} />
      <Stack.Screen name="Goal" component={GoalScreen} />
      <Stack.Screen name="Day" component={DayScreen} />
      <Stack.Screen name="Widget" component={WidgetScreen} />
      <Stack.Screen name="Main" component={MainTabs} options={{ animation: fade }} />
      <Stack.Screen name="Plans" component={PlansScreen} />
      <Stack.Screen name="ProofHistory" component={ProofHistoryScreen} />
      <Stack.Screen name="Achievements" component={AchievementsScreen} />
      <Stack.Screen name="Stats" component={StatsScreen} />
      <Stack.Screen name="AllRewards" component={AllRewardsScreen} />
      <Stack.Screen name="RewardHistory" component={RewardHistoryScreen} />
      <Stack.Screen name="HowPoints" component={HowPointsScreen} />
      <Stack.Screen name="Status" component={StatusScreen} />
      <Stack.Screen name="WeeklyReview" component={WeeklyReviewScreen} options={{ presentation: 'modal' }} />
      <Stack.Screen name="WeeklyFocus" component={WeeklyFocusScreen} options={{ presentation: 'modal' }} />
      <Stack.Screen name="Share" component={ShareScreen} options={{ presentation: 'fullScreenModal', animation: fade }} />
      <Stack.Screen name="Account" component={AccountScreen} />
      <Stack.Screen name="Doc" component={DocScreen} />
      <Stack.Screen name="Milestone" component={MilestoneScreen} />
      <Stack.Screen name="DevTools" component={DevToolsScreen} />
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
