export async function request<T = Record<string, unknown> & { warning?: string }>(
  operation?: Record<string, unknown>,
): Promise<T> {
  const response = await fetch(
    "/jarvis/api/jarvis",
    operation
      ? {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(operation),
        }
      : { cache: "no-store" },
  );
  const data = await response.json();
  if (!response.ok) {
    if (response.status === 401 && operation?.type !== "login") window.location.reload();
    throw new Error(data.error || "Jarvis could not complete the request.");
  }
  return data;
}
