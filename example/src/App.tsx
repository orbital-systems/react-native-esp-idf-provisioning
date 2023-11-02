import * as React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { ThemeProvider } from '@rneui/themed';

import { theme } from './theme';
import { HomeScreen } from './HomeScreen';
import { SettingsScreen } from './SettingsScreen';
import { ProvisionScreen } from './ProvisionScreen';
import { DeviceScreen } from './DeviceScreen';
import { WifiListScreen } from './WifiListScreen';
import { WifiPasswordScreen } from './WifiPasswordScreen';
import { SendDataScreen } from './SendDataScreen';
import type { StackParamList } from './types';

const Stack = createNativeStackNavigator<StackParamList>();

export default function App() {
  return (
    <ThemeProvider theme={theme}>
      <SafeAreaProvider>
        <NavigationContainer>
          <Stack.Navigator initialRouteName="Home">
            <Stack.Screen name="Home" component={HomeScreen} />
            <Stack.Screen name="Settings" component={SettingsScreen} />
            <Stack.Screen name="Provision" component={ProvisionScreen} />
            <Stack.Screen name="Device" component={DeviceScreen} />
            <Stack.Screen name="WifiList" component={WifiListScreen} />
            <Stack.Screen name="WifiPassword" component={WifiPasswordScreen} />
            <Stack.Screen name="SendData" component={SendDataScreen} />
          </Stack.Navigator>
        </NavigationContainer>
      </SafeAreaProvider>
    </ThemeProvider>
  );
}
