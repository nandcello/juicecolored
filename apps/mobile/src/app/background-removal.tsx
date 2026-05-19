import { useRef, useState } from "react";
import { ActivityIndicator, Pressable, ScrollView, Text, useColorScheme, View } from "react-native";
import { CameraView, useCameraPermissions } from "expo-camera";
import { Image } from "expo-image";
import { Stack } from "expo-router";
import { api } from "@personal/convex";
import type { Id } from "@personal/convex/dataModel";
import { useMutation, useQuery } from "convex/react";
import { getAppColors } from "@/theme/colors";

type ProcessingState = "idle" | "processing" | "saving";

const convexSiteUrl = process.env.EXPO_PUBLIC_CONVEX_SITE;

async function removePhotoBackground(photoUri: string) {
  try {
    const { removeBackgroundAsync } = await import("expo-background-remover");
    return await removeBackgroundAsync(photoUri);
  } catch (error) {
    if (error instanceof Error && error.message.includes("ExpoBackgroundRemover")) {
      throw new Error(
        "The background remover native module is not available in this build. Rebuild the iOS or Android app after installing expo-background-remover.",
      );
    }

    throw error;
  }
}

async function createFoodRecordFromPhoto(photoUri: string): Promise<string> {
  if (!convexSiteUrl) {
    throw new Error("Convex is not configured.");
  }

  const response = await fetch(photoUri);
  const photo = await response.blob();

  const uploadResponse = await fetch(`${convexSiteUrl}/food/photo`, {
    method: "POST",
    headers: {
      "content-type": photo.type || "image/png",
    },
    body: photo,
  });

  if (!uploadResponse.ok) {
    const body = (await uploadResponse.json().catch(() => null)) as { error?: string } | null;
    throw new Error(body?.error ?? "Could not save the food photo.");
  }

  const data = (await uploadResponse.json()) as { foodId: string };
  return data.foodId;
}

export default function BackgroundRemovalScreen() {
  const cameraRef = useRef<CameraView>(null);
  const [cameraPermission, requestCameraPermission] = useCameraPermissions();
  const [processedPhotoUri, setProcessedPhotoUri] = useState<string | null>(null);
  const [isFoodSaved, setIsFoodSaved] = useState(false);
  const [savedFoodId, setSavedFoodId] = useState<string | null>(null);
  const [isConnecting, setIsConnecting] = useState(false);
  const [processingState, setProcessingState] = useState<ProcessingState>("idle");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const reviews = useQuery(api.restaurantReviews.list);
  const foodRecord = useQuery(
    api.food.get,
    savedFoodId ? { id: savedFoodId as Id<"food"> } : "skip",
  );
  const connectRestaurant = useMutation(api.food.connectRestaurant);

  const colorScheme = useColorScheme();
  const colors = getAppColors(colorScheme);
  const hasCameraPermission = cameraPermission?.granted === true;
  const isBusy = processingState !== "idle";
  const hasProcessedPhoto = processedPhotoUri !== null;
  const canTakeAnotherPhoto =
    hasProcessedPhoto && !isBusy && (isFoodSaved || errorMessage !== null);
  const shouldDisableCta = isBusy || (hasProcessedPhoto && !isFoodSaved && errorMessage === null);

  async function captureAndRemoveBackground() {
    if (!hasCameraPermission || cameraRef.current === null || isBusy) {
      return;
    }

    setProcessingState("processing");
    setErrorMessage(null);
    setProcessedPhotoUri(null);
    setIsFoodSaved(false);
    setSavedFoodId(null);

    try {
      const photo = await cameraRef.current.takePictureAsync({
        quality: 0.9,
        skipProcessing: false,
      });

      if (!photo?.uri) {
        throw new Error("The camera did not return a photo.");
      }

      const nextProcessedPhotoUri = await removePhotoBackground(photo.uri);
      setProcessedPhotoUri(nextProcessedPhotoUri);
      setProcessingState("saving");
      const foodId = await createFoodRecordFromPhoto(nextProcessedPhotoUri);
      setSavedFoodId(foodId);
      setIsFoodSaved(true);
    } catch (error) {
      setErrorMessage(
        error instanceof Error ? error.message : "Could not remove the photo background.",
      );
    } finally {
      setProcessingState("idle");
    }
  }

  function resetPhotos() {
    setProcessedPhotoUri(null);
    setIsFoodSaved(false);
    setErrorMessage(null);
    setSavedFoodId(null);
  }

  if (hasProcessedPhoto) {
    return (
      <View className="flex-1 bg-app-background">
        <Stack.Screen
          options={{
            title: "Food Camera",
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
              Food cutout
            </Text>
            <Text className="text-app-text text-3xl font-extrabold leading-9" selectable>
              {isFoodSaved ? "Cutout saved!" : "Saving cutout..."}
            </Text>
            <Text className="text-app-muted text-[15px] leading-[21px]" selectable>
              {isFoodSaved
                ? "The background has been removed and the cutout is stored in your food log."
                : "We are processing the image and storing the cutout in your food log."}
            </Text>
          </View>

          <View
            className="h-80 overflow-hidden rounded-[32px] bg-app-field w-full"
            style={{
              borderCurve: "continuous",
            }}
          >
            <Image
              contentFit="contain"
              source={{ uri: processedPhotoUri }}
              style={{ flex: 1 }}
              transition={180}
            />
          </View>

          {isFoodSaved && savedFoodId && (
            <View className="gap-3">
              <Text
                className="text-app-label text-xs font-bold uppercase tracking-[1.3px]"
                selectable
              >
                Connect to restaurant review
              </Text>
              {reviews === undefined ? (
                <View className="flex-row items-center gap-2 rounded-[18px] bg-app-field p-4">
                  <ActivityIndicator size="small" color={colors.accent} />
                  <Text className="text-app-muted text-[15px]">Loading reviews...</Text>
                </View>
              ) : reviews.length === 0 ? (
                <View className="rounded-[18px] bg-app-field p-4">
                  <Text className="text-app-muted text-[15px]">
                    No reviews found. Add a review first to connect this photo.
                  </Text>
                </View>
              ) : (
                <View className="gap-2">
                  {reviews.map((r) => {
                    const isSelected = foodRecord?.restaurant === r._id;
                    return (
                      <Pressable
                        key={r._id}
                        onPress={async () => {
                          if (isConnecting) return;
                          setIsConnecting(true);
                          setErrorMessage(null);
                          try {
                            await connectRestaurant({
                              foodId: savedFoodId as Id<"food">,
                              restaurantId: isSelected ? undefined : r._id,
                            });
                          } catch (err) {
                            setErrorMessage(
                              err instanceof Error
                                ? err.message
                                : "Failed to update review connection.",
                            );
                          } finally {
                            setIsConnecting(false);
                          }
                        }}
                        className={`flex-row items-center justify-between p-4 rounded-[18px] border min-h-12 ${
                          isSelected
                            ? "bg-app-field border-app-accent"
                            : "bg-app-field border-transparent"
                        }`}
                        style={{ borderCurve: "continuous" }}
                      >
                        <View className="flex-1 gap-1">
                          <Text className="text-app-text text-base font-bold">
                            {r.restaurantName}
                          </Text>
                          {r.address ? (
                            <Text className="text-app-muted text-xs">{r.address}</Text>
                          ) : null}
                        </View>
                        <View className="items-end gap-1 pl-2">
                          <Text className="text-app-muted text-[13px] capitalize">{r.review}</Text>
                          {isSelected ? (
                            <Text className="text-app-accent text-xs font-bold">✓ Connected</Text>
                          ) : null}
                        </View>
                      </Pressable>
                    );
                  })}
                </View>
              )}
            </View>
          )}

          <View className="gap-3">
            {hasCameraPermission ? (
              <Pressable
                accessibilityRole="button"
                disabled={shouldDisableCta}
                onPress={resetPhotos}
                className={`min-h-14 flex-row items-center justify-center gap-3 rounded-full ${
                  shouldDisableCta ? "bg-app-disabled opacity-70" : "bg-app-text opacity-100"
                }`}
              >
                {isBusy ? <ActivityIndicator size="small" color={colors.label} /> : null}
                <Text
                  className={`text-[17px] font-extrabold ${
                    shouldDisableCta ? "text-app-label" : "text-app-background"
                  }`}
                >
                  {isBusy
                    ? processingState === "saving"
                      ? "Saving food..."
                      : "Removing background..."
                    : "Take another food photo"}
                </Text>
              </Pressable>
            ) : null}

            {errorMessage ? (
              <Text className="text-[15px] leading-[21px] text-red-600" selectable>
                {errorMessage}
              </Text>
            ) : null}
          </View>
        </ScrollView>
      </View>
    );
  }

  return (
    <View className="flex-1 gap-5 bg-app-background p-5">
      <Stack.Screen
        options={{
          title: "Food Camera",
          headerStyle: { backgroundColor: colors.background },
          headerLargeStyle: { backgroundColor: colors.background },
          headerTitleStyle: { color: colors.text },
        }}
      />

      <View className="gap-2 pt-2">
        <Text
          className="text-app-label text-[13px] font-bold uppercase tracking-[1.8px]"
          selectable
        >
          Food cutout
        </Text>
        <Text className="text-app-text text-3xl font-extrabold leading-9" selectable>
          Take a photo of a food.
        </Text>
        <Text className="text-app-muted text-[15px] leading-[21px]" selectable>
          We will remove the background on device and save the cutout to your food log.
        </Text>
      </View>

      {hasCameraPermission ? (
        <View
          className="flex-1 overflow-hidden rounded-[32px] bg-app-field"
          style={{
            borderCurve: "continuous",
          }}
        >
          {hasProcessedPhoto ? (
            <Image
              contentFit="contain"
              source={{ uri: processedPhotoUri }}
              style={{ flex: 1 }}
              transition={180}
            />
          ) : (
            <CameraView ref={cameraRef} facing="back" style={{ flex: 1 }} />
          )}
        </View>
      ) : (
        <View
          className="flex-1 items-center justify-center gap-3 rounded-[32px] bg-app-field p-6"
          style={{
            borderCurve: "continuous",
          }}
        >
          <Text className="text-center text-app-text text-xl font-bold" selectable>
            Camera access needed
          </Text>
          <Text className="text-center text-app-muted text-[15px] leading-[21px]" selectable>
            Allow camera access to take a photo for background removal.
          </Text>
          <Pressable
            accessibilityRole="button"
            className="min-h-12 items-center justify-center rounded-full bg-app-text px-6"
            onPress={requestCameraPermission}
          >
            <Text className="text-app-background text-[17px] font-extrabold">Allow camera</Text>
          </Pressable>
        </View>
      )}

      <View className="gap-3">
        {hasCameraPermission ? (
          <Pressable
            accessibilityRole="button"
            disabled={shouldDisableCta}
            onPress={hasProcessedPhoto ? resetPhotos : captureAndRemoveBackground}
            className={`min-h-14 flex-row items-center justify-center gap-3 rounded-full ${
              shouldDisableCta ? "bg-app-disabled opacity-70" : "bg-app-text opacity-100"
            }`}
          >
            {isBusy ? <ActivityIndicator size="small" color={colors.label} /> : null}
            <Text
              className={`text-[17px] font-extrabold ${
                shouldDisableCta ? "text-app-label" : "text-app-background"
              }`}
            >
              {isBusy
                ? processingState === "saving"
                  ? "Saving food..."
                  : "Removing background..."
                : canTakeAnotherPhoto
                  ? "Take another food photo"
                  : "Take food photo"}
            </Text>
          </Pressable>
        ) : null}

        {errorMessage ? (
          <Text className="text-[15px] leading-[21px] text-red-600" selectable>
            {errorMessage}
          </Text>
        ) : null}
      </View>
    </View>
  );
}
