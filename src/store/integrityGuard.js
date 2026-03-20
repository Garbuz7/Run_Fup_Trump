// IntegrityGuard — signs localStorage values with HMAC-SHA256.
// Key is derived per-device via PBKDF2, so forged values are detected.

const SIG = '_sig'

let _key    = null
let _uid    = 'anon'
let _ready  = false

export function setUserId(id) { _uid = String(id || 'anon') }

export async function initIntegrity() {
  if (_ready) return
  _key   = await _deriveKey()
  _ready = true
}

export async function secureSet(k, v) {
  if (!_key) await initIntegrity()
  const json = JSON.stringify(v)
  const sig  = await _sign(k + ':' + json)
  try { localStorage.setItem(k,       json) } catch (_) {}
  try { localStorage.setItem(k + SIG, sig)  } catch (_) {}
}

export async function secureGet(k, fallback = null) {
  if (!_key) await initIntegrity()
  const raw = localStorage.getItem(k)
  const sig = localStorage.getItem(k + SIG)
  if (raw === null) return { value: fallback, ok: true }
  if (sig === null) return { value: fallback, ok: false }
  const ok = await _verify(k + ':' + raw, sig)
  if (!ok) return { value: fallback, ok: false }
  try { return { value: JSON.parse(raw), ok: true } } catch (_) { return { value: fallback, ok: false } }
}

export function rawGet(k, fallback = null) {
  try { const v = localStorage.getItem(k); return v !== null ? JSON.parse(v) : fallback } catch (_) { return fallback }
}

export async function auditAndFix(keys, defaults) {
  if (!_key) await initIntegrity()
  for (const k of keys) {
    const { ok } = await secureGet(k, defaults[k] ?? null)
    if (!ok) {
      localStorage.removeItem(k)
      localStorage.removeItem(k + SIG)
      await secureSet(k, defaults[k] ?? null)
    }
  }
}

// ── Internals ─────────────────────────────────────────────────────────────────
function _deviceId() {
  let id = localStorage.getItem('fup_did')
  if (!id) {
    id = (crypto.randomUUID?.() || Math.random().toString(36).slice(2) + Date.now().toString(36))
    localStorage.setItem('fup_did', id)
  }
  return id
}

async function _deriveKey() {
  const secret = new TextEncoder().encode(`fup:${_uid}:${_deviceId()}:v1`)
  const salt   = new TextEncoder().encode(`salt:${_deviceId()}`)
  const base   = await crypto.subtle.importKey('raw', secret, { name: 'PBKDF2' }, false, ['deriveKey'])
  return crypto.subtle.deriveKey(
    { name: 'PBKDF2', salt, iterations: 1000, hash: 'SHA-256' },
    base,
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign', 'verify']
  )
}

async function _sign(data) {
  const buf = await crypto.subtle.sign('HMAC', _key, new TextEncoder().encode(data))
  return btoa(String.fromCharCode(...new Uint8Array(buf)))
}

async function _verify(data, b64) {
  try {
    const buf = Uint8Array.from(atob(b64), c => c.charCodeAt(0))
    return await crypto.subtle.verify('HMAC', _key, buf, new TextEncoder().encode(data))
  } catch (_) { return false }
}
