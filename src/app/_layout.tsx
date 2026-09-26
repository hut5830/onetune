import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { View } from 'react-native';
import { useFonts } from 'expo-font';
import { ChakraPetch_500Medium, ChakraPetch_600SemiBold, ChakraPetch_700Bold } from '@expo-google-fonts/chakra-petch';
import { IBMPlexSansThai_400Regular, IBMPlexSansThai_500Medium, IBMPlexSansThai_600SemiBold } from '@expo-google-fonts/ibm-plex-sans-thai';
import { NumberPromptProvider } from '../components/NumberPrompt';
import { ToastProvider } from '../components/Toast';
import { C } from '../theme';

export default function RootLayout() {
  const [loaded, error] = useFonts({
    ChakraPetch_500Medium, ChakraPetch_600SemiBold, ChakraPetch_700Bold,
    IBMPlexSansThai_400Regular, IBMPlexSansThai_500Medium, IBMPlexSansThai_600SemiBold,
  });
  // Fonts are bundled, so this is one frame at most; on failure the system font is used.
  if (!loaded && !error) return <View style={{ flex: 1, backgroundColor: C.bg }} />;
  return (
    <ToastProvider>
      <NumberPromptProvider>
        <StatusBar style="light" />
        <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: C.bg }, animation: 'fade_from_bottom' }} />
      </NumberPromptProvider>
    </ToastProvider>
  );
}
