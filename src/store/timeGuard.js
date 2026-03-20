// TimeGuard — fetches trusted UTC time, computes offset vs Date.now()
// All game time operations use trustedNow() instead of Date.now()

const OFFSET_SS   = 'fup_tg_off'    // sessionStorage key
const OFFSET_LS   = 'fup_tg_off_ls' // localStorage backup
const FETCHED_SS  = 'fup_tg_fetched'
const REVALIDATE  = 3_600_000 // re-fetch every 1 h
const MAX_DRIFT   = 90_000    // 90 s tolerance

let _offset  = null  // ms: serverTime - localNow at fetch time
let _trusted = false
let _promise = null

// ── Public ────────────────────────────────────────────────────────────────────
export function trustedNow() {
  return _offset !== null ? Date.now() + _offset : Date.now()
}

export function trustedTodayUTC() {
  return new Date(trustedNow()).toISOString().slice(0, 10)
}

export function isTrusted() { return _trusted }

export function clockTampered() {
  if (_offset === null) return false
  const stored = _readStored()
  if (stored === null) return false
  return Math.abs(_offset - stored) > MAX_DRIFT
}

export async function initTimeGuard(force = false) {
  if (_promise) return _promise
  _promise = _run(force).finally(() => { _promise = null })
  return _promise
}

// ── Internal ──────────────────────────────────────────────────────────────────
async function _run(force) {
  // Use cached offset if fresh enough
  if (!force) {
    const cached = _readStored()
    const age    = Date.now() - Number(sessionStorage.getItem(FETCHED_SS) || 0)
    if (cached !== null && age < REVALIDATE) {
      _offset  = cached
      _trusted = true
      return true
    }
  }

  // Try Cloudflare trace (most reliable — no CORS issues)
  try {
    const t1  = Date.now()
    const res = await fetch('https://cloudflare.com/cdn-cgi/trace', {
      cache: 'no-store', signal: AbortSignal.timeout(4000)
    })
    const txt = await res.text()
    const ts  = txt.match(/ts=(\d+\.?\d*)/)?.[1]
    if (ts) {
      const t2  = Date.now()
      _setOffset(parseFloat(ts) * 1000 - (t1 + t2) / 2)
      return true
    }
  } catch (_) {}

  // Try WorldTimeAPI
  try {
    const t1  = Date.now()
    const res = await fetch('https://worldtimeapi.org/api/timezone/UTC', {
      cache: 'no-store', signal: AbortSignal.timeout(4000)
    })
    const d   = await res.json()
    const t2  = Date.now()
    _setOffset(new Date(d.utc_datetime).getTime() - (t1 + t2) / 2)
    return true
  } catch (_) {}

  // Offline fallback — use stored offset from previous session
  const stored = _readStored()
  if (stored !== null) {
    _offset  = stored
    _trusted = false
    return false
  }

  _offset  = 0
  _trusted = false
  return false
}

function _setOffset(offset) {
  _offset  = offset
  _trusted = true
  try { sessionStorage.setItem(OFFSET_SS,  String(Math.round(offset))) } catch (_) {}
  try { localStorage.setItem(OFFSET_LS,    String(Math.round(offset))) } catch (_) {}
  try { sessionStorage.setItem(FETCHED_SS, String(Date.now()))         } catch (_) {}
}

function _readStored() {
  try { const v = sessionStorage.getItem(OFFSET_SS); if (v !== null) return parseInt(v) } catch (_) {}
  try { const v = localStorage.getItem(OFFSET_LS);   if (v !== null) return parseInt(v) } catch (_) {}
  return null
}
