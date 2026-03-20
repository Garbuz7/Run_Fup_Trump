import Phaser from 'phaser'
import { tp } from '../../i18n/useTranslation.js'

export default class BootScene extends Phaser.Scene {
  constructor() { super({ key: 'BootScene' }) }

  preload() {
    const W = this.scale.width, H = this.scale.height, cx = W / 2

    // Sky background for boot screen
    this.add.rectangle(cx, H/2, W, H, 0x1a8fe0)
    // Gradient overlay
    for (let y=0; y<H; y+=4) {
      const t = y/H
      const r=parseInt(20+t*30), g=parseInt(120+t*50), b=parseInt(200+t*30)
      this.add.rectangle(cx, y+2, W, 4, Phaser.Display.Color.GetColor(r,g,b))
    }

    // Clouds (simple ellipses)
    [[cx-120,H*.15],[cx+80,H*.10],[cx+160,H*.22]].forEach(([x,y])=>{
      this.add.ellipse(x,y,180,70,0xffffff,0.85)
      this.add.ellipse(x-50,y+10,120,55,0xffffff,0.75)
      this.add.ellipse(x+55,y+8,130,58,0xffffff,0.75)
    })

    // Duck emoji bouncing
    const duck = this.add.text(cx, H*.26, '🦆', {fontSize:'72px'}).setOrigin(0.5)
    this.tweens.add({targets:duck, y:H*.26-16, duration:500, yoyo:true, repeat:-1, ease:'Sine.easeInOut'})
    this.tweens.add({targets:duck, scaleX:1.07, scaleY:0.93, duration:500, yoyo:true, repeat:-1})

    // Title on white card
    const card = this.add.graphics()
    card.fillStyle(0xffffff, 0.18)
    card.fillRoundedRect(W*.1, H*.40, W*.80, 76, 20)
    card.lineStyle(2, 0xffffff, 0.35)
    card.strokeRoundedRect(W*.1, H*.40, W*.80, 76, 20)

    const title = this.add.text(cx, H*.435, tp('tap_start').includes('TAP') ? 'FUP RUNNER' : 'FUP RUNNER', {
      fontFamily: 'system-ui,-apple-system,sans-serif',
      fontSize:'38px', fontStyle:'bold',
      color:'#FFD700', stroke:'#005', strokeThickness:6,
    }).setOrigin(0.5).setAlpha(0)
    this.tweens.add({targets:title, alpha:1, y:H*.432, duration:600, delay:200, ease:'Back.easeOut'})

    const sub = this.add.text(cx, H*.505, 'TRUMP EDITION', {
      fontFamily:'system-ui,sans-serif', fontSize:'15px', color:'#ffe0ff', letterSpacing:5,
    }).setOrigin(0.5).setAlpha(0)
    this.tweens.add({targets:sub, alpha:1, duration:500, delay:500})

    // Progress bar
    const barW=W*.65, barH=14, barX=cx-barW/2, barY=H*.70
    this.add.graphics().fillStyle(0x000033,0.5).fillRoundedRect(barX-3,barY-3,barW+6,barH+6,barH/2+3)
    this.add.graphics().fillStyle(0x001166,1).fillRoundedRect(barX,barY,barW,barH,barH/2)
    const bar = this.add.graphics()
    const pct = this.add.text(cx, barY-20, '0%', {fontFamily:'system-ui',fontSize:'13px',color:'#aaddff'}).setOrigin(0.5)
    const jokes = tp('boot_jokes')
    const joke  = Array.isArray(jokes) ? Phaser.Utils.Array.GetRandom(jokes) : 'Loading…'
    this.add.text(cx, barY+barH+16, joke, {fontFamily:'system-ui',fontSize:'12px',color:'#cceeff'}).setOrigin(0.5)
    this.add.text(W-10, H-10, 'v5.0', {fontFamily:'system-ui',fontSize:'11px',color:'rgba(255,255,255,0.4)'}).setOrigin(1,1)

    this.load.on('progress', v => {
      bar.clear()
      bar.fillStyle(0xFFD700,1).fillRoundedRect(barX,barY,Math.max(8,barW*v),barH,barH/2)
      bar.fillStyle(0xFFFFAA,0.5).fillRoundedRect(barX+2,barY+2,Math.max(6,barW*v*0.6),4,3)
      pct.setText(Math.round(v*100)+'%')
    })

    // ── All assets ──────────────────────────────────────────────────────────
    this.load.spritesheet('duck', './assets/Duck_run.png', {frameWidth:295,frameHeight:697})
    // Animated duck from uploaded video (17 frames, 200x200px each)
    this.load.spritesheet('duck_anim',  './assets/duck_animated.png', {frameWidth:200,frameHeight:200})
    // Jump animation (16 frames, 200x200px each)
    this.load.spritesheet('duck_jump_s','./assets/duck_jump.png',     {frameWidth:200,frameHeight:200})
    this.load.spritesheet('coin', './assets/object_coin.png', {frameWidth:209,frameHeight:813})
    // Animated coin from video
    this.load.spritesheet('coin_anim', './assets/coin_animated.png', {frameWidth:128,frameHeight:128})
    // Real background layers (from user image)
    this.load.image('bg_sky_r',    './assets/bg_sky_real.jpg')
    this.load.image('bg_hills_r',  './assets/bg_hills_real.png')
    this.load.image('bg_ground_r', './assets/bg_ground_real.jpg')
    // Fallback generated backgrounds
    this.load.image('bg_sky',    './assets/bg_sky.png')
    this.load.image('bg_hills',  './assets/bg_hills.png')
    this.load.image('bg_ground', './assets/bg_ground.png')
    // UI / game assets
    this.load.image('coin_glow', './assets/coin_glow.png')
    this.load.image('obs_barrel','./assets/obs_barrel.png')
    this.load.image('obs_cactus','./assets/obs_cactus.png')
  }

  create() {
    this.time.delayedCall(250, () => {
      this.cameras.main.fadeOut(400,0,0,0)
      this.cameras.main.once('camerafadeoutcomplete', () => this.scene.start('GameScene'))
    })
  }
}
