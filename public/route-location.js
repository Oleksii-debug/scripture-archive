/** Legacy #/ routes stay supported; strip hash-route query before matching coordinates. */
export function routeSourceFromLocation({ pathname, hash }) {
  return hash.startsWith("#/") ? hash.slice(2).split("?")[0] : pathname.replace(/^\/?/, "");
}

/** Re-render only when entering, leaving, or changing a legacy hash route. */
export function legacyRouteHashChanged(oldURL, newURL) {
  return new URL(oldURL).hash.startsWith("#/") || new URL(newURL).hash.startsWith("#/");
}
