import { useEffect, useState, useSyncExternalStore } from "react";

import {
  getLocalDataVersion,
  listLocalFood,
  listLocalReviews,
  subscribeToLocalData,
} from "./repository";
import type { LocalFood, LocalRestaurantReview } from "./types";

function useLocalQuery<T>(query: () => Promise<T[]>) {
  const version = useSyncExternalStore(
    subscribeToLocalData,
    getLocalDataVersion,
    getLocalDataVersion,
  );
  const [items, setItems] = useState<T[]>();

  useEffect(() => {
    let mounted = true;
    void query().then((nextItems) => {
      if (mounted) setItems(nextItems);
    });
    return () => {
      mounted = false;
    };
  }, [query, version]);
  return items;
}

export function useLocalReviews(): LocalRestaurantReview[] | undefined {
  return useLocalQuery(listLocalReviews);
}

export function useLocalFood(): LocalFood[] | undefined {
  return useLocalQuery(listLocalFood);
}
