import React, { useEffect, useRef, useState, useCallback } from 'react'
import { createGame }       from './game/GameConfig.js'
import { useTranslation, setGlobalLang } from './i18n/useTranslation.js'
import {
  initStore, getAttempts, useAttempt, addAttempts,
  saveRun, getBest, claimDaily,
  updateBoard, pushCloud, pullCloud,
  applyReferral, refLink, recordRefSent,
  saveWallet, getWallet, isClockBad,
} from './store/gameStore.js'
import { initTimeGuard } from './store/timeGuard.js'
import { startDevTools }  from './store/antiCheat.js'
import { connectWallet, getFFCBalance } from './store/shopStore.js'
import { recordSession, recordWallet, isHolder } from './store/burnStore.js'
import GameOverScreen    from './ui/GameOverScreen.jsx'
import ShopModal         from './ui/ShopModal.jsx'
import LeaderboardModal  from './ui/LeaderboardModal.jsx'
import AchievementsModal from './ui/AchievementsModal.jsx'
import DailyBonusPopup   from './ui/DailyBonusPopup.jsx'
import LanguagePicker    from './ui/LanguagePicker.jsx'
import StatsModal        from './ui/StatsModal.jsx'

const F   = 'system-ui,-apple-system,sans-serif'
const BOT = 'FupRunnerBot'  // ← REPLACE with your real bot username (no @)

// ── Loading screen ─────────────────────────────────────────────────────────────
function Loading({ status }) {
  return (
    <div style={{ position:'fixed', inset:0, background:'#0d0d1a', display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', gap:16 }}>
      <div style={{ fontSize:64 }}>🦆</div>
      <div style={{ color:'#FFD700', fontFamily:F, fontSize:24, fontWeight:900 }}>FUP RUNNER</div>
      <div style={{ color:'#888899', fontFamily:F, fontSize:14 }}>{status}</div>
      <div style={{ width:160, height:4, background:'rgba(255,255,255,0.1)', borderRadius:2, overflow:'hidden' }}>
        <div style={{ height:'100%', background:'#FFD700', borderRadius:2, animation:'bar 1.4s ease-in-out infinite' }} />
      </div>
      <style>{`@keyframes bar{0%{width:0;margin-left:0}50%{width:80%;margin-left:10%}100%{width:0;margin-left:100%}}`}</style>
    </div>
  )
}

// ── Clock tamper warning ────────────────────────────────────────────────────────
function ClockWarn({ onDismiss, t }) {
  return (
    <div style={{ position:'fixed', inset:0, background:'rgba(0,0,0,0.92)', display:'flex', alignItems:'center', justifyContent:'center', zIndex:500, backdropFilter:'blur(8px)' }}>
      <div style={{ background:'linear-gradient(160deg,#1a0505,#2a0a0a)', border:'1px solid rgba(255,80,80,0.3)', borderRadius:22, padding:'28px 24px', width:'min(340px,92vw)', textAlign:'center', display:'flex', flexDirection:'column', gap:12, alignItems:'center' }}>
        <span style={{ fontSize:52 }}>⚠️</span>
        <h2 style={{ color:'#ff6666', fontFamily:F, fontSize:22, fontWeight:900, margin:0 }}>{t('clock_title')}</h2>
        <p style={{ color:'#cc8888', fontFamily:F, fontSize:14, margin:0, lineHeight:1.6, whiteSpace:'pre-line' }}>{t('clock_msg')}</p>
        <button onClick={onDismiss} style={{ background:'#cc3333', color:'#fff', border:'none', borderRadius:14, padding:'13px 32px', fontFamily:F, fontSize:16, fontWeight:800, cursor:'pointer', width:'100%' }}>{t('continue')}</button>
      </div>
    </div>
  )
}

// ── Side button ─────────────────────────────────────────────────────────────────
function Btn({ icon, emoji, label, color, onClick }) {
  // 3D glossy button matching the reference visual
  return (
    <button onClick={onClick} style={{
      width:62, height:62,
      background:`linear-gradient(145deg, ${color}ff, ${color}99)`,
      border:'none',
      borderRadius:16,
      display:'flex', flexDirection:'column',
      alignItems:'center', justifyContent:'center', gap:2,
      cursor:'pointer', WebkitTapHighlightColor:'transparent',
      boxShadow:`0 4px 0 0 ${color}55, 0 6px 12px rgba(0,0,0,0.35)`,
      position:'relative', overflow:'hidden',
      transition:'transform 0.08s, box-shadow 0.08s',
    }}
    onTouchStart={e=>{e.currentTarget.style.transform='translateY(2px)';e.currentTarget.style.boxShadow=`0 2px 0 0 ${color}55,0 3px 8px rgba(0,0,0,0.3)`}}
    onTouchEnd={e=>{e.currentTarget.style.transform='';e.currentTarget.style.boxShadow=`0 4px 0 0 ${color}55,0 6px 12px rgba(0,0,0,0.35)`}}
    >
      {/* Shine overlay */}
      <div style={{ position:'absolute', top:0, left:0, right:0, height:'50%', background:'rgba(255,255,255,0.22)', borderRadius:'16px 16px 40% 40%', pointerEvents:'none' }} />
      {icon
        ? <img src={`./assets/${icon}`} style={{ width:30, height:30, objectFit:'contain', position:'relative', zIndex:1 }} alt="" />
        : <span style={{ fontSize:22, lineHeight:1, position:'relative', zIndex:1 }}>{emoji}</span>
      }
      <span style={{ fontSize:10, color:'rgba(255,255,255,0.92)', fontWeight:700, fontFamily:'system-ui,sans-serif', lineHeight:1, position:'relative', zIndex:1, textShadow:'0 1px 2px rgba(0,0,0,0.5)' }}>{label}</span>
    </button>
  )
}

// ── App ──────────────────────────────────────────────────────────────────────────
export default function App() {
  const tgRef    = useRef(null)
  const cloudRef = useRef(null)
  const gameRef  = useRef(null)
  const canvasRef= useRef(null)

  const { t, lang, setLang, currentLang } = useTranslation()

  // Boot
  const [ready,      setReady]      = useState(false)
  const [status,     setStatus]     = useState('Initializing…')
  const [showTamper, setShowTamper] = useState(false)
  const [timeOk,     setTimeOk]     = useState(false)

  // Game
  const [score,    setScore]    = useState(0)
  const [over,     setOver]     = useState(false)
  const [isNew,    setIsNew]    = useState(false)
  const [newAch,   setNewAch]   = useState([])
  const [started,  setStarted]  = useState(false)
  const [best,     setBest]     = useState(0)
  const [attempts, setAttempts] = useState(0)

  // Rewards
  const [daily,    setDaily]    = useState(null)

  // Wallet
  const [wallet,   setWallet]   = useState(getWallet)
  const [balance,  setBalance]  = useState(null)
  const [holder,   setHolder]   = useState(false)

  // User
  const [userId,   setUserId]   = useState(null)
  const [userName, setUserName] = useState('Player')

  // Modals
  const [showShop,  setShowShop]  = useState(false)
  const [showBoard, setShowBoard] = useState(false)
  const [showAch,   setShowAch]   = useState(false)
  const [showLang,  setShowLang]  = useState(false)
  const [showStats, setShowStats] = useState(false)

  // ── Boot sequence ──────────────────────────────────────────────────────────
  useEffect(() => {
    async function boot() {
      // 1. Telegram
      setStatus('Connecting to Telegram…')
      const tg = window.Telegram?.WebApp
      if (tg) {
        tgRef.current    = tg
        cloudRef.current = tg.CloudStorage || null
        tg.ready(); tg.expand()
        tg.disableVerticalSwipes?.()
        tg.setHeaderColor?.('#0d0d1a')
        tg.setBackgroundColor?.('#0d0d1a')
        const user = tg.initDataUnsafe?.user
        if (user) { setUserId(user.id); setUserName(user.first_name || 'Player') }
      }

      // 2. Server time (most critical)
      setStatus('Syncing server time…')
      const ok = await initTimeGuard()
      setTimeOk(ok)
      setStatus(ok ? '✅ Time verified' : '⚠️ Offline mode')

      // 3. Init store + integrity audit
      setStatus('Verifying game data…')
      const uid = tgRef.current?.initDataUnsafe?.user?.id
      await initStore(uid)

      // 4. Check clock tamper
      if (isClockBad()) setShowTamper(true)

      // 5. Cloud pull
      if (cloudRef.current) {
        setStatus('Loading cloud save…')
        await pullCloud(cloudRef.current)
      }

      // 6. State
      const att = await getAttempts()
      setAttempts(att)
      setBest(getBest())

      // 7. Daily reward
      const reward = await claimDaily()
      if (reward) { setDaily(reward); setAttempts(await getAttempts()) }

      // 8. Referral
      const sp  = tgRef.current?.initDataUnsafe?.start_param || ''
      const myId = tgRef.current?.initDataUnsafe?.user?.id
      if (sp.startsWith('r')) {
        const applied = await applyReferral(sp.slice(1), myId ? String(myId) : null)
        if (applied) {
          setAttempts(await getAttempts())
          tgRef.current?.showPopup?.({ message: '🎁 +5 attempts added!' })
          recordRefSent()
        }
      }

      // 9. DevTools monitor
      startDevTools()
      recordSession()

      // 10. Restore wallet
      const saved = getWallet()
      if (saved) { setWallet(saved); loadBalance(saved) }

      setStatus('Ready!')
      setReady(true)
    }
    boot()
  }, [])

  // Keep Phaser scenes in sync with selected language
  useEffect(() => { setGlobalLang(lang) }, [lang])

  async function loadBalance(addr) {
    const bal = await getFFCBalance(addr)
    setBalance(bal)
    setHolder(isHolder(bal))
  }

  // ── Haptics ───────────────────────────────────────────────────────────────
  const haptic = useCallback((type, style) => {
    const hf = tgRef.current?.HapticFeedback
    if (!hf) return
    type === 'impact' ? hf.impactOccurred(style || 'light') : hf.notificationOccurred(style || 'success')
  }, [])

  // ── Launch Phaser ─────────────────────────────────────────────────────────
  useEffect(() => {
    if (!ready || !canvasRef.current) return
    const game = createGame(canvasRef.current, {
      onScore:       (s) => setScore(s),
      onJump:        ()  => haptic('impact', 'light'),
      onCoinCollect: ()  => haptic('impact', 'rigid'),
      onGameOver:    async (s) => {
        // All gameStore calls are async — await them properly
        const { isNew: newRecord, newAch: ach } = await saveRun(s)
        setBest(getBest())
        setIsNew(newRecord)
        setNewAch(ach || [])
        setOver(true)
        setAttempts(await getAttempts())
        haptic('notify', newRecord ? 'success' : 'error')
        updateBoard(userName, s)
        if (cloudRef.current) pushCloud(cloudRef.current)
      },
    })
    gameRef.current = game
    setStarted(true)
    return () => game.destroy(true)
  }, [ready, haptic, userName])

  // ── Restart ───────────────────────────────────────────────────────────────
  const handleRestart = useCallback(async () => {
    const ok = await useAttempt()
    if (!ok) { setShowShop(true); return }
    setAttempts(await getAttempts())
    setOver(false); setScore(0); setIsNew(false); setNewAch([])
    gameRef.current?.scene.getScene('GameScene')?.restartGame()
  }, [])

  // ── Wallet connect ────────────────────────────────────────────────────────
  const handleWallet = async () => {
    try {
      const addr = await connectWallet()
      setWallet(addr); saveWallet(addr); recordWallet(addr); loadBalance(addr)
    } catch (_) {}
  }

  // ── Purchase callback (passed to ShopModal) ───────────────────────────────
  const handlePurchased = async (n) => {
    await addAttempts(n)                  // ← async, awaited properly
    setAttempts(await getAttempts())
    setShowShop(false)
  }

  // ── Theme ─────────────────────────────────────────────────────────────────
  const tp2 = tgRef.current?.themeParams || {}
  const btn  = tp2.button_color || '#f5a623'
  const txt  = tp2.text_color   || '#ffffff'

  const ducks = Math.min(attempts, 5)
  const extra = attempts > 5 ? attempts - 5 : 0

  const myRefLink = userId ? refLink(userId, BOT) : null

  if (!ready) return <Loading status={status} />

  return (
    <div style={{ width:'100vw', height:'100vh', position:'relative', overflow:'hidden', background:'#0d0d1a' }}>

      {showTamper && <ClockWarn onDismiss={() => setShowTamper(false)} t={t} />}

      {/* Phaser canvas */}
      <div ref={canvasRef} style={{ position:'absolute', inset:0 }} />

      {/* Time indicator */}
      {started && !over && (
        <div style={{ position:'absolute', bottom:6, left:8, zIndex:5, pointerEvents:'none' }}>
          <span style={{ fontSize:9, color: timeOk?'rgba(100,200,100,0.55)':'rgba(200,100,100,0.55)', fontFamily:F }}>
            {t(timeOk ? 'time_ok' : 'time_off')}
          </span>
        </div>
      )}

      {/* Daily bonus */}
      {daily && <DailyBonusPopup reward={daily.attempts} streak={daily.streak} onClose={() => setDaily(null)} t={t} />}

      {/* HUD — 3D glossy pills */}
      {started && !over && (
        <div style={{ position:'absolute', top:0, left:0, right:0, display:'flex', justifyContent:'space-between', alignItems:'center', padding:'10px 10px', zIndex:10, pointerEvents:'none', gap:6 }}>
          {/* Coin counter */}
          <div style={hudPill('#1a6aff')}>
            <img src="./assets/coin_glow.png" style={{width:22,height:22,objectFit:'contain'}} alt="" />
            <span style={{ color:'#fff', fontWeight:900, fontSize:18, fontFamily:'system-ui,sans-serif', textShadow:'0 1px 3px rgba(0,0,0,0.5)' }}>{score}</span>
          </div>
          {/* Attempts (duck icons) */}
          <div style={hudPill('#2a2a60')}>
            {Array.from({length:ducks}).map((_,i)=><span key={i} style={{fontSize:14}}>🦆</span>)}
            {extra>0 && <span style={{color:'#FFD700',fontSize:11,fontWeight:700,marginLeft:2}}>+{extra}</span>}
            {attempts===0 && <span style={{color:'#ff8888',fontSize:12}}>0</span>}
          </div>
          {/* Best score */}
          <div style={hudPill('#a06000')}>
            <span style={{fontSize:16}}>🏆</span>
            <span style={{ color:'#FFE066', fontWeight:800, fontSize:16, fontFamily:'system-ui,sans-serif' }}>{best}</span>
          </div>
        </div>
      )}

      {/* Side buttons — 3D glossy icons */}
      {started && !over && (
        <div style={{ position:'absolute', right:6, top:72, display:'flex', flexDirection:'column', gap:8, zIndex:10 }}>
          <Btn icon="icon_shop.png"   label={t('shop')}           color="#1a6aff" onClick={() => setShowShop(true)} />
          <Btn icon="icon_top.png"    label={t('top')}            color="#e07800" onClick={() => setShowBoard(true)} />
          <Btn icon="icon_awards.png" label={t('awards')}         color="#8830cc" onClick={() => setShowAch(true)} />
          <Btn icon="icon_stats.png"  label="Stats"               color="#1a8a30" onClick={() => setShowStats(true)} />
          <Btn icon="icon_lang.png"   label={currentLang.flag}    color="#1a4a99" onClick={() => setShowLang(true)} />
          {!wallet
            ? <Btn icon="icon_wallet.png" label={t('wallet')} color="#6622aa" onClick={handleWallet} />
            : <div style={{ width:62, background:'linear-gradient(145deg,#1a6a30,#0f4a20)', border:'none', borderRadius:16, padding:'6px 4px', display:'flex', flexDirection:'column', alignItems:'center', gap:2, boxShadow:'0 4px 0 #0a3015,0 6px 12px rgba(0,0,0,0.35)' }}>
                <span style={{fontSize:16}}>✅</span>
                <span style={{color:'#7fff7f',fontSize:9,fontWeight:700}}>{wallet.slice(0,4)}…</span>
                {holder && <span style={{fontSize:12}}>💎</span>}
              </div>
          }
        </div>
      )}

      {/* Game Over */}
      {over && (
        <GameOverScreen
          score={score} best={best} isNew={isNew}
          attempts={attempts} newAch={newAch}
          btnColor={btn} webApp={tgRef.current}
          refLink={myRefLink} botUsername={BOT} isHolder={holder}
          onRestart={handleRestart}
          onBuyAttempts={() => setShowShop(true)}
          onBoard={() => setShowBoard(true)}
          onAch={() => setShowAch(true)}
          t={t}
        />
      )}

      {/* Modals */}
      {showShop  && <ShopModal btnColor={btn} t={t} onClose={() => setShowShop(false)} onPurchased={handlePurchased} />}
      {showBoard && <LeaderboardModal t={t} onClose={() => setShowBoard(false)} tgCloud={cloudRef.current} />}
      {showAch   && <AchievementsModal t={t} onClose={() => setShowAch(false)} />}
      {showStats && <StatsModal t={t} onClose={() => setShowStats(false)} />}
      {showLang  && <LanguagePicker lang={lang} t={t} onSelect={code => { setLang(code); setGlobalLang(code) }} onClose={() => setShowLang(false)} />}
    </div>
  )
}

const hudPill = (color) => ({
  background: `linear-gradient(145deg, ${color}ee, ${color}99)`,
  borderRadius: 22,
  padding: '5px 12px',
  display: 'flex', alignItems: 'center', gap: 5,
  boxShadow: `0 3px 0 ${color}44, 0 5px 10px rgba(0,0,0,0.3)`,
  border: '1.5px solid rgba(255,255,255,0.25)',
  position: 'relative', overflow: 'hidden',
})
