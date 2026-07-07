import { CONTENT_DEFAULTS } from "../data/content";

/**
 * Returns a `c(key, fallback?)` getter for the site wording.
 *
 * This used to fetch a site_content table on every page load and let those
 * values override the ones in the repo. That cost a request before anything
 * could render, and the override was a trap: a value saved from the admin
 * screen looked right to the person who saved it and wrong to everyone else.
 *
 * The wording now lives only in src/data/content.ts, so this resolves
 * synchronously with no network call at all. The hook shape is unchanged, so
 * components keep working as they were.
 */
export function useContent() {
  return (key: string, fallback = "") => CONTENT_DEFAULTS[key] ?? fallback;
}
