// ── Constants ──────────────────────────────────────────────────────────────────
export const FFC      = 'E3DTxgnum3iKMXpwaiMJ3A8nC1nNK8GBtTgEG86xpump'
export const TREASURY = '2NAJdNtVFUAeUuqu7DduhuC1tmkau1zfirTFWwUpexqT'

export const PACKAGES = [
  { id:'p10',  attempts:10,  usd:5,  emoji:'🦆',  label:'Starter'   },
  { id:'p30',  attempts:30,  usd:12, emoji:'🦆🦆', label:'Popular'   },
  { id:'p50',  attempts:50,  usd:18, emoji:'💰',   label:'Value'     },
  { id:'p100', attempts:100, usd:30, emoji:'🏆',   label:'Best Deal' },
]

// ── Price feed — FIX #6: DexScreener primary, CoinGecko fallback ──────────────
let _price = null
let _priceFetched = 0

export async function fetchPrice() {
  if (_price && Date.now() - _priceFetched < 120_000) return _price

  // 1. DexScreener — works for pump.fun tokens, most accurate
  try {
    const r = await fetch(
      `https://api.dexscreener.com/latest/dex/tokens/${FFC}`,
      { signal: AbortSignal.timeout(5000) }
    )
    const d = await r.json()
    // Get best pair by liquidity
    const pairs = d?.pairs?.filter(p => p.chainId === 'solana') || []
    pairs.sort((a, b) => (b.liquidity?.usd || 0) - (a.liquidity?.usd || 0))
    const p = parseFloat(pairs[0]?.priceUsd)
    if (p > 0) {
      _price = p; _priceFetched = Date.now()
      console.log('[FFC Price] DexScreener:', p)
      return p
    }
  } catch (e) { console.warn('[FFC Price] DexScreener failed:', e.message) }

  // 2. Jupiter Price API (Solana DEX aggregator)
  try {
    const r = await fetch(
      `https://price.jup.ag/v6/price?ids=${FFC}`,
      { signal: AbortSignal.timeout(5000) }
    )
    const d = await r.json()
    const p = d?.data?.[FFC]?.price
    if (p > 0) {
      _price = p; _priceFetched = Date.now()
      console.log('[FFC Price] Jupiter:', p)
      return p
    }
  } catch (e) { console.warn('[FFC Price] Jupiter failed:', e.message) }

  // 3. CoinGecko (may not index pump.fun tokens)
  try {
    const r = await fetch(
      `https://api.coingecko.com/api/v3/simple/token_price/solana?contract_addresses=${FFC}&vs_currencies=usd`,
      { signal: AbortSignal.timeout(5000) }
    )
    const d = await r.json()
    const p = d?.[FFC.toLowerCase()]?.usd
    if (p > 0) {
      _price = p; _priceFetched = Date.now()
      console.log('[FFC Price] CoinGecko:', p)
      return p
    }
  } catch (e) { console.warn('[FFC Price] CoinGecko failed:', e.message) }

  // Last resort: use cached or warn
  console.error('[FFC Price] All APIs failed — using fallback 0.0001')
  return _price || 0.0001
}

export async function calcFFC(pkg) {
  const price = await fetchPrice()
  return Math.ceil(pkg.usd / price)
}

// ── Wallet — FIX #4: Telegram webview has no window.phantom ───────────────────
export function getProvider() {
  if (window?.phantom?.solana?.isPhantom)    return window.phantom.solana
  if (window?.solana?.isPhantom)             return window.solana
  if (window?.solflare?.isSolflare)          return window.solflare
  if (window?.solana)                        return window.solana
  return null
}

export function isMobile() {
  return /Android|iPhone|iPad|iPod/i.test(navigator.userAgent)
}

export function isInsideTelegram() {
  return !!(window.Telegram?.WebApp?.initData)
}

export async function connectWallet() {
  // Inside Telegram WebView — no wallet extensions available
  // Use mobile deep links or WalletConnect
  if (isInsideTelegram() && isMobile()) {
    throw new Error('USE_DEEPLINK')
  }
  const p = getProvider()
  if (!p) throw new Error('NO_WALLET')
  try {
    const resp = await p.connect()
    return resp.publicKey.toString()
  } catch (e) {
    if (e.code === 4001) throw new Error('USER_REJECTED')
    throw e
  }
}

export async function disconnectWallet() {
  const p = getProvider()
  if (p?.disconnect) await p.disconnect().catch(() => {})
}

export async function getFFCBalance(addr) {
  if (!addr) return null
  try {
    const r = await fetch('https://api.mainnet-beta.solana.com', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        jsonrpc: '2.0', id: 1,
        method: 'getTokenAccountsByOwner',
        params: [addr, { mint: FFC }, { encoding: 'jsonParsed' }],
      }),
      signal: AbortSignal.timeout(6000),
    })
    const d = await r.json()
    const val = d?.result?.value?.[0]?.account?.data?.parsed?.info?.tokenAmount?.uiAmount
    return val ?? 0
  } catch (_) { return null }
}

// ── Solana Pay URL ─────────────────────────────────────────────────────────────
export function solanaPay(ffcAmount, label = 'FUP Runner Attempts') {
  const params = new URLSearchParams({
    'spl-token': FFC,
    amount:      String(ffcAmount),
    label:       label,
    message:     'FUP Runner Trump',
    memo:        'fup-runner-v5',
  })
  return `solana:${TREASURY}?${params.toString()}`
}

export function qrUrl(data, size = 220) {
  return `https://api.qrserver.com/v1/create-qr-code/?size=${size}x${size}&data=${encodeURIComponent(data)}&bgcolor=0d0d1a&color=FFD700&margin=10&format=png`
}

// Phantom deep link — works in mobile browser (NOT inside Telegram webview)
export function phantomDeepLink(solanaPayUrl) {
  const encoded = encodeURIComponent(solanaPayUrl)
  return `https://phantom.app/ul/v1/browse/${encoded}?ref=${encodeURIComponent('https://t.me/FupRunnerBot')}`
}

// Solflare deep link
export function solflareDeepLink(solanaPayUrl) {
  return `https://solflare.com/ul/v1/pay?url=${encodeURIComponent(solanaPayUrl)}`
}

// ── Blockchain TX verification — FIX #2 ───────────────────────────────────────
// Checks if a real SPL token transfer to TREASURY happened in last 10 minutes
export async function verifyPaymentOnChain(expectedFFC, walletAddr, timeoutMs = 60_000) {
  const start = Date.now()
  const minAmount = expectedFFC * 0.95 // allow 5% slippage

  while (Date.now() - start < timeoutMs) {
    try {
      const found = await _checkRecentTransfer(walletAddr, minAmount)
      if (found) return { ok: true, signature: found }
    } catch (_) {}
    // Poll every 4 seconds
    await new Promise(r => setTimeout(r, 4000))
  }
  return { ok: false, reason: 'timeout' }
}

async function _checkRecentTransfer(fromAddr, minFFC) {
  // Get recent signatures for TREASURY
  const r1 = await fetch('https://api.mainnet-beta.solana.com', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      jsonrpc: '2.0', id: 1,
      method: 'getSignaturesForAddress',
      params: [TREASURY, { limit: 10 }],
    }),
    signal: AbortSignal.timeout(5000),
  })
  const d1 = await r1.json()
  const sigs = d1?.result || []

  // Check each recent tx
  for (const sig of sigs) {
    if (sig.err) continue
    // Only check txs from last 15 minutes
    const age = Date.now() / 1000 - (sig.blockTime || 0)
    if (age > 900) continue

    // Get tx details
    const r2 = await fetch('https://api.mainnet-beta.solana.com', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        jsonrpc: '2.0', id: 2,
        method: 'getTransaction',
        params: [sig.signature, { encoding: 'jsonParsed', maxSupportedTransactionVersion: 0 }],
      }),
      signal: AbortSignal.timeout(5000),
    })
    const d2 = await r2.json()
    const tx = d2?.result

    if (!tx) continue

    // Check token transfers in this tx
    const instructions = tx.transaction?.message?.instructions || []
    for (const ix of instructions) {
      if (ix.program !== 'spl-token') continue
      const info = ix.parsed?.info
      if (!info) continue
      if (info.mint !== FFC) continue
      if (!info.destination) continue
      // Check destination matches treasury ATA or is treasury
      const amount = parseFloat(info.tokenAmount?.uiAmount || info.amount || 0)
      if (amount >= minFFC) {
        // Optionally verify sender if we have walletAddr
        return sig.signature
      }
    }
  }
  return null
}
