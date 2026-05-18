import "@/global.css";

import { ConvexProvider, ConvexReactClient } from "convex/react";
import { Stack } from "expo-router";
import { Text, View } from "react-native";
import { GestureHandlerRootView } from "react-native-gesture-handler";

const convexUrl = process.env.EXPO_PUBLIC_CONVEX_URL;
const convexClient = convexUrl ? new ConvexReactClient(convexUrl) : null;

export default function RootLayout() {
  if (!convexClient) {
    return (
      <View className="flex-1 justify-center gap-3 bg-app-background p-5">
        <Text className="text-app-text text-2xl font-bold">Convex is not configured</Text>
        <Text className="text-app-muted text-base leading-6">
          Set EXPO_PUBLIC_CONVEX_URL in the mobile app environment, then restart Expo.
        </Text>
      </View>
    );
  }

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <ConvexProvider client={convexClient}>
        <Stack
          screenOptions={{
            headerLargeTitle: true,
            headerShadowVisible: false,
          }}
        />
      </ConvexProvider>
    </GestureHandlerRootView>
  );
}
