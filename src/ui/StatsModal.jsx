import React, { useState, useEffect } from 'react'
import { getTotalBurned, getTotalTxs, getDau, getWalletCount, BURN_DISPLAY } from '../store/burnStore.js'
import { getBest, getGames, getCoins } from '../store/gameStore.js'
const F = 'system-ui,-apple-system,sans-serif'

function Num({ n }) {
  const [v, setV] = useState(0)
  useEffect(() => { let c=0; const s=Math.max(1,Math.floor(n/40)); const iv=setInterval(()=>{ c=Math.min(c+s,n); setV(c); if(c>=n)clearInterval(iv) },25); return()=>clearInterval(iv) }, [n])
  return <span>{v.toLocaleString()}</span>
}

export default function StatsModal({ onClose, t }) {
  const stats = [
    { label:t('stat_players'), n:getDau(),          icon:'🎮', color:'#3a9a5a' },
    { label:t('stat_burned'),  n:getTotalBurned(),   icon:'🔥', color:'#cc4422', suffix:' FFC' },
    { label:t('stat_txs'),     n:getTotalTxs(),      icon:'⛓️', color:'#4477cc' },
    { label:t('stat_wallets'), n:getWalletCount(),   icon:'👛', color:'#8844cc' },
    { label:t('best'),         n:getBest(),          icon:'🏆', color:'#cc9900', suffix:' 🪙' },
    { label:'Total games',     n:getGames(),         icon:'🕹️', color:'#448888' },
    { label:'Total coins',     n:getCoins(),         icon:'💰', color:'#aaaa22', suffix:' 🪙' },
    { label:'Burn rate',       n:BURN_DISPLAY,       icon:'📊', color:'#cc5533', suffix:'%' },
  ]
  return (
    <div style={S.ov} onClick={onClose}>
      <div style={S.modal} onClick={e=>e.stopPropagation()}>
        <div style={{ display:'flex', alignItems:'center', gap:12 }}>
          <span style={{ fontSize:32 }}>📊</span>
          <div>
            <h2 style={S.title}>{t('stats_title')}</h2>
            <p style={{ color:'#666688', fontFamily:F, fontSize:11, margin:0 }}>FUP FUP COIN · Live</p>
          </div>
        </div>
        <div style={{ background:'rgba(200,60,20,0.15)', border:'1px solid rgba(200,60,20,0.3)', borderRadius:10, padding:'8px 12px', color:'#ff9977', fontFamily:F, fontSize:12, fontWeight:600, textAlign:'center' }}>
          🔥 {BURN_DISPLAY}% of every FFC purchase is permanently burned
        </div>
        <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:8 }}>
          {stats.map((s,i) => (
            <div key={i} style={{ background:'rgba(255,255,255,0.04)', border:'1px solid rgba(255,255,255,0.08)', borderRadius:14, padding:'12px 10px', display:'flex', flexDirection:'column', alignItems:'center', gap:4 }}>
              <span style={{ fontSize:22 }}>{s.icon}</span>
              <span style={{ color:s.color, fontFamily:F, fontSize:19, fontWeight:800 }}><Num n={s.n} />{s.suffix||''}</span>
              <span style={{ color:'#666688', fontFamily:F, fontSize:11, textAlign:'center' }}>{s.label}</span>
            </div>
          ))}
        </div>
        <div style={{ background:'rgba(255,215,0,0.06)', border:'1px solid rgba(255,215,0,0.15)', borderRadius:14, padding:'12px 14px', display:'flex', flexDirection:'column', gap:8 }}>
          <p style={{ color:'#FFD700', fontFamily:F, fontSize:14, fontWeight:800, margin:0 }}>🦆 FUP FUP COIN</p>
          {[['Contract','E3DTxg…xpump'],['Network','Solana'],['Burn','8% per purchase'],['Holder perk','10K FFC = +5 free/day']].map(([k,v])=>(
            <div key={k} style={{ display:'flex', justifyContent:'space-between' }}>
              <span style={{ color:'#666688', fontFamily:F, fontSize:12 }}>{k}</span>
              <span style={{ color:'#aaa', fontFamily:F, fontSize:12 }}>{v}</span>
            </div>
          ))}
        </div>
        <button onClick={onClose} style={{ background:'transparent', border:'1px solid rgba(255,255,255,0.08)', borderRadius:12, padding:'9px', color:'#444466', fontFamily:F, fontSize:13, cursor:'pointer' }}>{t('close')}</button>
      </div>
    </div>
  )
}

const S = {
  ov:    { position:'fixed', inset:0, zIndex:200, background:'rgba(0,0,0,0.88)', display:'flex', alignItems:'center', justifyContent:'center', backdropFilter:'blur(6px)' },
  modal: { background:'linear-gradient(160deg,#0d0d20,#1a1a35)', border:'1px solid rgba(255,215,0,0.2)', borderRadius:22, padding:'20px 18px 16px', width:'min(380px,94vw)', maxHeight:'88vh', overflowY:'auto', display:'flex', flexDirection:'column', gap:12 },
  title: { color:'#FFD700', fontFamily:'system-ui,-apple-system,sans-serif', fontSize:20, fontWeight:900, margin:0 },
}
