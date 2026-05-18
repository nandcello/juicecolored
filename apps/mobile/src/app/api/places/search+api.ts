const FOURSQUARE_API_VERSION = "2025-06-17";
const FOURSQUARE_PLACE_SEARCH_URL = "https://places-api.foursquare.com/places/search";
const SEARCH_RADIUS_METERS = "1000";

function parseCoordinate(value: string | null, name: string) {
  if (value === null) {
    return { error: `Missing required query parameter: ${name}` };
  }

  const coordinate = Number(value);

  if (!Number.isFinite(coordinate)) {
    return { error: `${name} must be a valid number` };
  }

  return { coordinate };
}

export async function GET(request: Request) {
  const apiKey = process.env.FOURSQUARE_API_KEY;

  if (!apiKey) {
    return Response.json({ error: "FOURSQUARE_API_KEY is not configured" }, { status: 500 });
  }

  const url = new URL(request.url);
  const query = url.searchParams.get("query")?.trim();
  const lat = parseCoordinate(url.searchParams.get("lat"), "lat");
  const lng = parseCoordinate(url.searchParams.get("lng"), "lng");

  if ("error" in lat) {
    return Response.json({ error: lat.error }, { status: 400 });
  }

  if ("error" in lng) {
    return Response.json({ error: lng.error }, { status: 400 });
  }

  if (!query) {
    return Response.json({ error: "Missing required query parameter: query" }, { status: 400 });
  }

  const foursquareUrl = new URL(FOURSQUARE_PLACE_SEARCH_URL);
  foursquareUrl.searchParams.set("query", query);
  foursquareUrl.searchParams.set("ll", `${lat.coordinate},${lng.coordinate}`);
  foursquareUrl.searchParams.set("radius", SEARCH_RADIUS_METERS);
  foursquareUrl.searchParams.set("limit", "10");

  const response = await fetch(foursquareUrl, {
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "X-Places-Api-Version": FOURSQUARE_API_VERSION,
    },
  });

  const data: unknown = await response.json();

  if (!response.ok) {
    return Response.json(data, { status: response.status });
  }

  return Response.json(data);
}
