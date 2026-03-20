import React, { useState, useEffect } from 'react'
import { getBoard, pullCloud } from '../store/gameStore.js'
const F = 'system-ui,-apple-system,sans-serif'
const MEDALS = ['🥇','🥈','🥉']

export default function LeaderboardModal({ onClose, tgCloud, t }) {
  const [board,   setBoard]   = useState([])
  const [syncing, setSyncing] = useState(false)
  const [synced,  setSynced]  = useState(false)

  useEffect(() => { setBoard(getBoard()); if (tgCloud) sync() }, [])

  async function sync() {
    setSyncing(true)
    await pullCloud(tgCloud)
    setBoard(getBoard())
    setSyncing(false); setSynced(true)
  }

  return (
    <div style={S.ov} onClick={onClose}>
      <div style={S.modal} onClick={e=>e.stopPropagation()}>
        <h2 style={S.title}>{t('board_title')}</h2>
        <p style={S.sub}>{syncing?t('syncing'):synced?t('synced'):t('local')}</p>
        {board.length===0
          ? <div style={{ color:'#555577', fontFamily:F, textAlign:'center', padding:24 }}>{t('no_scores')}</div>
          : <div style={{ display:'flex', flexDirection:'column', gap:8 }}>
              {board.map((e,i)=>(
                <div key={i} style={{ display:'flex', alignItems:'center', gap:12, padding:'11px 14px', borderRadius:12, background:i===0?'rgba(255,215,0,0.09)':'rgba(255,255,255,0.03)', border:i===0?'1px solid rgba(255,215,0,0.2)':'1px solid transparent' }}>
                  <span style={{ fontSize:20, minWidth:30, textAlign:'center' }}>{i<3?MEDALS[i]:`${i+1}.`}</span>
                  <span style={{ flex:1, color:'#ddd', fontFamily:F, fontSize:14, fontWeight:600 }}>{e.name||'Anonymous'}</span>
                  <span style={{ color:'#FFD700', fontFamily:F, fontSize:15, fontWeight:800 }}>{e.score.toLocaleString()} 🪙</span>
                </div>
              ))}
            </div>
        }
        {tgCloud && !syncing && <button onClick={sync} style={S.sync}>{t('sync')}</button>}
        <button onClick={onClose} style={S.close}>{t('close')}</button>
      </div>
    </div>
  )
}

const S = {
  ov:    { position:'fixed', inset:0, zIndex:200, background:'rgba(0,0,0,0.88)', display:'flex', alignItems:'center', justifyContent:'center', backdropFilter:'blur(6px)' },
  modal: { background:'linear-gradient(160deg,#0d0d20,#1a1a35)', border:'1px solid rgba(255,215,0,0.2)', borderRadius:22, padding:'20px 18px 16px', width:'min(360px,94vw)', maxHeight:'80vh', overflowY:'auto', display:'flex', flexDirection:'column', gap:10 },
  title: { color:'#FFD700', fontFamily:'system-ui,-apple-system,sans-serif', fontSize:22, fontWeight:900, textAlign:'center', margin:0 },
  sub:   { color:'#666688', fontFamily:'system-ui,-apple-system,sans-serif', fontSize:12, textAlign:'center', margin:0 },
  sync:  { background:'rgba(255,255,255,0.05)', border:'1px solid rgba(255,255,255,0.1)', borderRadius:12, padding:'10px', color:'#aaa', fontFamily:'system-ui,-apple-system,sans-serif', fontSize:13, cursor:'pointer' },
  close: { background:'transparent', border:'1px solid rgba(255,255,255,0.08)', borderRadius:12, padding:'9px', color:'#444466', fontFamily:'system-ui,-apple-system,sans-serif', fontSize:13, cursor:'pointer' },
}
