import { useEffect } from 'react';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { View } from 'react-native';
import { useFonts } from 'expo-font';
import { IBMPlexSansThai_400Regular, IBMPlexSansThai_500Medium, IBMPlexSansThai_600SemiBold, IBMPlexSansThai_700Bold } from '@expo-google-fonts/ibm-plex-sans-thai';
import { NumberPromptProvider } from '../components/NumberPrompt';
import { ToastProvider } from '../components/Toast';
import { settings } from '../model/settings';
import { C } from '../theme';

export default function RootLayout() {
  const [loaded, error] = useFonts({ IBMPlexSansThai_400Regular, IBMPlexSansThai_500Medium, IBMPlexSansThai_600SemiBold, IBMPlexSansThai_700Bold });
  useEffect(() => { void settings.load(); }, []);
  // Fonts are bundled, so this is one frame at most; on failure the system font is used.
  if (!loaded && !error) return <View style={{ flex: 1, backgroundColor: C.bg }} />;
  return (
    <ToastProvider>
      <NumberPromptProvider>
        <StatusBar style="light" />
        <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: C.bg }, animation: 'slide_from_right' }} />
      </NumberPromptProvider>
    </ToastProvider>
  );
}
