import type Lenis from "lenis";

let instance: Lenis | null = null;

export function setLenis(lenis: Lenis | null) {
  instance = lenis;
}

export function stopScroll() {
  instance?.stop();
}

export function startScroll() {
  instance?.start();
}

const easeOutQuart = (t: number) => 1 - Math.pow(1 - t, 4);

/**
 * Scroll to a section. Retries briefly, because this is usually called right
 * after a route change, when two things may not be ready yet: Lenis (set up in
 * an effect, so it can be null for the first frames) and the target element
 * itself. Previously a null Lenis meant the call silently did nothing, which is
 * why "Back to Discover" dumped you at the top of the page.
 */
export function scrollTo(target: string | HTMLElement, attempt = 0) {
  const el =
    typeof target === "string"
      ? document.querySelector<HTMLElement>(target)
      : target;

  const retry = () => {
    if (attempt < 25) setTimeout(() => scrollTo(target, attempt + 1), 80);
  };

  if (!el) return retry();

  if (instance) {
    instance.scrollTo(el, { duration: 1.2, easing: easeOutQuart, force: true });
  } else if (attempt < 25) {
    retry();
  } else {
    // Lenis never showed up. Native scrolling still gets them there.
    el.scrollIntoView({ behavior: "smooth", block: "start" });
  }
}

/**
 * Jump straight to a pixel offset, no animation. Used to put someone back
 * exactly where they were after a trip to a city page. Lenis owns the scroll
 * position when it's running, so going through it (rather than window.scrollTo)
 * is what actually sticks.
 */
export function scrollToY(y: number) {
  if (instance) {
    // Lenis caches the scrollable limit and clamps against it. Right after a
    // route change that cached value is still the old short page, so a jump
    // deep into a freshly mounted page silently landed a couple of thousand
    // pixels up. Recomputing first is what makes the jump actually arrive.
    instance.resize();
    instance.scrollTo(y, { immediate: true, force: true });
  } else {
    window.scrollTo(0, y);
  }
}

/** True once Lenis is running, so callers can wait for it instead of no-oping. */
export function hasLenis() {
  return instance !== null;
}

// ── Remembering where someone was before they opened a city page ──
//
//  A raw pixel offset is not enough. On the way back the page starts short and
//  grows as images decode, so an early jump to the old offset gets clamped to
//  whatever the document allows, and any section above the target shifting by a
//  few pixels leaves you off the mark. So we store an anchor instead: the
//  section nearest the top of the viewport, plus how far past it you were.
//  Re-resolving that against the live layout stays correct however the page
//  reflows.

const RETURN_KEY = "wedding:returnAnchor";

// Sections in document order. Any of these can serve as the anchor.
const SECTION_IDS = [
  "story",
  "gallery",
  "details",
  "venue",
  "travel",
  "discover",
  "faq",
];

type Anchor = { id: string | null; delta: number; y: number };

function documentTop(el: HTMLElement) {
  return el.getBoundingClientRect().top + window.scrollY;
}

export function rememberScroll() {
  try {
    const y = window.scrollY;
    // The anchor must be the section the viewport top is actually inside, which
    // means the smallest NON-NEGATIVE delta. Allowing negative deltas let a
    // section that starts just below the fold win, and restoring relative to
    // that one lands you off by however much the content above it reflowed.
    let best: { id: string; delta: number } | null = null;
    for (const id of SECTION_IDS) {
      const el = document.getElementById(id);
      if (!el) continue;
      const delta = y - documentTop(el);
      if (delta >= 0 && (best === null || delta < best.delta)) {
        best = { id, delta };
      }
    }
    const anchor: Anchor = { id: best?.id ?? null, delta: best?.delta ?? 0, y };
    sessionStorage.setItem(RETURN_KEY, JSON.stringify(anchor));
  } catch {
    /* private mode, no storage: not worth breaking navigation over */
  }
}

function readAnchor(): Anchor | null {
  try {
    const raw = sessionStorage.getItem(RETURN_KEY);
    if (!raw) return null;
    const a = JSON.parse(raw) as Anchor;
    return typeof a?.y === "number" ? a : null;
  } catch {
    return null;
  }
}

/** Is there a position waiting to be restored? Does not consume it. */
export function hasRememberedScroll(): boolean {
  return readAnchor() !== null;
}

/** Reads and clears the saved anchor. */
export function takeRememberedScroll(): Anchor | null {
  const a = readAnchor();
  if (a) {
    try {
      sessionStorage.removeItem(RETURN_KEY);
    } catch {
      /* ignore */
    }
  }
  return a;
}

/**
 * Where the saved anchor points to right now. Recomputed on every call so it
 * tracks the page as images finish loading and the layout settles.
 */
export function resolveAnchor(a: Anchor): number {
  if (a.id) {
    const el = document.getElementById(a.id);
    if (el) return Math.max(0, documentTop(el) + a.delta);
  }
  return Math.max(0, a.y);
}
