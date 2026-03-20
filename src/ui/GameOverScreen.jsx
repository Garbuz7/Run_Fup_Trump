import React, { useEffect, useRef, useState } from 'react'
const F = 'system-ui,-apple-system,sans-serif'

export default function GameOverScreen({
  score, best, isNew, attempts, newAch = [],
  btnColor = '#f5a623', webApp, refLink, botUsername, isHolder,
  onRestart, onBuyAttempts, onBoard, onAch, t,
}) {
  const scoreRef = useRef(null)
  const [copied, setCopied] = useState(false)  // FIX #3: copied notification

  // Animate score count-up
  useEffect(() => {
    let cur = 0
    const step = Math.max(1, Math.floor(score / 35))
    const iv = setInterval(() => {
      cur = Math.min(cur + step, score)
      if (scoreRef.current) scoreRef.current.textContent = cur.toLocaleString()
      if (cur >= score) clearInterval(iv)
    }, 28)
    return () => clearInterval(iv)
  }, [score])

  // Share score via Telegram
  const handleShare = () => {
    const link = refLink || `https://t.me/${botUsername}`
    const text = t('share_text', score, link)
    if (webApp?.openTelegramLink) {
      webApp.openTelegramLink(
        `https://t.me/share/url?url=${encodeURIComponent(link)}&text=${encodeURIComponent(
          `🦆 I scored ${score} FUP coins in FUP Runner Trump! Beat my record! 🇺🇸`
        )}`
      )
    } else {
      _copyToClipboard(text)
    }
  }

  // FIX #3: copy referral link with toast notification
  const handleCopyRef = async () => {
    if (!refLink) return
    const ok = await _copyToClipboard(refLink)
    if (ok) {
      setCopied(true)
      setTimeout(() => setCopied(false), 2500)
      // Also show Telegram popup if available
      webApp?.showPopup?.({
        title: '✅ Copied!',
        message: `Your referral link has been copied.\n\nShare it with friends — you both get +5 attempts when they join!\n\n${refLink}`,
        buttons: [{ type: 'ok' }],
      })
    }
  }

  return (
    <div style={{ position: 'fixed', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 50 }}>
      <div style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,10,0.85)', backdropFilter: 'blur(7px)' }} />

      <div style={{
        position: 'relative',
        background: 'linear-gradient(160deg,#0d0d22,#1c1c3c)',
        border: '1px solid rgba(255,215,0,0.22)',
        borderRadius: 24, padding: '22px 20px 18px',
        width: 'min(360px,92vw)',
        display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8,
        maxHeight: '92vh', overflowY: 'auto',
      }}>

        {/* Achievement flash */}
        {newAch.length > 0 && (
          <div style={{ background: 'rgba(255,215,0,0.12)', border: '1px solid rgba(255,215,0,0.25)', borderRadius: 10, padding: '7px 12px', color: '#FFD700', fontFamily: F, fontSize: 12, fontWeight: 700, textAlign: 'center', width: '100%' }}>
            🏅 {newAch.map(a => `${a.icon} ${a.label}`).join(' · ')}
          </div>
        )}

        {/* Holder badge */}
        {isHolder && (
          <div style={{ background: 'rgba(100,50,200,0.2)', border: '1px solid rgba(150,100,255,0.3)', borderRadius: 10, padding: '6px 12px', color: '#cc99ff', fontFamily: F, fontSize: 12, fontWeight: 700, width: '100%', textAlign: 'center' }}>
            💎 FFC Holder — free attempts active!
          </div>
        )}

        {/* Icon */}
        <div style={{ fontSize: isNew ? 60 : 56 }}>{isNew ? '🏆' : '🦆'}</div>

        {/* Title */}
        <h1 style={{ color: isNew ? '#FFD700' : '#ffffff', fontFamily: F, fontWeight: 900, fontSize: 30, letterSpacing: 2, margin: '2px 0 0', textShadow: isNew ? '0 0 30px rgba(255,215,0,0.4)' : 'none' }}>
          {isNew ? t('new_record') : t('game_over')}
        </h1>

        {/* Score box */}
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', background: 'rgba(255,215,0,0.07)', border: '1px solid rgba(255,215,0,0.15)', borderRadius: 16, padding: '10px 44px', margin: '2px 0' }}>
          <span style={{ color: '#777799', fontFamily: F, fontSize: 12 }}>{t('score')}</span>
          <span ref={scoreRef} style={{ color: '#FFD700', fontFamily: F, fontSize: 48, fontWeight: 900, lineHeight: 1.1 }}>0</span>
          <span style={{ color: '#777799', fontFamily: F, fontSize: 12 }}>{t('fup_coins')}</span>
        </div>

        {isNew && <div style={{ background: 'linear-gradient(90deg,#FFD700,#FFA500)', color: '#000', fontFamily: F, fontSize: 12, fontWeight: 800, padding: '3px 14px', borderRadius: 20 }}>{t('new_best')}</div>}

        <div style={{ display: 'flex', gap: 20 }}>
          <span style={{ color: '#888899', fontFamily: F, fontSize: 13 }}>{t('best')}: <b style={{ color: '#FFD700' }}>{best.toLocaleString()}</b></span>
          <span style={{ color: '#888899', fontFamily: F, fontSize: 13 }}>{t('attempts')}: <b style={{ color: attempts > 0 ? '#7fff7f' : '#ff6666' }}>{attempts}</b></span>
        </div>

        {/* Buttons */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8, width: '100%' }}>

          {attempts > 0
            ? <button onClick={onRestart} style={Sb.primary(btnColor)}>{t('play_again')}</button>
            : <>
                <button onClick={onBuyAttempts} style={Sb.primary(btnColor)}>{t('buy_att')}</button>
                <p style={{ color: '#555577', fontFamily: F, fontSize: 11, textAlign: 'center', margin: 0 }}>{t('reset_note')}</p>
              </>
          }

          <button onClick={handleShare} style={Sb.secondary('#2a6abf')}>{t('share')}</button>

          <div style={{ display: 'flex', gap: 8 }}>
            <button onClick={onBoard} style={Sb.icon}>🏆 {t('top')}</button>
            <button onClick={onAch}   style={Sb.icon}>🏅 {t('awards')}</button>
          </div>

          {/* FIX #3: referral copy with visual confirmation */}
          {refLink && (
            <button onClick={handleCopyRef} style={{ ...Sb.ref, background: copied ? 'rgba(100,255,100,0.12)' : 'rgba(255,215,0,0.08)', border: copied ? '1px solid rgba(100,255,100,0.3)' : '1px solid rgba(255,215,0,0.2)' }}>
              {copied
                ? '✅ Link Copied! Share with friends 🦆'
                : t('copy_ref')}
            </button>
          )}

          {/* Show referral link text so user can manually copy */}
          {refLink && (
            <div style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.07)', borderRadius: 10, padding: '8px 10px' }}>
              <p style={{ color: '#555577', fontFamily: F, fontSize: 10, margin: '0 0 3px' }}>Your referral link:</p>
              <p style={{ color: '#888899', fontFamily: F, fontSize: 11, margin: 0, wordBreak: 'break-all' }}>{refLink}</p>
            </div>
          )}

          <button onClick={() => alert('Ad not available yet!')} style={Sb.ghost}>{t('watch_ad')}</button>
        </div>
      </div>
    </div>
  )
}

// ── Clipboard helper ──────────────────────────────────────────────────────────
async function _copyToClipboard(text) {
  // Method 1: Clipboard API
  try {
    await navigator.clipboard.writeText(text)
    return true
  } catch (_) {}

  // Method 2: execCommand fallback (older mobile browsers)
  try {
    const el = document.createElement('textarea')
    el.value = text
    el.style.cssText = 'position:fixed;top:-9999px;left:-9999px'
    document.body.appendChild(el)
    el.focus()
    el.select()
    const ok = document.execCommand('copy')
    document.body.removeChild(el)
    return ok
  } catch (_) {}

  return false
}

// ── Styles ────────────────────────────────────────────────────────────────────
const Sb = {
  primary:  c => ({ width: '100%', background: c, color: '#fff', border: 'none', borderRadius: 16, padding: '14px', fontSize: 17, fontWeight: 800, fontFamily: F, cursor: 'pointer', WebkitTapHighlightColor: 'transparent' }),
  secondary:c => ({ width: '100%', background: 'transparent', border: `1.5px solid ${c}`, color: c, borderRadius: 14, padding: '11px', fontSize: 14, fontWeight: 700, fontFamily: F, cursor: 'pointer', WebkitTapHighlightColor: 'transparent' }),
  icon:     { flex: 1, background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.1)', color: '#aaa', borderRadius: 13, padding: '10px 6px', fontSize: 13, fontWeight: 600, fontFamily: F, cursor: 'pointer', WebkitTapHighlightColor: 'transparent' },
  ref:      { width: '100%', borderRadius: 13, padding: '10px', fontSize: 12, fontWeight: 700, fontFamily: F, cursor: 'pointer', WebkitTapHighlightColor: 'transparent', transition: 'all 0.2s', color: '#FFD700' },
  ghost:    { width: '100%', background: 'transparent', border: '1px solid rgba(255,255,255,0.07)', color: '#444466', borderRadius: 12, padding: '9px', fontSize: 12, fontFamily: F, cursor: 'pointer' },
}
