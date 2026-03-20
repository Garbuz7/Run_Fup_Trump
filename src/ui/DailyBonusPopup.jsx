import React, { useEffect, useState } from 'react'
const F = 'system-ui,-apple-system,sans-serif'

export default function DailyBonusPopup({ reward, streak, onClose, t }) {
  const [vis, setVis] = useState(false)
  useEffect(() => {
    requestAnimationFrame(() => setVis(true))
    const id = setTimeout(() => { setVis(false); setTimeout(onClose, 400) }, 3500)
    return () => clearTimeout(id)
  }, [onClose])
  return (
    <div style={{ position:'fixed', top:0, left:0, right:0, zIndex:400, display:'flex', justifyContent:'center', transform: vis?'translateY(0)':'translateY(-120%)', transition:'transform 0.4s cubic-bezier(0.34,1.56,0.64,1)', pointerEvents:'none' }} onClick={onClose}>
      <div style={{ display:'flex', alignItems:'center', gap:12, background:'linear-gradient(90deg,#1a3a0a,#2a5a15,#1a3a0a)', border:'1px solid rgba(100,220,50,0.3)', borderRadius:'0 0 18px 18px', padding:'14px 22px', pointerEvents:'auto' }}>
        <span style={{ fontSize:32 }}>🌅</span>
        <div>
          <p style={{ color:'#7fff7f', fontFamily:F, fontSize:17, fontWeight:900, margin:0 }}>{t('daily_bonus')}</p>
          <p style={{ color:'#aaffaa', fontFamily:F, fontSize:13, margin:0 }}>{t('daily_added', reward)}</p>
          {streak > 1 && <p style={{ color:'#FFD700', fontFamily:F, fontSize:12, margin:0 }}>{t('day_streak', streak)}</p>}
        </div>
        <span style={{ fontSize:28 }}>🦆</span>
      </div>
    </div>
  )
}
