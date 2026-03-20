// BurnStore — FFC burn tracking, DAU, holder perks
const K = { BURNED:'fup_burned', TXS:'fup_txs', DAY:'fup_dau_day', DAU:'fup_dau', WALLETS:'fup_wallets' }
const BURN_PCT = 0.08

function ls(k, fb=null){ try{ const v=localStorage.getItem(k); return v!==null?JSON.parse(v):fb }catch{return fb}}
function lsSet(k,v){ try{localStorage.setItem(k,JSON.stringify(v))}catch{}}
function today(){ return new Date().toISOString().slice(0,10) }

export const BURN_DISPLAY = Math.round(BURN_PCT * 100)
export const HOLDER_MIN   = 10_000

export function getBurnAmt(ffc) { return Math.floor(ffc * BURN_PCT) }
export function recordBurn(ffc) {
  lsSet(K.BURNED, getTotalBurned() + getBurnAmt(ffc))
  lsSet(K.TXS,    getTotalTxs()   + 1)
}
export function getTotalBurned() { return ls(K.BURNED, 0) }
export function getTotalTxs()    { return ls(K.TXS,    0) }

export function recordSession() {
  const t = today()
  if (ls(K.DAY, null) !== t) { lsSet(K.DAY, t); lsSet(K.DAU, 1) }
  else lsSet(K.DAU, ls(K.DAU, 0) + 1)
}
export function getDau() { return ls(K.DAU, 1) }

export function recordWallet(addr) {
  if (!addr) return
  const set = new Set(ls(K.WALLETS, []))
  set.add(addr.slice(0, 16))
  lsSet(K.WALLETS, [...set])
}
export function getWalletCount() { return (ls(K.WALLETS, [])).length }

export function isHolder(bal) { return typeof bal === 'number' && bal >= HOLDER_MIN }
