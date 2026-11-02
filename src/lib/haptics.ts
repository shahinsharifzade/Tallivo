/** Optional haptic tap; silently ignored where unsupported. */
export function vibrate(): void {
  try {
    navigator.vibrate?.(15);
  } catch {
    // Not supported or blocked: nothing to do.
  }
}
