/** Legacy #/ routes stay supported; ordinary #id anchors must not select a workspace. */
export function routeSourceFromLocation({ pathname, hash }) {
  return hash.startsWith("#/") ? hash.slice(2) : pathname.replace(/^\/?/, "");
}

/** Re-render only when entering, leaving, or changing a legacy hash route. */
export function legacyRouteHashChanged(oldURL, newURL) {
  return new URL(oldURL).hash.startsWith("#/") || new URL(newURL).hash.startsWith("#/");
}
