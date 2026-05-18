import { api } from "@personal/convex";
import { useQuery } from "convex/react";
import { FlatList, Pressable, Text, useColorScheme, View } from "react-native";
import { Link, Stack } from "expo-router";
import { getAppColors } from "@/theme/colors";

type RestaurantReview = {
  id: string;
  restaurantName: string;
  review: string;
  createdAt: string;
};

const reviewDateFormatter = new Intl.DateTimeFormat("en-US", {
  month: "short",
  day: "numeric",
});

function ReviewCard({ restaurantName, review, createdAt }: RestaurantReview) {
  return (
    <View
      className="gap-3 rounded-[22px] bg-app-field p-4"
      style={{
        borderCurve: "continuous",
      }}
    >
      <View className="gap-1">
        <Text className="text-app-text text-xl font-bold" selectable>
          {restaurantName}
        </Text>
        <Text className="text-app-muted text-[15px] capitalize" selectable>
          {review}
        </Text>
      </View>
      <Text className="text-app-label text-xs font-bold uppercase tracking-[1.3px]" selectable>
        {createdAt}
      </Text>
    </View>
  );
}

export default function ReviewsScreen() {
  const reviews = useQuery(api.restaurantReviews.list);
  const colorScheme = useColorScheme();
  const colors = getAppColors(colorScheme);
  const reviewItems = reviews?.map((review) => ({
    id: review._id,
    restaurantName: review.restaurantName,
    review: review.review,
    createdAt: reviewDateFormatter.format(review._creationTime),
  }));

  return (
    <View className="flex-1 bg-app-background">
      <Stack.Screen
        options={{
          title: "Reviews",
          headerStyle: { backgroundColor: colors.background },
          headerLargeStyle: { backgroundColor: colors.background },
          headerTitleStyle: { color: colors.text },
          headerRight: () => (
            <Link asChild href="/create">
              <Pressable accessibilityRole="button" className="px-1 py-2">
                <Text className="text-app-accent text-[17px] font-bold">Add</Text>
              </Pressable>
            </Link>
          ),
        }}
      />
      <FlatList
        contentContainerClassName="gap-3 p-5 pb-10"
        contentInsetAdjustmentBehavior="automatic"
        data={reviewItems}
        className="flex-1"
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => <ReviewCard {...item} />}
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
                  <Text className="text-app-background text-[17px] font-extrabold">Add review</Text>
                </Pressable>
              </Link>
            ) : null}
          </View>
        }
      />
    </View>
  );
}
