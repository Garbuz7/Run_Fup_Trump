import React from 'react'
import { LANGS } from '../i18n/translations.js'
const F = 'system-ui,-apple-system,sans-serif'

export default function LanguagePicker({ lang, onSelect, onClose, t }) {
  return (
    <div style={S.ov} onClick={onClose}>
      <div style={S.modal} onClick={e=>e.stopPropagation()}>
        <h2 style={S.title}>🌐 {t('choose_lang')}</h2>
        <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:8 }}>
          {LANGS.map(l => (
            <button key={l.code} onClick={()=>{onSelect(l.code);onClose()}} style={{ display:'flex', flexDirection:'column', alignItems:'center', gap:6, padding:'14px 8px', borderRadius:14, background:l.code===lang?'rgba(255,215,0,0.12)':'rgba(255,255,255,0.04)', border:l.code===lang?'1.5px solid rgba(255,215,0,0.4)':'1px solid rgba(255,255,255,0.08)', cursor:'pointer', position:'relative', WebkitTapHighlightColor:'transparent' }}>
              <span style={{ fontSize:28, lineHeight:1 }}>{l.flag}</span>
              <span style={{ color:l.code===lang?'#FFD700':'#ccc', fontFamily:F, fontSize:13, fontWeight:l.code===lang?700:400 }}>{l.label}</span>
              {l.code===lang && <span style={{ position:'absolute', top:6, right:8, color:'#FFD700', fontSize:11 }}>✓</span>}
            </button>
          ))}
        </div>
        <button onClick={onClose} style={{ background:'transparent', border:'1px solid rgba(255,255,255,0.08)', borderRadius:12, padding:'10px', color:'#444466', fontFamily:F, fontSize:13, cursor:'pointer' }}>{t('close')}</button>
      </div>
    </div>
  )
}

const S = {
  ov:    { position:'fixed', inset:0, zIndex:300, background:'rgba(0,0,0,0.88)', display:'flex', alignItems:'center', justifyContent:'center', backdropFilter:'blur(6px)' },
  modal: { background:'linear-gradient(160deg,#0d0d20,#1a1a35)', border:'1px solid rgba(255,215,0,0.2)', borderRadius:22, padding:'22px 18px 18px', width:'min(360px,94vw)', display:'flex', flexDirection:'column', gap:14 },
  title: { color:'#FFD700', fontFamily:'system-ui,-apple-system,sans-serif', fontSize:20, fontWeight:900, textAlign:'center', margin:0 },
}
