/**
 * Studio-Grade Celestial State Store & Physics Engine
 * Single source of truth for smooth inertia, spring physics, and pass state transitions.
 */

export type PassPhase =
  | "ENTERING"
  | "PRE_REVEAL"
  | "PASS_01"
  | "TRANSITION_01_02"
  | "PASS_02"
  | "TRANSITION_02_03"
  | "PASS_03"
  | "EXITING"
  | "MANUAL_DRAG"
  | "SNAPPING";

export const scrollState = {
  progress: 0,
  offset: 0,
  pointerX: 0,
  pointerY: 0,
  passesBlend: 0,
  passTimeline: 0.25,
  targetTimeline: 0.25,
  dragVelocity: 0,
  activePass: 0,
  phase: "ENTERING" as PassPhase,
  isDragging: false,
  hasInteractedWithPasses: false,
  introPhase: "pitch_black" as
    "pitch_black" | "moon_fade_in" | "light_spin" | "moon_fade_out" | "rausch" | "done",
  introMoonOpacity: 0,
  introAngle: -Math.PI / 2,
};

type Listener = (state: typeof scrollState) => void;
const listeners = new Set<Listener>();

export function subscribeScroll(fn: Listener) {
  listeners.add(fn);
  return () => {
    listeners.delete(fn);
  };
}

export function notifyScroll() {
  listeners.forEach((fn) => fn(scrollState));
}

export const assetState = {
  isMoonLoaded: false,
  progress: 0,
};

type AssetListener = (state: typeof assetState) => void;
const assetListeners = new Set<AssetListener>();

export function subscribeAsset(fn: AssetListener) {
  assetListeners.add(fn);
  return () => {
    assetListeners.delete(fn);
  };
}

export function setMoonLoadedState(loaded: boolean, progress = 100) {
  assetState.isMoonLoaded = loaded;
  assetState.progress = Math.max(assetState.progress, progress);
  assetListeners.forEach((fn) => fn(assetState));
}

export function setIntroState(
  phase: typeof scrollState.introPhase,
  opacity = scrollState.introMoonOpacity,
  angle = scrollState.introAngle,
) {
  scrollState.introPhase = phase;
  scrollState.introMoonOpacity = opacity;
  scrollState.introAngle = angle;
  notifyScroll();
}

export function snapPass(idx: number) {
  const targets = [0.15, 0.40, 0.67, 0.88];
  scrollState.activePass = idx;
  scrollState.targetTimeline = targets[idx] ?? 0.25;
  scrollState.hasInteractedWithPasses = true;
  notifyScroll();
}

export function setPassIndex(idx: number) {
  snapPass(idx);
}

export function setPassDrag(delta: number) {
  scrollState.isDragging = true;
  scrollState.passTimeline = Math.max(0, Math.min(1, scrollState.passTimeline + delta));
  notifyScroll();
}

export function endPassDrag() {
  scrollState.isDragging = false;
  notifyScroll();
}

export function triggerHaptic() {
  if (typeof window !== "undefined" && "navigator" in window && (navigator as any).vibrate) {
    try {
      (navigator as any).vibrate(12);
    } catch {
      // Ignore if unsupported
    }
  }
}

export function readScroll() {
  if (typeof window === "undefined") return;
  const max = document.documentElement.scrollHeight - window.innerHeight;
  scrollState.offset = window.scrollY;
  scrollState.progress = max > 0 ? Math.min(1, Math.max(0, window.scrollY / max)) : 0;
  notifyScroll();
}
