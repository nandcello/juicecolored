import { useState } from "react";
import {
  KeyboardAvoidingView,
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
      className="flex-1 bg-app-background"
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
        className="flex-1"
        contentContainerClassName="grow gap-5 p-5 pb-10"
        contentInsetAdjustmentBehavior="automatic"
        keyboardShouldPersistTaps="handled"
      >
        <View className="gap-2 pt-2">
          <Text
            className="text-app-label text-[13px] font-bold uppercase tracking-[1.8px]"
            selectable
          >
            Quick capture
          </Text>
          <Text className="max-w-80 text-app-text text-xl font-semibold leading-7" selectable>
            Save the place and your verdict.
          </Text>
        </View>

        <View className="gap-2">
          <Text className="text-app-label text-xs font-bold uppercase tracking-[1.3px]" selectable>
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
            className="min-h-[58px] rounded-[18px] bg-app-field px-4 text-app-text text-[22px] font-bold"
            style={{
              borderCurve: "continuous",
            }}
            value={restaurantName}
          />
        </View>

        <View className="gap-3">
          <View className="flex-row justify-between">
            <Text
              className="text-app-label text-xs font-bold uppercase tracking-[1.3px]"
              selectable
            >
              Rating
            </Text>
            <Text className="text-app-muted capitalize" selectable>
              {rating}
            </Text>
          </View>

          <View
            accessibilityRole="radiogroup"
            className="gap-1.5 rounded-[18px] bg-app-field p-1.5"
            style={{
              borderCurve: "continuous",
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
                  className={`min-h-12 items-center justify-center rounded-[14px] border px-3.5 ${
                    selected
                      ? "border-app-accent bg-app-accent"
                      : "border-transparent bg-transparent"
                  }`}
                  onPress={() => setRating(option)}
                  style={{
                    borderCurve: "continuous",
                  }}
                >
                  <Text
                    className={`text-base font-bold capitalize ${
                      selected ? "text-app-on-accent" : "text-app-text"
                    }`}
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
          className={`min-h-14 items-center justify-center rounded-full ${
            canSave ? "bg-app-text opacity-100" : "bg-app-disabled opacity-70"
          }`}
        >
          <Text
            className={`text-[17px] font-extrabold ${
              canSave ? "text-app-background" : "text-app-label"
            }`}
          >
            Save verdict
          </Text>
        </Pressable>

        <Text className="text-app-muted text-[15px] leading-[21px]" selectable>
          {canSave
            ? `${restaurantName.trim()} is marked "${rating}".`
            : "Add a place first, then save your verdict while it is fresh."}
        </Text>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}
