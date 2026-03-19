import { StatusBar } from 'expo-status-bar';
import { NavigationContainer } from '@react-navigation/native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { StyleSheet, LogBox } from 'react-native';

import Navigation from './src/navigation';
import { useThemeStore } from './src/store/themeStore';

// Ignora warnings conhecidos do react-native-chart-kit no Web e warnings de deprecation do reanimated
LogBox.ignoreLogs([
  'props.pointerEvents is deprecated',
  'Animated: `useNativeDriver` is not supported',
  'Warning: Unknown event handler property',
  'TouchableMixin is deprecated',
]);

export default function App() {
  const { isDarkMode } = useThemeStore();

  return (
    <GestureHandlerRootView style={styles.container}>
      <SafeAreaProvider>
        <NavigationContainer>
          <StatusBar style={isDarkMode ? 'light' : 'dark'} />
          <Navigation />
        </NavigationContainer>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
});
