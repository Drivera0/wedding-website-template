// ============================================================
//  MAP URL BUILDERS
// ============================================================
//  The venue address lives in src/config.ts and is baked into the build,
//  so every visitor resolves the same map. Two things go wrong with a
//  naive Google iframe, and both are handled here:
//
//   1. Google's `output=embed` endpoint is unofficial. Ad blockers,
//      Firefox strict tracking protection, Brave shields and EU cookie
//      consent walls can all stop it framing: which is why a map can
//      load fine for one person and stay blank for another. So we also
//      build an OpenStreetMap URL to fall back to; it needs no API key
//      and no consent, and it isn't on blocklists.
//
//   2. A browser that has already cached the old iframe will happily
//      keep showing the old pin. Every URL carries a `v` stamp derived
//      from the address itself, so the moment the address changes the
//      URL changes and the cached frame is bypassed.
// ============================================================

/** Tiny stable string hash: same address in, same stamp out. */
function stamp(s: string): string {
  let h = 0;
  for (let i = 0; i < s.length; i++) {
    h = (h << 5) - h + s.charCodeAt(i);
    h |= 0; // force int32
  }
  return Math.abs(h).toString(36);
}

/**
 * Google Maps embed. Prefers exact coordinates when we have them: text
 * queries are re-geocoded by Google on every load and can drift to the
 * wrong pin; a lat/lng cannot.
 */
export function googleEmbedUrl(
  query: string,
  lat?: number | null,
  lng?: number | null
): string {
  const hasCoords = typeof lat === "number" && typeof lng === "number";
  const q = hasCoords ? `${lat},${lng}` : query;
  const zoom = hasCoords ? "&z=16" : "";
  return `https://www.google.com/maps?q=${encodeURIComponent(
    q
  )}${zoom}&output=embed&v=${stamp(query)}`;
}

/** "Open in Google Maps" deep link: always the human-readable address. */
export function googleLinkUrl(query: string): string {
  return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(
    query
  )}`;
}

/**
 * OpenStreetMap embed, used when the Google frame fails to load.
 * Needs real coordinates (OSM's embed takes a bounding box, not a text
 * query), so this returns null until venueLat/venueLng are filled in.
 */
export function osmEmbedUrl(
  lat?: number | null,
  lng?: number | null
): string | null {
  if (typeof lat !== "number" || typeof lng !== "number") return null;
  const pad = 0.004; // roughly a few streets in each direction
  const bbox = [lng - pad, lat - pad, lng + pad, lat + pad].join("%2C");
  return `https://www.openstreetmap.org/export/embed.html?bbox=${bbox}&layer=mapnik&marker=${lat}%2C${lng}`;
}
