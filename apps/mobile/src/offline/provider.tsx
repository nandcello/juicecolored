import * as Network from "expo-network";
import { createContext, useContext, useEffect, useState, type PropsWithChildren } from "react";
import { AppState } from "react-native";

import { registerOfflineBackgroundTask } from "./background";
import { initializeLocalRepository } from "./repository";
import { runOfflineSync } from "./sync";

const OfflineReadyContext = createContext(false);

export function OfflineDataProvider({ children }: PropsWithChildren) {
  const [isReady, setIsReady] = useState(false);

  useEffect(() => {
    let mounted = true;
    let networkSubscription: ReturnType<typeof Network.addNetworkStateListener> | null = null;
    let appStateSubscription: ReturnType<typeof AppState.addEventListener> | null = null;

    async function start() {
      await initializeLocalRepository();
      if (!mounted) return;
      setIsReady(true);
      void registerOfflineBackgroundTask().catch(() => undefined);
      void runOfflineSync().catch(() => undefined);

      networkSubscription = Network.addNetworkStateListener((state) => {
        if (state.isConnected && state.isInternetReachable !== false) {
          void runOfflineSync().catch(() => undefined);
        }
      });
      appStateSubscription = AppState.addEventListener("change", (state) => {
        if (state === "active") void runOfflineSync().catch(() => undefined);
      });
    }

    void start();
    return () => {
      mounted = false;
      networkSubscription?.remove();
      appStateSubscription?.remove();
    };
  }, []);

  return <OfflineReadyContext.Provider value={isReady}>{children}</OfflineReadyContext.Provider>;
}

export function useOfflineReady() {
  return useContext(OfflineReadyContext);
}
