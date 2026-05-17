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
  const isDark = colorScheme === "dark";
  const canSave = restaurantName.trim().length > 0;
  const backgroundColor = isDark ? "#11100f" : "#f7f2ea";
  const fieldColor = isDark ? "#26211d" : "#ffffff";
  const labelColor = isDark ? "#a8a29e" : "#78716c";
  const textColor = isDark ? "#fafaf9" : "#1c1917";
  const mutedTextColor = isDark ? "#d6d3d1" : "#57534e";
  const placeholderColor = isDark ? "#78716c" : "#a8a29e";
  const accentColor = "#d97706";

  return (
    <KeyboardAvoidingView
      behavior={process.env.EXPO_OS === "ios" ? "padding" : undefined}
      style={{ flex: 1, backgroundColor }}
    >
      <Stack.Screen
        options={{
          title: "Dinner Note",
          headerStyle: { backgroundColor },
          headerLargeStyle: { backgroundColor },
          headerTitleStyle: { color: textColor },
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
              color: labelColor,
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
              color: textColor,
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
              color: labelColor,
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
            placeholderTextColor={placeholderColor}
            returnKeyType="next"
            selectionColor={accentColor}
            style={{
              backgroundColor: fieldColor,
              borderCurve: "continuous",
              borderRadius: 18,
              color: textColor,
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
                color: labelColor,
                fontSize: 12,
                fontWeight: "700",
                letterSpacing: 1.3,
                textTransform: "uppercase",
              }}
            >
              Rating
            </Text>
            <Text selectable style={{ color: mutedTextColor, textTransform: "capitalize" }}>
              {rating}
            </Text>
          </View>

          <View
            accessibilityRole="radiogroup"
            style={{
              backgroundColor: fieldColor,
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
                    backgroundColor: selected ? accentColor : "transparent",
                    borderColor: selected ? accentColor : "transparent",
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
                      color: selected ? "#ffffff" : textColor,
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
            backgroundColor: canSave ? PlatformColor("label") : isDark ? "#292524" : "#e7e5e4",
            borderRadius: 999,
            minHeight: 56,
            justifyContent: "center",
            opacity: canSave ? 1 : 0.72,
          }}
        >
          <Text
            style={{
              color: canSave ? PlatformColor("systemBackground") : labelColor,
              fontSize: 17,
              fontWeight: "800",
            }}
          >
            Save verdict
          </Text>
        </Pressable>

        <Text selectable style={{ color: mutedTextColor, fontSize: 15, lineHeight: 21 }}>
          {canSave
            ? `${restaurantName.trim()} is marked "${rating}".`
            : "Add a place first, then save your verdict while it is fresh."}
        </Text>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}
