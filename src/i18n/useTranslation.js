import { useState, useCallback } from 'react'
import T, { LANGS } from './translations.js'

const LS_KEY = 'fup_lang'

function detect() {
  try { const s = localStorage.getItem(LS_KEY); if (s && T[s]) return s } catch (_) {}
  try {
    const tg = window.Telegram?.WebApp?.initDataUnsafe?.user?.language_code
    if (tg) { const b = tg.split('-')[0].toLowerCase(); if (T[b]) return b }
  } catch (_) {}
  try {
    const nav = (navigator.language || 'en').split('-')[0].toLowerCase()
    if (T[nav]) return nav
  } catch (_) {}
  return 'en'
}

// Singleton for Phaser scenes (no React)
let _lang = 'en'
export function setGlobalLang(code) {
  if (T[code]) _lang = code
}
export function tp(key, ...args) {
  const val = T[_lang]?.[key] ?? T.en?.[key] ?? key
  return typeof val === 'function' ? val(...args) : val
}

// React hook
export function useTranslation() {
  const [lang, setLangState] = useState(() => { const d = detect(); _lang = d; return d })

  const setLang = useCallback((code) => {
    if (!T[code]) return
    _lang = code
    setLangState(code)
    try { localStorage.setItem(LS_KEY, code) } catch (_) {}
    const meta = LANGS.find(l => l.code === code)
    document.documentElement.setAttribute('dir', meta?.dir || 'ltr')
  }, [])

  const t = useCallback((key, ...args) => {
    const val = T[lang]?.[key] ?? T.en?.[key] ?? key
    return typeof val === 'function' ? val(...args) : val
  }, [lang])

  return { t, lang, setLang, currentLang: LANGS.find(l => l.code === lang) || LANGS[0], langs: LANGS }
}
