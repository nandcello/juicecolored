import { useRef, useState } from "react";
import { ActivityIndicator, Pressable, ScrollView, Text, useColorScheme, View } from "react-native";
import { CameraView, useCameraPermissions } from "expo-camera";
import { Image } from "expo-image";
import { Stack } from "expo-router";
import { getAppColors } from "@/theme/colors";

type ProcessingState = "idle" | "processing";

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

export default function BackgroundRemovalScreen() {
  const cameraRef = useRef<CameraView>(null);
  const [cameraPermission, requestCameraPermission] = useCameraPermissions();
  const [originalPhotoUri, setOriginalPhotoUri] = useState<string | null>(null);
  const [processedPhotoUri, setProcessedPhotoUri] = useState<string | null>(null);
  const [processingState, setProcessingState] = useState<ProcessingState>("idle");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const colorScheme = useColorScheme();
  const colors = getAppColors(colorScheme);
  const hasCameraPermission = cameraPermission?.granted === true;
  const isBusy = processingState !== "idle";
  const hasProcessedPhoto = processedPhotoUri !== null;

  async function captureAndRemoveBackground() {
    if (!hasCameraPermission || cameraRef.current === null || isBusy) {
      return;
    }

    setProcessingState("processing");
    setErrorMessage(null);
    setProcessedPhotoUri(null);

    try {
      const photo = await cameraRef.current.takePictureAsync({
        quality: 0.9,
        skipProcessing: false,
      });

      if (!photo?.uri) {
        throw new Error("The camera did not return a photo.");
      }

      setOriginalPhotoUri(photo.uri);

      const nextProcessedPhotoUri = await removePhotoBackground(photo.uri);
      setProcessedPhotoUri(nextProcessedPhotoUri);
    } catch (error) {
      setErrorMessage(
        error instanceof Error ? error.message : "Could not remove the photo background.",
      );
    } finally {
      setProcessingState("idle");
    }
  }

  function resetPhotos() {
    setOriginalPhotoUri(null);
    setProcessedPhotoUri(null);
    setErrorMessage(null);
  }

  return (
    <ScrollView
      className="flex-1 bg-app-background"
      contentContainerClassName="grow gap-5 p-5 pb-10"
      contentInsetAdjustmentBehavior="automatic"
    >
      <Stack.Screen
        options={{
          title: "Remove Background",
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
          Photo cutout
        </Text>
        <Text className="text-app-text text-xl font-semibold leading-7" selectable>
          Take a photo and remove its background on device.
        </Text>
      </View>

      {hasCameraPermission ? (
        <View
          className="aspect-[3/4] overflow-hidden rounded-[28px] bg-app-field"
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
          {isBusy ? (
            <View className="absolute inset-0 items-center justify-center gap-3 bg-black/45">
              <ActivityIndicator color="white" size="large" />
              <Text className="px-5 text-center text-base font-bold text-white">
                Removing background...
              </Text>
            </View>
          ) : null}
        </View>
      ) : (
        <View
          className="items-center gap-3 rounded-[24px] bg-app-field p-6"
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
            disabled={isBusy}
            onPress={hasProcessedPhoto ? resetPhotos : captureAndRemoveBackground}
            className={`min-h-14 items-center justify-center rounded-full ${
              isBusy ? "bg-app-disabled opacity-70" : "bg-app-text opacity-100"
            }`}
          >
            <Text
              className={`text-[17px] font-extrabold ${
                isBusy ? "text-app-label" : "text-app-background"
              }`}
            >
              {hasProcessedPhoto ? "Take another photo" : "Take photo"}
            </Text>
          </Pressable>
        ) : null}

        {originalPhotoUri && hasProcessedPhoto ? (
          <View className="gap-2">
            <Text
              className="text-app-label text-xs font-bold uppercase tracking-[1.3px]"
              selectable
            >
              Original
            </Text>
            <View
              className="aspect-square overflow-hidden rounded-[22px] bg-app-field"
              style={{
                borderCurve: "continuous",
              }}
            >
              <Image
                contentFit="cover"
                source={{ uri: originalPhotoUri }}
                style={{ flex: 1 }}
                transition={180}
              />
            </View>
          </View>
        ) : null}

        {errorMessage ? (
          <Text className="text-[15px] leading-[21px] text-red-600" selectable>
            {errorMessage}
          </Text>
        ) : null}

        <Text className="text-app-muted text-[15px] leading-[21px]" selectable>
          Background removal runs through the Expo background remover native module and returns a
          transparent PNG when a subject is found.
        </Text>
      </View>
    </ScrollView>
  );
}
