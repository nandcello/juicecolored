import { v } from "convex/values";

import { action } from "./_generated/server";

const FOURSQUARE_API_VERSION = "2025-06-17";
const FOURSQUARE_PLACE_SEARCH_URL = "https://places-api.foursquare.com/places/search";
const SEARCH_RADIUS_METERS = "1000";
const SEARCH_RESULT_LIMIT = "10";

const placeSuggestionValidator = v.object({
  id: v.string(),
  name: v.string(),
});

export const search = action({
  args: {
    query: v.string(),
    latitude: v.number(),
    longitude: v.number(),
  },
  returns: v.array(placeSuggestionValidator),
  handler: async (_ctx, args) => {
    const apiKey = process.env.FOURSQUARE_API_KEY;
    const query = args.query.trim();

    if (!apiKey) {
      throw new Error("FOURSQUARE_API_KEY is not configured.");
    }

    if (!query) {
      throw new Error("Search query is required.");
    }

    const foursquareUrl = new URL(FOURSQUARE_PLACE_SEARCH_URL);
    foursquareUrl.searchParams.set("query", query);
    foursquareUrl.searchParams.set("ll", `${args.latitude},${args.longitude}`);
    foursquareUrl.searchParams.set("radius", SEARCH_RADIUS_METERS);
    foursquareUrl.searchParams.set("limit", SEARCH_RESULT_LIMIT);

    const response = await fetch(foursquareUrl, {
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "X-Places-Api-Version": FOURSQUARE_API_VERSION,
      },
    });

    const data: unknown = await response.json();

    if (!response.ok) {
      throw new Error("Could not load restaurant suggestions.");
    }

    return parsePlaceSuggestions(data);
  },
});

function parsePlaceSuggestions(data: unknown) {
  if (!data || typeof data !== "object" || !("results" in data) || !Array.isArray(data.results)) {
    return [];
  }

  return data.results.flatMap((place) => {
    if (
      !place ||
      typeof place !== "object" ||
      !("fsq_place_id" in place) ||
      typeof place.fsq_place_id !== "string" ||
      !("name" in place) ||
      typeof place.name !== "string"
    ) {
      return [];
    }

    return [{ id: place.fsq_place_id, name: place.name }];
  });
}
