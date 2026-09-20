import * as BackgroundTask from "expo-background-task";
import * as TaskManager from "expo-task-manager";

import { initializeLocalRepository } from "./repository";
import { runOfflineSync } from "./sync";

const OFFLINE_SYNC_TASK = "juicecolored-offline-sync";

if (!TaskManager.isTaskDefined(OFFLINE_SYNC_TASK)) {
  TaskManager.defineTask(OFFLINE_SYNC_TASK, async () => {
    try {
      await initializeLocalRepository();
      await runOfflineSync(10);
      return BackgroundTask.BackgroundTaskResult.Success;
    } catch {
      return BackgroundTask.BackgroundTaskResult.Failed;
    }
  });
}

export async function registerOfflineBackgroundTask() {
  const available = await TaskManager.isAvailableAsync();
  if (!available) return;
  const registered = await TaskManager.isTaskRegisteredAsync(OFFLINE_SYNC_TASK);
  if (!registered) {
    await BackgroundTask.registerTaskAsync(OFFLINE_SYNC_TASK, { minimumInterval: 15 });
  }
}
