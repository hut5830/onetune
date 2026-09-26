import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { NumberPromptProvider } from '../components/NumberPrompt';
import { C } from '../theme';

export default function RootLayout() {
  return (
    <NumberPromptProvider>
      <StatusBar style="light" />
      <Stack
        screenOptions={{
          headerStyle: { backgroundColor: C.bg },
          headerTintColor: C.ink,
          headerTitleStyle: { fontWeight: '700' },
          headerShadowVisible: false,
          contentStyle: { backgroundColor: C.bg },
        }}
      >
        <Stack.Screen name="index" options={{ title: 'OneTune DSP' }} />
        <Stack.Screen name="tune" options={{ title: 'จูนเสียง' }} />
        <Stack.Screen name="inspector" options={{ title: 'BLE Inspector' }} />
      </Stack>
    </NumberPromptProvider>
  );
}
