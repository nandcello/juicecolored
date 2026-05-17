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

const RATING_OPTIONS = [1, 2, 3, 4, 5];

export default function HomeScreen() {
  const [restaurantName, setRestaurantName] = useState("");
  const [rating, setRating] = useState(4);
  const [note, setNote] = useState("");
  const colorScheme = useColorScheme();
  const isDark = colorScheme === "dark";
  const canSave = restaurantName.trim().length > 0;
  const backgroundColor = isDark ? "#11100f" : "#f7f2ea";
  const cardColor = isDark ? "#1c1917" : "#fffaf4";
  const secondaryCardColor = isDark ? "#26211d" : "#ffffff";
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
            Save the place, the score, and one thing worth remembering.
          </Text>
        </View>

        <View
          style={{
            backgroundColor: cardColor,
            borderCurve: "continuous",
            borderRadius: 30,
            boxShadow: isDark
              ? "0 18px 45px rgba(0, 0, 0, 0.35)"
              : "0 18px 45px rgba(67, 20, 7, 0.12)",
            gap: 18,
            padding: 18,
          }}
        >
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
                backgroundColor: secondaryCardColor,
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
              <Text selectable style={{ color: mutedTextColor, fontVariant: ["tabular-nums"] }}>
                {rating}.0 / 5
              </Text>
            </View>

            <View style={{ flexDirection: "row", gap: 8 }}>
              {RATING_OPTIONS.map((option) => {
                const selected = option <= rating;

                return (
                  <Pressable
                    accessibilityLabel={`${option} star rating`}
                    accessibilityRole="button"
                    accessibilityState={{ selected: option === rating }}
                    key={option}
                    onPress={() => setRating(option)}
                    style={{
                      alignItems: "center",
                      backgroundColor: selected ? accentColor : secondaryCardColor,
                      borderCurve: "continuous",
                      borderRadius: 16,
                      flex: 1,
                      minHeight: 52,
                      justifyContent: "center",
                    }}
                  >
                    <Text
                      style={{
                        color: selected ? "#ffffff" : labelColor,
                        fontSize: 22,
                        fontWeight: "800",
                      }}
                    >
                      ★
                    </Text>
                  </Pressable>
                );
              })}
            </View>
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
              Memory
            </Text>
            <TextInput
              multiline
              numberOfLines={4}
              onChangeText={setNote}
              placeholder="What stood out?"
              placeholderTextColor={placeholderColor}
              selectionColor={accentColor}
              style={{
                backgroundColor: secondaryCardColor,
                borderCurve: "continuous",
                borderRadius: 18,
                color: textColor,
                fontSize: 17,
                lineHeight: 24,
                minHeight: 116,
                padding: 16,
                textAlignVertical: "top",
              }}
              value={note}
            />
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
            Save dinner note
          </Text>
        </Pressable>

        <View
          style={{
            backgroundColor: isDark ? "#1c1917" : "#fff7ed",
            borderCurve: "continuous",
            borderRadius: 22,
            gap: 6,
            padding: 16,
          }}
        >
          <Text selectable style={{ color: textColor, fontSize: 15, fontWeight: "700" }}>
            {canSave ? "Ready to save" : "Restaurant name needed"}
          </Text>
          <Text selectable style={{ color: mutedTextColor, fontSize: 15, lineHeight: 21 }}>
            {canSave
              ? `${restaurantName.trim()} is marked ${rating} out of 5.`
              : "Add a place first, then save the memory while it is fresh."}
          </Text>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}
