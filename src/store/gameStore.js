// GameStore v3 — protected with TimeGuard + IntegrityGuard
// FIX: getAttempts/addAttempts/useAttempt/saveRun/claimDailyReward are all async.
//      All callers must use await.

import { trustedNow, trustedTodayUTC, isTrusted, clockTampered } from './timeGuard.js'
import { secureSet, secureGet, rawGet, auditAndFix, setUserId, initIntegrity } from './integrityGuard.js'

const K = {
  BEST:        'fup_best',
  ATTEMPTS:    'fup_att',
  ATT_DAY:     'fup_att_day',
  GAMES:       'fup_games',
  COINS:       'fup_coins',
  STREAK:      'fup_streak',
  LAST_LOGIN:  'fup_login',
  ACHIEVEMENTS:'fup_ach',
  REFS_USED:   'fup_refs_used',
  REF_COUNT:   'fup_ref_count',
  REF_BONUS:   'fup_ref_bonus',
  LEADERBOARD: 'fup_board',
  WALLET:      'fup_wallet',
}

const FREE_DAILY   = 10
const DAILY_REWARD = 2
const REF_GIFT     = 5

const PROTECTED = [K.BEST, K.ATTEMPTS, K.ATT_DAY, K.GAMES, K.COINS, K.STREAK, K.LAST_LOGIN]
const DEFAULTS  = {
  [K.BEST]: 0, [K.ATTEMPTS]: FREE_DAILY, [K.ATT_DAY]: null,
  [K.GAMES]: 0, [K.COINS]: 0, [K.STREAK]: 0, [K.LAST_LOGIN]: null,
}

let _initialized = false

// ── Init (call once at startup) ───────────────────────────────────────────────
export async function initStore(userId) {
  if (_initialized) return
  _initialized = true
  if (userId) setUserId(userId)
  await initIntegrity()
  await auditAndFix(PROTECTED, DEFAULTS)
}

// ── Helpers ───────────────────────────────────────────────────────────────────
function _today() { return trustedTodayUTC() ?? new Date().toISOString().slice(0, 10) }
function _now()   { return trustedNow() }

async function _read(k, fb) {
  const { value, ok } = await secureGet(k, fb)
  if (!ok) { await secureSet(k, fb); return fb }
  return value ?? fb
}

// ── Attempts ─────────────────────────────────────────────────────────────────
export async function getAttempts() {
  const today = _today()
  const day   = rawGet(K.ATT_DAY, null)
  if (day !== today) {
    await secureSet(K.ATT_DAY, today)
    const cur = rawGet(K.ATTEMPTS, 0)
    const val = cur < FREE_DAILY ? FREE_DAILY : cur
    await secureSet(K.ATTEMPTS, val)
    return val
  }
  return _read(K.ATTEMPTS, FREE_DAILY)
}

export async function useAttempt() {
  const cur = await getAttempts()
  if (cur <= 0) return false
  await secureSet(K.ATTEMPTS, cur - 1)
  return true
}

export async function addAttempts(n) {
  const cur  = await getAttempts()
  const next = cur + Math.max(0, Math.min(n, 200)) // cap at +200 per call
  await secureSet(K.ATTEMPTS, next)
}

// ── Daily reward ─────────────────────────────────────────────────────────────
export async function claimDaily() {
  const today = _today()
  const last  = rawGet(K.LAST_LOGIN, null)
  if (last === today) return null

  await secureSet(K.LAST_LOGIN, today)
  await addAttempts(DAILY_REWARD)

  const yest    = new Date(_now() - 86_400_000).toISOString().slice(0, 10)
  const streak  = rawGet(K.STREAK, 0)
  const newStr  = last === yest ? streak + 1 : 1
  await secureSet(K.STREAK, newStr)

  return { attempts: DAILY_REWARD, streak: newStr }
}

// ── Score / Stats ─────────────────────────────────────────────────────────────
export function getBest()   { return rawGet(K.BEST,  0) }
export function getGames()  { return rawGet(K.GAMES, 0) }
export function getCoins()  { return rawGet(K.COINS, 0) }
export function getStreak() { return rawGet(K.STREAK, 0) }
export function isTimeTrusted()  { return isTrusted() }
export function isClockBad()     { return clockTampered() }

export async function saveRun(score) {
  const best  = getBest()
  const isNew = score > best
  if (isNew) await secureSet(K.BEST, score)
  await secureSet(K.GAMES, getGames() + 1)
  await secureSet(K.COINS, getCoins() + score)
  const newAch = _checkAch(score)
  return { isNew, newAch }
}

// ── Referrals ─────────────────────────────────────────────────────────────────
export function getRefCount() { return rawGet(K.REF_COUNT, 0) }
export function getRefBonus() { return rawGet(K.REF_BONUS, 0) }

export async function applyReferral(refId, myId) {
  if (!refId || refId === String(myId)) return false
  const used = rawGet(K.REFS_USED, [])
  if (used.includes(refId)) return false
  used.push(refId)
  try { localStorage.setItem(K.REFS_USED, JSON.stringify(used)) } catch (_) {}
  await addAttempts(REF_GIFT)
  try { localStorage.setItem(K.REF_BONUS, JSON.stringify(getRefBonus() + REF_GIFT)) } catch (_) {}
  return true
}

export function recordRefSent() {
  try { localStorage.setItem(K.REF_COUNT, JSON.stringify(getRefCount() + 1)) } catch (_) {}
}

export function refLink(userId, bot = 'FupRunnerBot') {
  return `https://t.me/${bot}?start=r${userId}`
}

// ── Achievements ──────────────────────────────────────────────────────────────
export const ACH_DEFS = [
  { id: 'coin1',  label: 'First Coin',      icon: '🪙', req: g => g.score >= 1        },
  { id: 'coin10', label: '10 FUP',           icon: '💰', req: g => g.score >= 10       },
  { id: 'coin50', label: '50 FUP',           icon: '🏅', req: g => g.score >= 50       },
  { id: 'coin100',label: 'Century',          icon: '💯', req: g => g.score >= 100      },
  { id: 'coin500',label: 'FUP Legend',       icon: '🌟', req: g => g.score >= 500      },
  { id: 'game10', label: '10 Games',         icon: '🎮', req: g => g.games >= 10       },
  { id: 'game50', label: '50 Games',         icon: '🕹️', req: g => g.games >= 50      },
  { id: 'tot1k',  label: '1K Total Coins',   icon: '🏆', req: g => g.total >= 1000     },
  { id: 'str3',   label: '3-Day Streak',     icon: '🔥', req: g => g.streak >= 3       },
  { id: 'str7',   label: 'Week Warrior',     icon: '⚡', req: g => g.streak >= 7       },
  { id: 'ref1',   label: 'First Referral',   icon: '🤝', req: g => g.refs >= 1         },
  { id: 'ref5',   label: '5 Friends',        icon: '👥', req: g => g.refs >= 5         },
]

export function getAch() { return rawGet(K.ACHIEVEMENTS, []) }

function _checkAch(score) {
  const done = getAch()
  const ctx  = { score, games: getGames(), total: getCoins(), streak: getStreak(), refs: getRefCount() }
  const newOnes = []
  for (const d of ACH_DEFS) {
    if (!done.includes(d.id) && d.req(ctx)) { done.push(d.id); newOnes.push(d) }
  }
  if (newOnes.length) try { localStorage.setItem(K.ACHIEVEMENTS, JSON.stringify(done)) } catch (_) {}
  return newOnes
}

// ── Wallet ────────────────────────────────────────────────────────────────────
export function saveWallet(a) { try { localStorage.setItem(K.WALLET, JSON.stringify(a)) } catch (_) {} }
export function getWallet()   { return rawGet(K.WALLET, null) }

// ── Leaderboard ───────────────────────────────────────────────────────────────
export function updateBoard(name, score) {
  const board = rawGet(K.LEADERBOARD, [])
  const idx   = board.findIndex(e => e.name === name)
  if (idx >= 0) { if (score > board[idx].score) board[idx].score = score }
  else board.push({ name, score })
  board.sort((a, b) => b.score - a.score)
  const top10 = board.slice(0, 10)
  try { localStorage.setItem(K.LEADERBOARD, JSON.stringify(top10)) } catch (_) {}
  return top10
}

export function getBoard() { return rawGet(K.LEADERBOARD, []) }

// ── Telegram Cloud Storage sync ───────────────────────────────────────────────
export async function pushCloud(tgCloud) {
  if (!tgCloud) return
  const data = {
    best: getBest(), games: getGames(), coins: getCoins(),
    streak: getStreak(), board: getBoard(),
  }
  return new Promise(res => tgCloud.setItem('fup_v5', JSON.stringify(data), () => res(true)))
}

export async function pullCloud(tgCloud) {
  if (!tgCloud) return
  return new Promise(res => {
    tgCloud.getItem('fup_v5', async (err, raw) => {
      if (err || !raw) { res(null); return }
      try {
        const d = JSON.parse(raw)
        if ((d.best  || 0) > getBest())  await secureSet(K.BEST,  d.best)
        if ((d.games || 0) > getGames()) await secureSet(K.GAMES, d.games)
        if ((d.coins || 0) > getCoins()) await secureSet(K.COINS, d.coins)
        if ((d.streak|| 0) > getStreak())await secureSet(K.STREAK,d.streak)
        if (Array.isArray(d.board)) d.board.forEach(e => updateBoard(e.name, e.score))
        res(d)
      } catch (_) { res(null) }
    })
  })
}
