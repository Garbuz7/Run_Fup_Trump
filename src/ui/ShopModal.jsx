import React, { useState, useEffect, useRef } from 'react'
import {
  PACKAGES, fetchPrice, calcFFC,
  connectWallet, disconnectWallet, getFFCBalance,
  solanaPay, qrUrl, phantomDeepLink, solflareDeepLink,
  verifyPaymentOnChain, getProvider, isInsideTelegram, isMobile,
} from '../store/shopStore.js'
import { BURN_DISPLAY, recordBurn, recordWallet } from '../store/burnStore.js'

const F = 'system-ui,-apple-system,sans-serif'

// Verification states
const ST = { LIST:'list', QR:'qr', WAITING:'waiting', OK:'ok', ERR:'err', DEEPLINK:'deeplink' }

export default function ShopModal({ onClose, onPurchased, btnColor = '#f5a623', t }) {
  const [prices,  setPrices]  = useState({})   // { pkgId: {ffc, usd, price} }
  const [loading, setLoading] = useState(true)
  const [priceErr,setPriceErr]= useState(false)
  const [wallet,  setWallet]  = useState(null)
  const [balance, setBalance] = useState(null)
  const [step,    setStep]    = useState(ST.LIST)
  const [pkg,     setPkg]     = useState(null)
  const [qr,      setQr]      = useState('')
  const [payUrl,  setPayUrl]  = useState('')
  const [err,     setErr]     = useState('')
  const [elapsed, setElapsed] = useState(0)   // seconds waiting for payment
  const timerRef  = useRef(null)
  const verifyRef = useRef(null)

  // ── Load prices on mount ──────────────────────────────────────────────────
  useEffect(() => {
    loadPrices()
    const saved = localStorage.getItem('fup_wallet')
    if (saved) { setWallet(saved); loadBal(saved) }
    return () => { stopTimer(); verifyRef.current?.abort?.() }
  }, [])

  async function loadPrices() {
    setLoading(true); setPriceErr(false)
    try {
      const price = await fetchPrice()
      const p = {}
      for (const pk of PACKAGES) {
        const ffc = Math.ceil(pk.usd / price)
        p[pk.id] = { ffc, usd: `$${pk.usd}`, price }
      }
      setPrices(p)
    } catch (_) { setPriceErr(true) }
    setLoading(false)
  }

  async function loadBal(addr) {
    const b = await getFFCBalance(addr)
    setBalance(b)
  }

  // ── Wallet connect — FIX #4 ───────────────────────────────────────────────
  async function handleConnect() {
    // Inside Telegram — wallet extensions don't work
    if (isInsideTelegram()) {
      setStep(ST.DEEPLINK)
      return
    }
    try {
      const addr = await connectWallet()
      setWallet(addr)
      localStorage.setItem('fup_wallet', addr)
      recordWallet(addr)
      loadBal(addr)
    } catch (e) {
      if (e.message === 'NO_WALLET') {
        setStep(ST.DEEPLINK)
      } else if (e.message === 'USER_REJECTED') {
        // User cancelled — do nothing
      } else {
        setErr(e.message || 'Connection failed')
        setStep(ST.ERR)
      }
    }
  }

  // ── Select package ────────────────────────────────────────────────────────
  function handleSelect(p) {
    if (!prices[p.id]) return
    const ffc = prices[p.id].ffc
    const sp  = solanaPay(ffc, `${p.attempts} FUP Attempts`)
    setPkg(p)
    setPayUrl(sp)
    setQr(qrUrl(sp, 220))
    setStep(ST.QR)
  }

  // ── Start blockchain verification — FIX #2 ────────────────────────────────
  async function handleConfirm() {
    if (!pkg || !prices[pkg.id]) return
    const ffc     = prices[pkg.id].ffc
    const walAddr = wallet

    setStep(ST.WAITING)
    setElapsed(0)

    // Countdown timer (UI only)
    timerRef.current = setInterval(() => setElapsed(e => e + 1), 1000)

    // Real on-chain verification — polls Solana RPC for actual transfer
    const controller = new AbortController()
    verifyRef.current = controller

    try {
      const result = await verifyPaymentOnChain(ffc, walAddr, 120_000) // 2 min timeout

      stopTimer()

      if (result.ok) {
        recordBurn(ffc)
        await onPurchased(pkg.attempts)
        setStep(ST.OK)
      } else {
        setErr(`Payment not detected on blockchain.\n\nMake sure you sent exactly ${ffc.toLocaleString()} FFC to the treasury address.\n\nIf you already paid, contact support with your tx hash.`)
        setStep(ST.ERR)
      }
    } catch (e) {
      stopTimer()
      if (!controller.signal.aborted) {
        setErr('Network error verifying payment. Try again.')
        setStep(ST.ERR)
      }
    }
  }

  function handleCancelWait() {
    stopTimer()
    verifyRef.current?.abort?.()
    setStep(ST.QR)
  }

  function stopTimer() {
    if (timerRef.current) { clearInterval(timerRef.current); timerRef.current = null }
  }

  const hasWallet = !!wallet

  // ─────────────────────────────────────────────────────────────────────────
  return (
    <div style={S.ov} onClick={onClose}>
      <div style={S.modal} onClick={e => e.stopPropagation()}>

        {/* Header */}
        <div style={{ textAlign: 'center' }}>
          <div style={{ fontSize: 36 }}>🪙</div>
          <h2 style={S.title}>{t('shop_title')}</h2>
          <p style={S.sub}>{t('shop_sub')}</p>
          <p style={{ color: '#ff9966', fontFamily: F, fontSize: 11, margin: '4px 0 0' }}>
            🔥 {BURN_DISPLAY}% of every purchase is burned on-chain
          </p>
        </div>

        {/* Wallet bar */}
        <div style={S.walletBar}>
          {hasWallet ? (
            <>
              <div>
                <span style={{ color: '#7fff7f', fontSize: 13, fontFamily: F }}>✅ {wallet.slice(0, 6)}…{wallet.slice(-4)}</span>
                {balance !== null && (
                  <span style={{ color: '#FFD700', fontSize: 12, fontFamily: F, marginLeft: 8 }}>
                    {typeof balance === 'number' ? balance.toLocaleString() + ' FFC' : '—'}
                  </span>
                )}
              </div>
              <button onClick={() => { disconnectWallet(); setWallet(null); setBalance(null); localStorage.removeItem('fup_wallet') }} style={S.disBtn}>
                {t('disconnect')}
              </button>
            </>
          ) : (
            <button onClick={handleConnect} style={{ ...S.conBtn, borderColor: btnColor, color: btnColor }}>
              {isInsideTelegram() ? '📱 Open Phantom / Solflare' : (getProvider() ? t('connect') : t('install'))}
            </button>
          )}
        </div>

        {/* ── LIST ── */}
        {step === ST.LIST && (
          <>
            {priceErr && (
              <div style={{ background: 'rgba(255,100,50,0.15)', borderRadius: 10, padding: '8px 12px', textAlign: 'center' }}>
                <span style={{ color: '#ff8866', fontFamily: F, fontSize: 12 }}>⚠️ Could not fetch live price. </span>
                <button onClick={loadPrices} style={{ color: '#FFD700', background: 'none', border: 'none', fontFamily: F, fontSize: 12, cursor: 'pointer', textDecoration: 'underline' }}>Retry</button>
              </div>
            )}
            {loading ? (
              <div style={{ color: '#666688', fontFamily: F, textAlign: 'center', padding: 20 }}>
                ⏳ {t('fetching')}
              </div>
            ) : (
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                {PACKAGES.map(p => (
                  <button key={p.id} onClick={() => handleSelect(p)} style={S.pkgCard(p.id)}>
                    <span style={{ fontSize: 26 }}>{p.emoji}</span>
                    <span style={{ color: '#eee', fontFamily: F, fontSize: 13, fontWeight: 800 }}>{t('att_label', p.attempts)}</span>
                    {(p.id === 'p100' || p.id === 'p50') && (
                      <span style={{ background: p.id === 'p100' ? '#ff6633' : '#2a8a3a', color: '#fff', fontFamily: F, fontSize: 9, fontWeight: 800, padding: '2px 6px', borderRadius: 6 }}>
                        {p.id === 'p100' ? t('best_val') : t('hot')}
                      </span>
                    )}
                    <span style={{ color: '#FFD700', fontFamily: F, fontSize: 13, fontWeight: 700 }}>
                      {prices[p.id]?.ffc?.toLocaleString() ?? '…'} FFC
                    </span>
                    <span style={{ color: '#555577', fontFamily: F, fontSize: 11 }}>{prices[p.id]?.usd}</span>
                  </button>
                ))}
              </div>
            )}
            <div style={{ color: '#444466', fontFamily: F, fontSize: 10, textAlign: 'center' }}>
              Live price from DexScreener · Verified on Solana blockchain
            </div>
          </>
        )}

        {/* ── QR / PAY ── */}
        {step === ST.QR && pkg && (
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 10 }}>
            <p style={{ color: '#FFD700', fontFamily: F, fontSize: 14, fontWeight: 800, textAlign: 'center', margin: 0 }}>
              {pkg.emoji} {t('att_label', pkg.attempts)} — {prices[pkg.id]?.ffc?.toLocaleString()} FFC
            </p>

            {/* Treasury address */}
            <div style={{ background: 'rgba(255,215,0,0.07)', border: '1px solid rgba(255,215,0,0.2)', borderRadius: 10, padding: '8px 12px', width: '100%' }}>
              <p style={{ color: '#888899', fontFamily: F, fontSize: 10, margin: '0 0 4px' }}>Send to treasury:</p>
              <p style={{ color: '#FFD700', fontFamily: F, fontSize: 11, margin: 0, wordBreak: 'break-all', fontFamily: 'monospace' }}>{`2NAJdNt...xpUT`}</p>
              <p style={{ color: '#888899', fontFamily: F, fontSize: 10, margin: '4px 0 0' }}>Token: FFC · SPL Token on Solana</p>
            </div>

            {/* QR code */}
            <div style={{ background: '#0d0d20', border: '2px solid rgba(255,215,0,0.3)', borderRadius: 16, padding: 10 }}>
              <img src={qr} width={200} height={200} style={{ borderRadius: 12, display: 'block' }} alt="Solana Pay QR" />
            </div>
            <p style={{ color: '#666688', fontFamily: F, fontSize: 11, textAlign: 'center', margin: 0 }}>
              {t('scan_hint')}
            </p>

            {/* Open in wallet buttons */}
            <div style={{ display: 'flex', gap: 8, width: '100%' }}>
              <a href={phantomDeepLink(payUrl)} target="_blank" rel="noreferrer" style={S.openBtn('#7c3ae8')}>
                👻 Phantom
              </a>
              <a href={solflareDeepLink(payUrl)} target="_blank" rel="noreferrer" style={S.openBtn('#fa8c16')}>
                ☀️ Solflare
              </a>
            </div>

            {/* Confirm — triggers real blockchain check */}
            <button onClick={handleConfirm} style={S.cfmBtn(btnColor)}>
              ✅ I've Sent the Payment
            </button>
            <p style={{ color: '#666688', fontFamily: F, fontSize: 11, textAlign: 'center', margin: 0 }}>
              After clicking, we verify your transaction on Solana blockchain (up to 2 min)
            </p>
            <button onClick={() => setStep(ST.LIST)} style={S.backBtn}>{t('back')}</button>
          </div>
        )}

        {/* ── WAITING FOR BLOCKCHAIN ── */}
        {step === ST.WAITING && (
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 14, padding: '10px 0' }}>
            <div style={{ fontSize: 48 }}>⛓️</div>
            <p style={{ color: '#FFD700', fontFamily: F, fontSize: 18, fontWeight: 800, margin: 0, textAlign: 'center' }}>
              Verifying on Solana…
            </p>
            {/* Animated bar */}
            <div style={{ width: '100%', height: 6, background: 'rgba(255,255,255,0.1)', borderRadius: 3, overflow: 'hidden' }}>
              <div style={{ height: '100%', background: '#FFD700', borderRadius: 3, animation: 'pulse 1.4s ease-in-out infinite', width: '60%' }} />
            </div>
            <style>{`@keyframes pulse{0%{margin-left:-60%}100%{margin-left:100%}}`}</style>
            <p style={{ color: '#888899', fontFamily: F, fontSize: 13, textAlign: 'center', margin: 0 }}>
              Scanning Solana blockchain for your transaction…<br />
              <span style={{ color: '#FFD700' }}>{elapsed}s</span> / 120s
            </p>
            <p style={{ color: '#666688', fontFamily: F, fontSize: 11, textAlign: 'center', margin: 0 }}>
              Make sure you sent <b style={{ color: '#FFD700' }}>{prices[pkg?.id]?.ffc?.toLocaleString()} FFC</b> to the treasury address
            </p>
            <button onClick={handleCancelWait} style={S.backBtn}>
              ← Cancel
            </button>
          </div>
        )}

        {/* ── DEEPLINK (inside Telegram) ── */}
        {step === ST.DEEPLINK && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            <p style={{ color: '#FFD700', fontFamily: F, fontSize: 16, fontWeight: 800, textAlign: 'center', margin: 0 }}>
              Open your Solana wallet
            </p>
            <p style={{ color: '#888899', fontFamily: F, fontSize: 13, textAlign: 'center' }}>
              Wallet extensions don't work inside Telegram. Open Phantom or Solflare app directly:
            </p>
            <a href="https://phantom.app" target="_blank" rel="noreferrer" style={{ ...S.cfmBtn('#7c3ae8'), textDecoration: 'none', textAlign: 'center', display: 'block' }}>
              👻 Download Phantom
            </a>
            <a href="https://solflare.com" target="_blank" rel="noreferrer" style={{ ...S.cfmBtn('#fa8c16'), textDecoration: 'none', textAlign: 'center', display: 'block' }}>
              ☀️ Download Solflare
            </a>
            <p style={{ color: '#666688', fontFamily: F, fontSize: 11, textAlign: 'center' }}>
              Then open FUP Runner in your wallet's built-in browser, or copy the treasury address and send FFC manually.
            </p>
            <div style={{ background: 'rgba(255,215,0,0.08)', border: '1px solid rgba(255,215,0,0.2)', borderRadius: 10, padding: '10px 12px' }}>
              <p style={{ color: '#888899', fontFamily: F, fontSize: 10, margin: '0 0 4px' }}>Treasury wallet:</p>
              <p style={{ color: '#FFD700', fontFamily: F, fontSize: 10, margin: 0, wordBreak: 'break-all', fontFamily: 'monospace' }}>
                2NAJdNtVFUAeUuqu7DduhuC1tmkau1zfirTFWwUpexqT
              </p>
            </div>
            <button onClick={() => setStep(ST.LIST)} style={S.backBtn}>{t('back')}</button>
          </div>
        )}

        {/* ── OK ── */}
        {step === ST.OK && (
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 12, padding: '10px 0' }}>
            <span style={{ fontSize: 56 }}>🎉</span>
            <p style={{ color: '#7fff7f', fontFamily: F, fontSize: 20, fontWeight: 800, margin: 0 }}>
              Payment Verified!
            </p>
            <p style={{ color: '#FFD700', fontFamily: F, fontSize: 16, fontWeight: 700, margin: 0 }}>
              {t('success', pkg?.attempts)}
            </p>
            <p style={{ color: '#666688', fontFamily: F, fontSize: 12, textAlign: 'center', margin: 0 }}>
              Transaction confirmed on Solana blockchain ✅
            </p>
            <button onClick={onClose} style={S.cfmBtn(btnColor)}>{t('go')}</button>
          </div>
        )}

        {/* ── ERR ── */}
        {step === ST.ERR && (
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 10, padding: '8px 0' }}>
            <span style={{ fontSize: 44 }}>😕</span>
            <p style={{ color: '#ff8888', fontFamily: F, fontSize: 13, textAlign: 'center', margin: 0, whiteSpace: 'pre-line' }}>
              {err}
            </p>
            <button onClick={() => setStep(ST.QR)} style={S.cfmBtn(btnColor)}>Try Again</button>
            <button onClick={() => setStep(ST.LIST)} style={S.backBtn}>{t('back')}</button>
          </div>
        )}

        <button onClick={onClose} style={S.closeBtn}>{t('close')}</button>
      </div>
    </div>
  )
}

// ── Styles ────────────────────────────────────────────────────────────────────
const S = {
  ov:       { position: 'fixed', inset: 0, zIndex: 200, background: 'rgba(0,0,0,0.9)', display: 'flex', alignItems: 'center', justifyContent: 'center', backdropFilter: 'blur(8px)' },
  modal:    { background: 'linear-gradient(160deg,#0d0d20,#1a1a35)', border: '1px solid rgba(255,215,0,0.2)', borderRadius: 22, padding: '20px 18px 16px', width: 'min(370px,94vw)', maxHeight: '90vh', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 12 },
  title:    { color: '#FFD700', fontFamily: F, fontSize: 20, fontWeight: 900, margin: '4px 0 0' },
  sub:      { color: '#666688', fontFamily: F, fontSize: 12, margin: 0 },
  walletBar:{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: 'rgba(255,255,255,0.04)', borderRadius: 12, padding: '8px 12px', border: '1px solid rgba(255,255,255,0.08)' },
  disBtn:   { background: 'transparent', border: '1px solid rgba(255,100,100,0.3)', borderRadius: 8, padding: '4px 10px', color: '#ff8888', fontFamily: F, fontSize: 12, cursor: 'pointer' },
  conBtn:   { width: '100%', background: 'transparent', border: '1.5px solid', borderRadius: 10, padding: '10px', fontFamily: F, fontSize: 14, fontWeight: 700, cursor: 'pointer' },
  pkgCard:  id => ({ background: 'rgba(255,255,255,0.04)', border: id === 'p100' ? '1.5px solid rgba(255,102,51,0.4)' : '1px solid rgba(255,255,255,0.09)', borderRadius: 14, padding: '13px 10px', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4, cursor: 'pointer', WebkitTapHighlightColor: 'transparent' }),
  openBtn:  c => ({ flex: 1, background: c, color: '#fff', borderRadius: 12, padding: '11px 6px', fontFamily: F, fontSize: 13, fontWeight: 700, textDecoration: 'none', textAlign: 'center', display: 'block' }),
  cfmBtn:   c => ({ width: '100%', background: c, color: '#fff', border: 'none', borderRadius: 14, padding: '13px', fontFamily: F, fontSize: 15, fontWeight: 800, cursor: 'pointer', WebkitTapHighlightColor: 'transparent' }),
  backBtn:  { width: '100%', background: 'transparent', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 12, padding: '9px', color: '#666688', fontFamily: F, fontSize: 13, cursor: 'pointer' },
  closeBtn: { width: '100%', marginTop: 4, background: 'transparent', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 12, padding: '9px', color: '#444466', fontFamily: F, fontSize: 13, cursor: 'pointer' },
}
