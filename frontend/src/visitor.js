/**
 * Random ids for this browser. crypto.randomUUID only exists on HTTPS and localhost, so plain
 * http:// (a phone opening the dev server over Wi-Fi) falls back to getRandomValues, which works
 * everywhere.
 */
export function randomId() {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID()
  }
  const bytes = new Uint8Array(16)
  crypto.getRandomValues(bytes)
  return Array.from(bytes, (byte) => byte.toString(16).padStart(2, '0')).join('')
}

const KEY = 'handyai.visitor'
let memoryId = null

/** One anonymous id per browser, used for the live-users count and nothing else. */
export function visitorId() {
  try {
    let id = localStorage.getItem(KEY)
    if (!id) {
      id = randomId()
      localStorage.setItem(KEY, id)
    }
    return id
  } catch {
    memoryId ??= randomId()
    return memoryId
  }
}
