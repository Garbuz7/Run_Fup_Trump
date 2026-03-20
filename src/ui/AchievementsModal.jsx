import React from 'react'
import { ACH_DEFS, getAch } from '../store/gameStore.js'
const F = 'system-ui,-apple-system,sans-serif'

export default function AchievementsModal({ onClose, t }) {
  const done = getAch()
  const pct  = Math.round(done.length / ACH_DEFS.length * 100)
  return (
    <div style={S.ov} onClick={onClose}>
      <div style={S.modal} onClick={e=>e.stopPropagation()}>
        <h2 style={S.title}>{t('ach_title')}</h2>
        <div style={{ height:8, borderRadius:4, background:'rgba(255,255,255,0.08)', overflow:'hidden' }}>
          <div style={{ height:'100%', borderRadius:4, background:'linear-gradient(90deg,#FFD700,#FFA500)', width:`${pct}%`, transition:'width .5s' }} />
        </div>
        <p style={{ color:'#666688', fontFamily:F, fontSize:12, textAlign:'center', margin:0 }}>{t('unlocked', done.length, ACH_DEFS.length)} ({pct}%)</p>
        <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:8 }}>
          {ACH_DEFS.map(a => {
            const ok = done.includes(a.id)
            return (
              <div key={a.id} style={{ display:'flex', flexDirection:'column', alignItems:'center', gap:4, padding:'12px 8px', borderRadius:14, position:'relative', background:ok?'rgba(255,215,0,0.07)':'rgba(255,255,255,0.02)', border:ok?'1px solid rgba(255,215,0,0.2)':'1px solid rgba(255,255,255,0.05)' }}>
                <span style={{ fontSize:28, filter:ok?'none':'grayscale(1)', opacity:ok?1:0.25 }}>{a.icon}</span>
                <span style={{ color:ok?'#ccc':'#444466', fontFamily:F, fontSize:11, fontWeight:ok?600:400, textAlign:'center' }}>{a.label}</span>
                {ok && <span style={{ color:'#FFD700', fontSize:10, position:'absolute', top:6, right:8 }}>✓</span>}
              </div>
            )
          })}
        </div>
        <button onClick={onClose} style={{ background:'transparent', border:'1px solid rgba(255,255,255,0.08)', borderRadius:12, padding:'9px', color:'#444466', fontFamily:F, fontSize:13, cursor:'pointer' }}>{t('close')}</button>
      </div>
    </div>
  )
}

const S = {
  ov:    { position:'fixed', inset:0, zIndex:200, background:'rgba(0,0,0,0.88)', display:'flex', alignItems:'center', justifyContent:'center', backdropFilter:'blur(6px)' },
  modal: { background:'linear-gradient(160deg,#0d0d20,#1a1a35)', border:'1px solid rgba(255,215,0,0.2)', borderRadius:22, padding:'20px 18px 16px', width:'min(380px,94vw)', maxHeight:'84vh', overflowY:'auto', display:'flex', flexDirection:'column', gap:10 },
  title: { color:'#FFD700', fontFamily:'system-ui,-apple-system,sans-serif', fontSize:22, fontWeight:900, textAlign:'center', margin:0 },
}
