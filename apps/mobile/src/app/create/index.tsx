import { useEffect, useRef, useState } from "react";
import { api } from "@personal/convex";
import { useAction, useMutation } from "convex/react";
import {
  KeyboardAvoidingView,
  Pressable,
  ScrollView,
  Text,
  TextInput,
  useColorScheme,
  View,
} from "react-native";
import { Stack, useRouter } from "expo-router";
import { useCurrentLocation } from "./_useCurrentLocation";
import { getAppColors } from "@/theme/colors";

const RATING_OPTIONS = [
  "actively avoid",
  "can visit again",
  "will visit again",
  "recommend",
] as const;

const MIN_AUTOCOMPLETE_CHARACTERS = 3;
const AUTOCOMPLETE_DEBOUNCE_MS = 350;

type PlaceSuggestion = {
  id: string;
  name: string;
};

export default function CreateReviewScreen() {
  const [restaurantName, setRestaurantName] = useState("");
  const [selectedRestaurantName, setSelectedRestaurantName] = useState<string | null>(null);
  const [hasAskedForLocation, setHasAskedForLocation] = useState(false);
  const [suggestions, setSuggestions] = useState<PlaceSuggestion[]>([]);
  const [isLoadingSuggestions, setIsLoadingSuggestions] = useState(false);
  const [suggestionError, setSuggestionError] = useState<string | null>(null);
  const [rating, setRating] = useState<(typeof RATING_OPTIONS)[number]>("will visit again");
  const [isSaving, setIsSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const createRestaurantReview = useMutation(api.restaurantReviews.create);
  const searchPlaces = useAction(api.places.search);
  const { location, requestLocation } = useCurrentLocation();
  const suggestionRequestId = useRef(0);
  const autocompleteTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const colorScheme = useColorScheme();
  const colors = getAppColors(colorScheme);
  const router = useRouter();
  const trimmedRestaurantName = restaurantName.trim();
  const hasRestaurantName = trimmedRestaurantName.length > 0;
  const canSave = hasRestaurantName && !isSaving;
  const canShowAutocomplete =
    location !== null &&
    trimmedRestaurantName.length >= MIN_AUTOCOMPLETE_CHARACTERS &&
    selectedRestaurantName !== trimmedRestaurantName;

  function clearAutocompleteTimeout() {
    if (autocompleteTimeoutRef.current !== null) {
      clearTimeout(autocompleteTimeoutRef.current);
      autocompleteTimeoutRef.current = null;
    }
  }

  useEffect(() => clearAutocompleteTimeout, []);

  function scheduleRestaurantSearch(
    query: string,
    searchLocation: NonNullable<typeof location> | null = location,
    selectedName: string | null = selectedRestaurantName,
  ) {
    clearAutocompleteTimeout();

    const trimmedQuery = query.trim();
    const canSearch =
      searchLocation !== null &&
      trimmedQuery.length >= MIN_AUTOCOMPLETE_CHARACTERS &&
      selectedName !== trimmedQuery;

    if (!canSearch) {
      setSuggestions([]);
      setIsLoadingSuggestions(false);
      setSuggestionError(null);
      return;
    }

    const requestId = suggestionRequestId.current + 1;
    suggestionRequestId.current = requestId;
    setIsLoadingSuggestions(true);
    setSuggestionError(null);

    autocompleteTimeoutRef.current = setTimeout(async () => {
      autocompleteTimeoutRef.current = null;

      try {
        const nextSuggestions = await searchPlaces({
          query: trimmedQuery,
          latitude: searchLocation.latitude,
          longitude: searchLocation.longitude,
        });

        if (requestId !== suggestionRequestId.current) {
          return;
        }

        setSuggestions(nextSuggestions);
      } catch (error) {
        if (requestId !== suggestionRequestId.current) {
          return;
        }

        setSuggestions([]);
        setSuggestionError(
          error instanceof Error ? error.message : "Could not load restaurant suggestions.",
        );
      } finally {
        if (requestId === suggestionRequestId.current) {
          setIsLoadingSuggestions(false);
        }
      }
    }, AUTOCOMPLETE_DEBOUNCE_MS);
  }

  async function requestAutocompleteLocation() {
    if (hasAskedForLocation) {
      return;
    }

    setHasAskedForLocation(true);
    const nextLocation = await requestLocation();

    if (nextLocation !== null) {
      scheduleRestaurantSearch(restaurantName, nextLocation);
    }
  }

  function updateRestaurantName(nextRestaurantName: string) {
    setSelectedRestaurantName(null);
    setRestaurantName(nextRestaurantName);
    scheduleRestaurantSearch(nextRestaurantName, location, null);
  }

  async function saveVerdict() {
    if (!canSave) {
      return;
    }

    setIsSaving(true);
    setSaveError(null);

    try {
      await createRestaurantReview({
        restaurantName: trimmedRestaurantName,
        review: rating,
      });
      clearAutocompleteTimeout();
      if (router.canGoBack()) {
        router.back();
      } else {
        router.replace("/");
      }
    } catch (error) {
      setSaveError(error instanceof Error ? error.message : "Could not save this verdict.");
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <KeyboardAvoidingView
      behavior={process.env.EXPO_OS === "ios" ? "padding" : undefined}
      className="flex-1 bg-app-background"
    >
      <Stack.Screen
        options={{
          title: "New Review",
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
            onChangeText={updateRestaurantName}
            onFocus={requestAutocompleteLocation}
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
          {canShowAutocomplete ? (
            <View
              className="overflow-hidden rounded-[18px] bg-app-field"
              style={{
                borderCurve: "continuous",
              }}
            >
              {suggestions.map((suggestion) => (
                <Pressable
                  accessibilityRole="button"
                  key={suggestion.id}
                  onPress={() => {
                    clearAutocompleteTimeout();
                    setRestaurantName(suggestion.name);
                    setSelectedRestaurantName(suggestion.name.trim());
                    setSuggestions([]);
                  }}
                  className="min-h-12 justify-center border-b border-app-disabled px-4"
                >
                  <Text className="text-app-text text-[17px] font-semibold" selectable>
                    {suggestion.name}
                  </Text>
                </Pressable>
              ))}
              {isLoadingSuggestions ? (
                <Text className="px-4 py-3 text-app-muted text-[15px]" selectable>
                  Finding nearby places...
                </Text>
              ) : null}
              {!isLoadingSuggestions && suggestions.length === 0 && !suggestionError ? (
                <Text className="px-4 py-3 text-app-muted text-[15px]" selectable>
                  No nearby matches yet.
                </Text>
              ) : null}
              {suggestionError ? (
                <Text className="px-4 py-3 text-[15px] text-red-600" selectable>
                  {suggestionError}
                </Text>
              ) : null}
            </View>
          ) : null}
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
          onPress={saveVerdict}
          className={`min-h-14 items-center justify-center rounded-full ${
            canSave ? "bg-app-text opacity-100" : "bg-app-disabled opacity-70"
          }`}
        >
          <Text
            className={`text-[17px] font-extrabold ${
              canSave ? "text-app-background" : "text-app-label"
            }`}
          >
            {isSaving ? "Saving..." : "Save verdict"}
          </Text>
        </Pressable>

        {saveError ? (
          <Text className="text-[15px] leading-[21px] text-red-600" selectable>
            {saveError}
          </Text>
        ) : null}

        <Text className="text-app-muted text-[15px] leading-[21px]" selectable>
          {hasRestaurantName
            ? `${trimmedRestaurantName} is marked "${rating}".`
            : "Add a place first, then save your verdict while it is fresh."}
        </Text>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}
