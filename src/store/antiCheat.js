// AntiCheat — client-side game integrity checks
// NOTE: trustedNow is imported lazily to avoid circular deps at module init

import { trustedNow } from './timeGuard.js'

const MAX_CPS = 4.5       // max coins per second physically possible
const MIN_MS  = 180       // min ms between consecutive coins
const RAF_MAX = 3.0       // rAF/wall ratio threshold → speed hack

let _token     = null
let _start     = 0
let _lastCoin  = 0
let _coinCount = 0
let _timestamps = []
let _suspicion  = 0
let _onCheat    = null
let _encScore   = 0
let _XOR        = 0
let _rafHandle  = null
let _rafLast    = 0
let _rafPerf    = 0
let _rafSamples = []
let _devtools   = false

// ── Session ───────────────────────────────────────────────────────────────────
export function newSession() {
  _XOR       = (Date.now() & 0xFFFF) ^ 0xB4A3
  _token     = crypto.randomUUID?.() || Math.random().toString(36).slice(2)
  _start     = trustedNow()
  _lastCoin  = 0
  _coinCount = 0
  _timestamps = []
  _suspicion  = 0
  _encScore   = 0 ^ _XOR
  return _token
}

export function setCheatCb(fn) { _onCheat = fn }

// ── Coin validation ───────────────────────────────────────────────────────────
export function validateCoin() {
  const now = trustedNow()
  if (_lastCoin > 0 && now - _lastCoin < MIN_MS) {
    _addSuspicion(5, 'fast_coin')
    return false
  }
  _timestamps.push(now)
  if (_timestamps.length > 20) _timestamps.shift()
  const recent = _timestamps.filter(t => t >= now - 2000).length
  if (recent / 2 > MAX_CPS) {
    _addSuspicion(10, 'rate_exceed')
    return false
  }
  _lastCoin = now
  _coinCount++
  return true
}

// ── Score validation ──────────────────────────────────────────────────────────
export function validateScore(score) {
  if (!_token) return { valid: false, reason: 'no_session' }
  const elapsed = (trustedNow() - _start) / 1000
  if (elapsed < 0.5) return { valid: false, reason: 'too_fast' }
  const maxPossible = Math.ceil(MAX_CPS * elapsed * 1.2)
  if (score > maxPossible) {
    _addSuspicion(50, 'impossible')
    return { valid: false, reason: 'impossible', max: maxPossible }
  }
  if (Math.abs(score - _coinCount) > 3) {
    _addSuspicion(20, 'mismatch')
    return { valid: false, reason: 'mismatch', counted: _coinCount }
  }
  return { valid: true }
}

// ── Obfuscated score in RAM ───────────────────────────────────────────────────
export function setEncScore(n) { _encScore = (n & 0xFFFF) ^ _XOR }
export function getEncScore()  { return (_encScore ^ _XOR) & 0xFFFF }

// ── rAF speed-hack monitor ────────────────────────────────────────────────────
export function startRafMonitor() {
  if (_rafHandle) return
  _rafLast = Date.now()
  _rafPerf = performance.now()
  const loop = () => {
    const wallNow = Date.now()
    const perfNow = performance.now()
    const wallDt  = wallNow - _rafLast
    const perfDt  = perfNow - _rafPerf
    if (wallDt > 150 && wallDt < 8000) {
      const ratio = perfDt / wallDt
      _rafSamples.push(ratio)
      if (_rafSamples.length > 8) _rafSamples.shift()
      const avg = _rafSamples.reduce((a, b) => a + b, 0) / _rafSamples.length
      if (avg > RAF_MAX) _addSuspicion(30, 'speedhack')
    }
    _rafLast = wallNow
    _rafPerf = perfNow
    _rafHandle = requestAnimationFrame(loop)
  }
  _rafHandle = requestAnimationFrame(loop)
}

export function stopRafMonitor() {
  if (_rafHandle) { cancelAnimationFrame(_rafHandle); _rafHandle = null }
}

// ── DevTools monitor ──────────────────────────────────────────────────────────
export function startDevTools() {
  const check = () => {
    const open = window.outerWidth - window.innerWidth > 160 || window.outerHeight - window.innerHeight > 160
    if (open && !_devtools) _addSuspicion(10, 'devtools')
    _devtools = open
  }
  setInterval(check, 2000)
  window.addEventListener('resize', check)
}

// ── Helpers ───────────────────────────────────────────────────────────────────
function _addSuspicion(pts, reason) {
  _suspicion += pts
  if (_suspicion >= 40 && _onCheat) _onCheat({ reason, pts: _suspicion })
}
