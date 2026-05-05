const minute = 60 * 1000;
const hour = 60 * minute;
const day = 24 * hour;

export function formatListeningAge(playedAt: number, now = Date.now()) {
  const elapsed = Math.max(0, now - playedAt);

  if (elapsed < minute) {
    return "just now";
  }

  if (elapsed < hour) {
    return `${Math.floor(elapsed / minute)}m ago`;
  }

  if (elapsed < day) {
    return `${Math.floor(elapsed / hour)}h ago`;
  }

  return `${Math.floor(elapsed / day)}d ago`;
}
