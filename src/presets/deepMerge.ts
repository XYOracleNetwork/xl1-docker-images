/**
 * Deep-merge plain objects. Arrays and non-objects are replaced (not concatenated).
 */
export function deepMerge<T extends Record<string, unknown>>(
  base: T,
  ...overlays: readonly (Record<string, unknown> | undefined)[]
): T {
  let result: Record<string, unknown> = { ...base }
  for (const overlay of overlays) {
    if (overlay === undefined) continue
    result = mergePair(result, overlay)
  }
  return result as T
}

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function mergePair(
  base: Record<string, unknown>,
  overlay: Record<string, unknown>,
): Record<string, unknown> {
  const out: Record<string, unknown> = { ...base }
  for (const [key, value] of Object.entries(overlay)) {
    const existing = out[key]
    out[key] = isPlainObject(existing) && isPlainObject(value) ? mergePair(existing, value) : value
  }
  return out
}
