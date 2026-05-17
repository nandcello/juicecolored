import { useState } from "react";
import {
  KeyboardAvoidingView,
  PlatformColor,
  Pressable,
  ScrollView,
  Text,
  TextInput,
  useColorScheme,
  View,
} from "react-native";
import { Stack } from "expo-router";
import { getAppColors } from "@/theme/colors";

const RATING_OPTIONS = [
  "actively avoid",
  "can visit again",
  "will visit again",
  "recommend",
] as const;

export default function HomeScreen() {
  const [restaurantName, setRestaurantName] = useState("");
  const [rating, setRating] = useState<(typeof RATING_OPTIONS)[number]>("will visit again");
  const colorScheme = useColorScheme();
  const colors = getAppColors(colorScheme);
  const canSave = restaurantName.trim().length > 0;

  return (
    <KeyboardAvoidingView
      behavior={process.env.EXPO_OS === "ios" ? "padding" : undefined}
      style={{ flex: 1, backgroundColor: colors.background }}
    >
      <Stack.Screen
        options={{
          title: "Dinner Note",
          headerStyle: { backgroundColor: colors.background },
          headerLargeStyle: { backgroundColor: colors.background },
          headerTitleStyle: { color: colors.text },
        }}
      />
      <ScrollView
        contentInsetAdjustmentBehavior="automatic"
        keyboardShouldPersistTaps="handled"
        style={{ flex: 1 }}
        contentContainerStyle={{
          flexGrow: 1,
          gap: 20,
          padding: 20,
          paddingBottom: 40,
        }}
      >
        <View style={{ gap: 8, paddingTop: 8 }}>
          <Text
            selectable
            style={{
              color: colors.label,
              fontSize: 13,
              fontWeight: "700",
              letterSpacing: 1.8,
              textTransform: "uppercase",
            }}
          >
            Quick capture
          </Text>
          <Text
            selectable
            style={{
              color: colors.text,
              fontSize: 20,
              fontWeight: "600",
              lineHeight: 28,
              maxWidth: 320,
            }}
          >
            Save the place and your verdict.
          </Text>
        </View>

        <View style={{ gap: 8 }}>
          <Text
            selectable
            style={{
              color: colors.label,
              fontSize: 12,
              fontWeight: "700",
              letterSpacing: 1.3,
              textTransform: "uppercase",
            }}
          >
            Restaurant
          </Text>
          <TextInput
            autoCapitalize="words"
            autoCorrect={false}
            enablesReturnKeyAutomatically
            onChangeText={setRestaurantName}
            placeholder="Where did you eat?"
            placeholderTextColor={colors.placeholder}
            returnKeyType="next"
            selectionColor={colors.accent}
            style={{
              backgroundColor: colors.field,
              borderCurve: "continuous",
              borderRadius: 18,
              color: colors.text,
              fontSize: 22,
              fontWeight: "700",
              minHeight: 58,
              paddingHorizontal: 16,
            }}
            value={restaurantName}
          />
        </View>

        <View style={{ gap: 12 }}>
          <View style={{ flexDirection: "row", justifyContent: "space-between" }}>
            <Text
              selectable
              style={{
                color: colors.label,
                fontSize: 12,
                fontWeight: "700",
                letterSpacing: 1.3,
                textTransform: "uppercase",
              }}
            >
              Rating
            </Text>
            <Text selectable style={{ color: colors.mutedText, textTransform: "capitalize" }}>
              {rating}
            </Text>
          </View>

          <View
            accessibilityRole="radiogroup"
            style={{
              backgroundColor: colors.field,
              borderCurve: "continuous",
              borderRadius: 18,
              gap: 6,
              padding: 6,
            }}
          >
            {RATING_OPTIONS.map((option) => {
              const selected = option === rating;

              return (
                <Pressable
                  accessibilityLabel={`Rating: ${option}`}
                  accessibilityRole="radio"
                  accessibilityState={{ checked: selected }}
                  key={option}
                  onPress={() => setRating(option)}
                  style={{
                    alignItems: "center",
                    backgroundColor: selected ? colors.accent : "transparent",
                    borderColor: selected ? colors.accent : "transparent",
                    borderCurve: "continuous",
                    borderRadius: 14,
                    borderWidth: 1,
                    minHeight: 48,
                    justifyContent: "center",
                    paddingHorizontal: 14,
                  }}
                >
                  <Text
                    style={{
                      color: selected ? colors.onAccent : colors.text,
                      fontSize: 16,
                      fontWeight: "700",
                      textTransform: "capitalize",
                    }}
                  >
                    {option}
                  </Text>
                </Pressable>
              );
            })}
          </View>
        </View>

        <Pressable
          accessibilityRole="button"
          disabled={!canSave}
          style={{
            alignItems: "center",
            backgroundColor: canSave ? PlatformColor("label") : colors.disabledButton,
            borderRadius: 999,
            minHeight: 56,
            justifyContent: "center",
            opacity: canSave ? 1 : 0.72,
          }}
        >
          <Text
            style={{
              color: canSave ? PlatformColor("systemBackground") : colors.label,
              fontSize: 17,
              fontWeight: "800",
            }}
          >
            Save verdict
          </Text>
        </Pressable>

        <Text selectable style={{ color: colors.mutedText, fontSize: 15, lineHeight: 21 }}>
          {canSave
            ? `${restaurantName.trim()} is marked "${rating}".`
            : "Add a place first, then save your verdict while it is fresh."}
        </Text>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}
