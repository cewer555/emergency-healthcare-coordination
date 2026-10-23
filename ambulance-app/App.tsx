import React, { useEffect } from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { StatusBar } from 'expo-status-bar';
import { Text } from 'react-native';
import NetInfo from '@react-native-community/netinfo';

import LoginScreen from './src/screens/LoginScreen';
import DashboardScreen from './src/screens/DashboardScreen';
import PatientScreen from './src/screens/PatientScreen';
import SettingsScreen from './src/screens/SettingsScreen';

import { useAppStore } from './src/store/appStore';
import { useWebSocket } from './src/hooks/useWebSocket';
import { syncQueue } from './src/services/offlineQueue';

const Tab = createBottomTabNavigator();
const Stack = createNativeStackNavigator();

function TabIcon({ name, focused }: { name: string; focused: boolean }) {
  const icons: Record<string, string> = {
    Dashboard: '🚑',
    Patient: '🧑‍⚕️',
    Settings: '⚙️',
  };
  return <Text style={{ fontSize: 20, opacity: focused ? 1 : 0.5 }}>{icons[name] ?? '•'}</Text>;
}

function MainTabs() {
  useWebSocket();

  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        headerStyle: { backgroundColor: '#0f172a' },
        headerTintColor: '#f8fafc',
        tabBarStyle: { backgroundColor: '#1e293b', borderTopColor: '#334155' },
        tabBarActiveTintColor: '#ef4444',
        tabBarInactiveTintColor: '#64748b',
        tabBarIcon: ({ focused }) => <TabIcon name={route.name} focused={focused} />,
      })}
    >
      <Tab.Screen name="Dashboard" component={DashboardScreen} />
      <Tab.Screen name="Patient" component={PatientScreen} />
      <Tab.Screen name="Settings" component={SettingsScreen} />
    </Tab.Navigator>
  );
}

export default function App() {
  const { ambulanceId, loadPersistedState, setOnline, refreshQueueCount } = useAppStore();

  useEffect(() => {
    loadPersistedState();
  }, []);

  // Network listener — sync queue when coming back online
  useEffect(() => {
    const unsubscribe = NetInfo.addEventListener((state) => {
      const online = !!(state.isConnected && state.isInternetReachable);
      setOnline(online);

      if (online) {
        syncQueue().then(() => refreshQueueCount()).catch(() => null);
      }
    });

    return unsubscribe;
  }, []);

  return (
    <NavigationContainer>
      <StatusBar style="light" />
      <Stack.Navigator screenOptions={{ headerShown: false }}>
        {!ambulanceId ? (
          <Stack.Screen name="Login" component={LoginScreen} />
        ) : (
          <Stack.Screen name="Main" component={MainTabs} />
        )}
      </Stack.Navigator>
    </NavigationContainer>
  );
}
