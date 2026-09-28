export function subjectPath(slug: string) {
  return `/subject/${encodeURIComponent(slug)}`;
}

export function searchPath(query: string) {
  return `/?q=${encodeURIComponent(query)}`;
}

export function publicPath(path: string) {
  return `/canceldt${path === "/" ? "" : path.replace(/^\/\?/, "?")}`;
}
