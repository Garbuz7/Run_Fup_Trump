import Phaser from 'phaser'
import BootScene from './scenes/BootScene.js'
import GameScene from './scenes/GameScene.js'

export function createGame(parent, callbacks) {
  const W = window.innerWidth
  const H = window.innerHeight

  // Detect low-end device
  const isLowEnd = navigator.hardwareConcurrency <= 4 || /Android [4-7]/.test(navigator.userAgent)

  return new Phaser.Game({
    type: Phaser.CANVAS,          // CANVAS faster than AUTO/WEBGL on mobile
    parent,
    width:  W,
    height: H,
    backgroundColor: '#0d0d1a',
    physics: {
      default: 'arcade',
      arcade:  { gravity: { y: 0 }, debug: false },
    },
    scene: [BootScene, new GameScene(callbacks)],
    scale: {
      mode:       Phaser.Scale.FIT,
      autoCenter: Phaser.Scale.CENTER_BOTH,
      width:  W,
      height: H,
    },
    render: {
      antialias:        false,    // FIX#1: антиалиасинг даёт лаги на мобильных
      pixelArt:         false,
      roundPixels:      true,     // устраняет субпиксельные дрожания
      powerPreference:  'high-performance',
      transparent:      false,
      clearBeforeRender:true,
    },
    input: {
      activePointers: 1,          // FIX#5: 1 pointer — нет конфликтов в Telegram
      touch: {
        capture: true,
      },
    },
    fps: {
      target: 60,
      forceSetTimeOut: isLowEnd,  // setTimeout на слабых устройствах стабильнее rAF
    },
    banner: false,
  })
}
