import { useCallback, useState } from "react";
import * as Location from "expo-location";

type CurrentLocation = {
  latitude: number;
  longitude: number;
};

type CurrentLocationState = {
  location: CurrentLocation | null;
  requestLocation: () => Promise<CurrentLocation | null>;
};

export function useCurrentLocation(): CurrentLocationState {
  const [location, setLocation] = useState<CurrentLocation | null>(null);

  const requestLocation = useCallback(async () => {
    try {
      const permission = await Location.requestForegroundPermissionsAsync();

      if (permission.status !== Location.PermissionStatus.GRANTED) {
        return null;
      }

      const currentLocation = await Location.getCurrentPositionAsync({});
      const nextLocation = {
        latitude: currentLocation.coords.latitude,
        longitude: currentLocation.coords.longitude,
      };

      setLocation(nextLocation);
      return nextLocation;
    } catch {
      setLocation(null);
      return null;
    }
  }, []);

  return { location, requestLocation };
}
