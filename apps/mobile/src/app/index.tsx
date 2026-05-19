import { api } from "@personal/convex";
import type { Doc, Id } from "@personal/convex/dataModel";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useMutation, useQuery } from "convex/react";
import { useEffect, useMemo, useState } from "react";
import { ActivityIndicator, FlatList, Pressable, Text, useColorScheme, View } from "react-native";
import ReanimatedSwipeable from "react-native-gesture-handler/ReanimatedSwipeable";
import { Link, Stack } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { getAppColors } from "@/theme/colors";
import { Image } from "expo-image";

type RestaurantReviewItem = Doc<"restaurantReviews"> & {
  createdAt: string;
};

type ReviewCardProps = RestaurantReviewItem & {
  onDelete: (id: Id<"restaurantReviews">) => void;
};

const reviewDateFormatter = new Intl.DateTimeFormat("en-US", {
  month: "short",
  day: "numeric",
});

const cachedReviewItemsKey = "restaurant-review-items";

function ReviewDeleteAction({ _id, onDelete }: Pick<ReviewCardProps, "_id" | "onDelete">) {
  return (
    <Pressable
      accessibilityLabel="Delete review"
      accessibilityRole="button"
      className="ml-3 min-w-24 items-center justify-center rounded-[22px] bg-red-500 px-5"
      onPress={() => onDelete(_id)}
      style={{
        borderCurve: "continuous",
      }}
    >
      <Text className="text-base font-extrabold text-white">Delete</Text>
    </Pressable>
  );
}

function ReviewCard({
  _id,
  restaurantName,
  address,
  review,
  createdAt,
  onDelete,
}: ReviewCardProps) {
  return (
    <ReanimatedSwipeable
      overshootRight={false}
      renderRightActions={() => <ReviewDeleteAction _id={_id} onDelete={onDelete} />}
    >
      <View
        accessibilityHint="Swipe left to reveal the delete action."
        className="gap-3 rounded-[22px] bg-app-field p-4"
        style={{
          borderCurve: "continuous",
        }}
      >
        <View className="gap-1">
          <Text className="text-app-text text-xl font-bold" selectable>
            {restaurantName}
          </Text>
          {address ? (
            <Text className="text-app-label text-[13px] font-semibold" selectable>
              {address}
            </Text>
          ) : null}
          <Text className="text-app-muted text-[15px] capitalize" selectable>
            {review}
          </Text>
        </View>
        <Text className="text-app-label text-xs font-bold uppercase tracking-[1.3px]" selectable>
          {createdAt}
        </Text>
      </View>
    </ReanimatedSwipeable>
  );
}

function FoodPhotoCard({
  imageUrl,
  restaurantName,
}: {
  imageUrl: string;
  restaurantName?: string;
}) {
  return (
    <View className="w-1/2 gap-1 p-1">
      <Image
        source={{ uri: imageUrl }}
        contentFit="contain"
        recyclingKey={imageUrl}
        style={{ width: "100%", aspectRatio: 1 }}
        transition={200}
      />
      {restaurantName ? (
        <Text
          className="text-app-muted px-1 text-center text-[10px] font-semibold"
          numberOfLines={1}
        >
          {restaurantName}
        </Text>
      ) : null}
    </View>
  );
}

export default function ReviewsScreen() {
  const [activeTab, setActiveTab] = useState<"reviews" | "photos">("reviews");
  const reviews = useQuery(api.restaurantReviews.list);
  const foodPhotos = useQuery(api.food.list);

  const [cachedReviewItems, setCachedReviewItems] = useState<RestaurantReviewItem[]>();
  const removeReview = useMutation(api.restaurantReviews.remove);

  const handleDeleteReview = (id: Id<"restaurantReviews">) => {
    void removeReview({ id });
  };

  const colorScheme = useColorScheme();
  const colors = getAppColors(colorScheme);

  const reviewItems = useMemo(
    () =>
      reviews?.map((review) => ({
        ...review,
        createdAt: reviewDateFormatter.format(review._creationTime),
      })),
    [reviews],
  );

  const restaurantMap = useMemo(() => {
    const map = new Map<string, string>();
    if (reviews) {
      for (const r of reviews) {
        map.set(r._id, r.restaurantName);
      }
    }
    return map;
  }, [reviews]);

  const displayedReviewItems = reviewItems ?? cachedReviewItems;
  const photoItems = useMemo(
    () => foodPhotos?.filter((photo) => photo.imageUrl.length > 0),
    [foodPhotos],
  );
  const isRefreshing = activeTab === "reviews" ? reviews === undefined : foodPhotos === undefined;

  useEffect(() => {
    let isMounted = true;

    async function hydrateCachedReviewItems() {
      try {
        const storedReviewItems = await AsyncStorage.getItem(cachedReviewItemsKey);
        if (storedReviewItems && isMounted) {
          setCachedReviewItems(JSON.parse(storedReviewItems));
        }
      } catch {
        await AsyncStorage.removeItem(cachedReviewItemsKey);
      }
    }

    void hydrateCachedReviewItems();

    return () => {
      isMounted = false;
    };
  }, []);

  useEffect(() => {
    if (reviewItems) {
      setCachedReviewItems(reviewItems);
      void AsyncStorage.setItem(cachedReviewItemsKey, JSON.stringify(reviewItems));
    }
  }, [reviewItems]);

  return (
    <View className="flex-1 bg-app-background">
      <Stack.Screen
        options={{
          title: activeTab === "reviews" ? "Reviews" : "Food Photos",
          headerStyle: { backgroundColor: colors.background },
          headerLargeStyle: { backgroundColor: colors.background },
          headerTitleStyle: { color: colors.text },
        }}
      />

      {activeTab === "reviews" ? (
        <FlatList
          contentContainerClassName="gap-3 p-5 pb-32"
          contentInsetAdjustmentBehavior="automatic"
          data={displayedReviewItems}
          className="flex-1"
          keyExtractor={(item) => item._id}
          renderItem={({ item }) => <ReviewCard {...item} onDelete={handleDeleteReview} />}
          ListEmptyComponent={
            <View className="items-center gap-3 rounded-[24px] bg-app-field p-6">
              <Text className="text-center text-app-text text-xl font-bold" selectable>
                {reviews === undefined ? "Loading reviews..." : "No reviews yet"}
              </Text>
              <Text className="text-center text-app-muted text-[15px] leading-[21px]" selectable>
                {reviews === undefined
                  ? "Your saved verdicts will appear here."
                  : "Add your first restaurant verdict while it is fresh."}
              </Text>
              {reviews !== undefined ? (
                <Link asChild href="/create">
                  <Pressable
                    accessibilityRole="button"
                    className="mt-2 min-h-12 items-center justify-center rounded-full bg-app-text px-6"
                  >
                    <Text className="text-app-background text-[17px] font-extrabold">
                      Add review
                    </Text>
                  </Pressable>
                </Link>
              ) : null}
            </View>
          }
        />
      ) : (
        <FlatList
          key="photos_grid"
          numColumns={2}
          contentContainerClassName="p-3 pb-32"
          contentInsetAdjustmentBehavior="automatic"
          data={photoItems}
          className="flex-1"
          keyExtractor={(item) => item._id}
          renderItem={({ item }) => (
            <FoodPhotoCard
              imageUrl={item.imageUrl}
              restaurantName={item.restaurant ? restaurantMap.get(item.restaurant) : undefined}
            />
          )}
          ListEmptyComponent={
            <View className="items-center gap-3 rounded-[24px] bg-app-field p-6 m-2">
              <Text className="text-center text-app-text text-xl font-bold" selectable>
                {foodPhotos === undefined ? "Loading food photos..." : "No food photos yet"}
              </Text>
              <Text className="text-center text-app-muted text-[15px] leading-[21px]" selectable>
                {foodPhotos === undefined
                  ? "Your logged dishes will appear here."
                  : "Snap a photo of your culinary delights with background removal!"}
              </Text>
              {foodPhotos !== undefined ? (
                <Link asChild href="/background-removal">
                  <Pressable
                    accessibilityRole="button"
                    className="mt-2 min-h-12 items-center justify-center rounded-full bg-app-text px-6"
                  >
                    <Text className="text-app-background text-[17px] font-extrabold">
                      Open Food Camera
                    </Text>
                  </Pressable>
                </Link>
              ) : null}
            </View>
          }
        />
      )}

      <View
        pointerEvents="none"
        className="absolute left-5 top-3 flex-row items-center gap-2 rounded-full bg-app-field px-3 py-1"
        style={{
          opacity: isRefreshing ? 1 : 0,
        }}
      >
        <ActivityIndicator animating={isRefreshing} color={colors.mutedText} size="small" />
        <Text className="text-app-muted text-xs font-bold">
          {activeTab === "reviews" ? "Refreshing latest reviews..." : "Refreshing food log..."}
        </Text>
      </View>

      <View
        className="absolute bottom-6 left-6 right-6 h-16 bg-app-field border border-app-disabled/10 rounded-full flex-row items-center justify-around shadow-lg px-4 z-40"
        style={{
          borderCurve: "continuous",
        }}
      >
        <Pressable
          onPress={() => setActiveTab("reviews")}
          className="flex-1 items-center justify-center py-2 gap-1"
        >
          <Ionicons
            name={activeTab === "reviews" ? "chatbox-ellipses" : "chatbox-ellipses-outline"}
            size={20}
            color={activeTab === "reviews" ? colors.accent : colors.mutedText}
          />
          <Text
            className={`text-[10px] font-extrabold tracking-wide uppercase ${
              activeTab === "reviews" ? "text-app-accent" : "text-app-muted"
            }`}
          >
            Reviews
          </Text>
        </Pressable>
        <Pressable
          onPress={() => setActiveTab("photos")}
          className="flex-1 items-center justify-center py-2 gap-1"
        >
          <Ionicons
            name={activeTab === "photos" ? "images" : "images-outline"}
            size={20}
            color={activeTab === "photos" ? colors.accent : colors.mutedText}
          />
          <Text
            className={`text-[10px] font-extrabold tracking-wide uppercase ${
              activeTab === "photos" ? "text-app-accent" : "text-app-muted"
            }`}
          >
            Photos
          </Text>
        </Pressable>
      </View>

      <View
        style={{
          position: "absolute",
          bottom: 104,
          right: 24,
          zIndex: 50,
        }}
      >
        {activeTab === "reviews" ? (
          <Link href="/create" asChild>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Add Review"
              className="w-14 h-14 rounded-full bg-app-accent items-center justify-center shadow-lg"
            >
              <Ionicons name="create-outline" size={26} color="#ffffff" />
            </Pressable>
          </Link>
        ) : (
          <Link href="/background-removal" asChild>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Food Camera"
              className="w-14 h-14 rounded-full bg-app-accent items-center justify-center shadow-lg"
            >
              <Ionicons name="camera-outline" size={26} color="#ffffff" />
            </Pressable>
          </Link>
        )}
      </View>
    </View>
  );
}
