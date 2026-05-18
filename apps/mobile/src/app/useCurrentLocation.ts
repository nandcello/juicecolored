import { useCallback, useState } from "react";
import * as Location from "expo-location";

type CurrentLocation = {
  latitude: number;
  longitude: number;
};

type CurrentLocationState = {
  location: CurrentLocation | null;
  isLoading: boolean;
  error: string | null;
  requestLocation: () => Promise<CurrentLocation | null>;
};

export function useCurrentLocation(): CurrentLocationState {
  const [location, setLocation] = useState<CurrentLocation | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const requestLocation = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    try {
      const permission = await Location.requestForegroundPermissionsAsync();

      if (permission.status !== Location.PermissionStatus.GRANTED) {
        throw new Error("Location permission was not granted.");
      }

      const currentLocation = await Location.getCurrentPositionAsync({});
      const nextLocation = {
        latitude: currentLocation.coords.latitude,
        longitude: currentLocation.coords.longitude,
      };

      setLocation(nextLocation);
      return nextLocation;
    } catch (locationError) {
      setLocation(null);
      setError(
        locationError instanceof Error
          ? locationError.message
          : "Could not get your current location.",
      );
      return null;
    } finally {
      setIsLoading(false);
    }
  }, []);

  return { location, isLoading, error, requestLocation };
}
