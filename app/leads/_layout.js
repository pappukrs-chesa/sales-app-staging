import { Stack } from "expo-router";
import * as SplashScreen from 'expo-splash-screen';
import CustomHeader from "@/assets/constants/Headers/ChesaHeader";

SplashScreen.preventAutoHideAsync();
setTimeout(SplashScreen.hideAsync, 1000);

export default function RootLayout() {
  return (
    <Stack>
      <Stack.Screen 
        name="[leadId]" 
        options={{            // Hide the back button
          headerShown: false,
        }}
      />
    </Stack>
  );
}
