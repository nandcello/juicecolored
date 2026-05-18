import { useEffect, useState } from "react";
import * as Location from "expo-location";

type CurrentLocation = {
  latitude: number;
  longitude: number;
};

type CurrentLocationState = {
  location: CurrentLocation | null;
  isLoading: boolean;
  error: string | null;
};

export function useCurrentLocation(): CurrentLocationState {
  const [location, setLocation] = useState<CurrentLocation | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // TODO: ask for location permission when first interacting with autocomplete
  useEffect(() => {
    let isMounted = true;

    async function loadLocation() {
      setIsLoading(true);
      setError(null);

      try {
        const permission = await Location.requestForegroundPermissionsAsync();

        if (permission.status !== Location.PermissionStatus.GRANTED) {
          throw new Error("Location permission was not granted.");
        }

        const currentLocation = await Location.getCurrentPositionAsync({});

        if (!isMounted) {
          return;
        }

        setLocation({
          latitude: currentLocation.coords.latitude,
          longitude: currentLocation.coords.longitude,
        });
      } catch (locationError) {
        if (!isMounted) {
          return;
        }

        setLocation(null);
        setError(
          locationError instanceof Error
            ? locationError.message
            : "Could not get your current location.",
        );
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    }

    void loadLocation();

    return () => {
      isMounted = false;
    };
  }, []);

  return { location, isLoading, error };
}
