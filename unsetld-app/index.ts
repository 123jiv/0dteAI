import { registerRootComponent } from 'expo';

import App from './src/App';
import { configureNotifications, listenForResponses } from './src/services/notifications';
import { handleNotificationEvent } from './src/state/intents';

// Module scope, before the first render: notification taps (the focus timer's
// "done" alert, drop alerts, reminders) must be heard even when the tap is what
// cold-starts the app.
configureNotifications();
listenForResponses(handleNotificationEvent);

// registerRootComponent calls AppRegistry.registerComponent('main', () => App).
registerRootComponent(App);
