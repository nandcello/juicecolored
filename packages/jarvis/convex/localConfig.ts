/** Provisioned device IDs only; device tokens live exclusively on the bridge. */
export function usesLocalControl(externalId: string) {
  return (
    !!process.env.JARVIS_BRIDGE_SECRET &&
    (process.env.JARVIS_LOCAL_DEVICE_IDS ?? "").split(",").includes(externalId)
  );
}

export function hasLocalControl() {
  return !!process.env.JARVIS_BRIDGE_SECRET && !!process.env.JARVIS_LOCAL_DEVICE_IDS;
}
