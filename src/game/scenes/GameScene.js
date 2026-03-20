import Phaser from 'phaser'
import { ParticleSystem } from '../../systems/ParticleSystem.js'
import { CameraFX }       from '../../systems/CameraFX.js'
import { GlowFX }         from '../../systems/GlowFX.js'
import { tp }             from '../../i18n/useTranslation.js'
import {
  newSession, validateCoin, validateScore,
  setEncScore, getEncScore,
  startRafMonitor, stopRafMonitor, setCheatCb,
} from '../../store/antiCheat.js'

// ─────────────────────────────────────────────────────────────────────────────
// CONSTANTS
// ─────────────────────────────────────────────────────────────────────────────
const GH    = 100    // ground height px
const GY_G  = 1750   // gravity
const JV    = -860   // jump velocity
const DJV   = -710   // double-jump velocity
const DS    = 0.22   // duck scale (fallback)
const TI    = 90     // trail interval ms
const SC    = 10     // streak → confetti

// Speed ramp: 0 → 180 seconds → SI to SM
const SI    = 200    // start speed px/s
const SM    = 580    // max speed px/s
const RAMP  = 180    // seconds to reach max (3 minutes)

// 8 obstacle type definitions — all drawn with graphics (no external sprites needed as fallback)
// type: id, w, h, color scheme, shape
const OBS_TYPES = [
  { id: 0, key: 'obs_cactus',  ow: 48,  oh: 96,  label: 'cactus'        },
  { id: 1, key: 'obs_barrel',  ow: 58,  oh: 78,  label: 'barrel'        },
  { id: 2, key: 'obs_barrel',  ow: 50,  oh: 65,  label: 'barrel_small'  },
  { id: 3, key: 'obs_cactus',  ow: 40,  oh: 80,  label: 'cactus_small'  },
  { id: 4, key: 'obs_barrel',  ow: 58,  oh: 78,  label: 'barrel_dbl',   double: true, gap: 46 },
  { id: 5, key: 'obs_cactus',  ow: 48,  oh: 96,  label: 'cactus_dbl',   double: true, gap: 52 },
  { id: 6, key: 'obs_barrel',  ow: 70,  oh: 92,  label: 'barrel_tall'   },
  { id: 7, key: 'obs_cactus',  ow: 56,  oh: 110, label: 'cactus_tall'   },
]

export default class GameScene extends Phaser.Scene {
  constructor (cb = {}) { super({ key: 'GameScene' }); this._cb = cb }

  // ── init: reset all state every restart ────────────────────────────────────
  init () {
    this._W = 0; this._H = 0; this._GY = 0
    this._score   = 0
    this._speed   = SI
    this._elapsed = 0
    this._alive   = true
    this._jumps   = 0
    this._intro   = true
    this._streak  = 0
    this._slow    = false
    this._trail   = 0
    this._banned  = false
    this._lastJump = 0
    // bg tile arrays
    this._skyTiles  = []; this._skyW  = 0
    this._hillTiles = []; this._hillW = 0
    this._gndTiles  = []; this._gndW  = 0
    // groups
    this._coinGroup = null
    this._obsGroup  = null
    this._ct = null; this._ot = null
    this._ps = null; this._cfx = null
    // touch
    this._canvas = null; this._touchHandler = null
    // player
    this._p = null
    this._hasDuckAnim = false
    this._hasJumpAnim = false
    // intro objects
    this._tapTxt  = null
    this._tipTxt  = null
    this._introBg = null
    // last obstacle type (for variety enforcement)
    this._lastObsType = -1
  }

  // ── create ─────────────────────────────────────────────────────────────────
  create () {
    this._W  = this.scale.width
    this._H  = this.scale.height
    this._GY = this._H - GH

    this.cameras.main.fadeIn(350, 0, 0, 0)
    this._ps  = new ParticleSystem(this)
    this._cfx = new CameraFX(this)

    // Anti-cheat
    newSession()
    setEncScore(0)
    startRafMonitor()
    setCheatCb(({ pts }) => {
      if (pts >= 40 && !this._banned) { this._banned = true; this._cheatWarn() }
    })

    this._buildBg()
    this._buildGround()
    this._buildAnims()
    this._buildPlayer()
    this._buildGroups()
    this._buildInput()
    this._buildIntro()
    this._startSpawners()
  }

  // ─────────────────────────────────────────────────────────────────────────
  // BACKGROUND — 3 parallax layers from real image
  // ─────────────────────────────────────────────────────────────────────────
  _buildBg () {
    const { _W: W, _H: H } = this

    // ── Sky (barely moves — 5%)
    const skyKey = this.textures.exists('bg_sky_r') ? 'bg_sky_r' : 'bg_sky'
    const skySrc = this.textures.get(skyKey).getSourceImage()
    // Portrait image → scale to fill screen height
    const sRatio = H / skySrc.height
    const sW     = skySrc.width * sRatio
    this._skyW   = sW
    const sCnt   = Math.ceil(W / sW) + 2
    for (let i = 0; i < sCnt; i++) {
      this._skyTiles.push(
        this.add.image(i * sW, 0, skyKey).setOrigin(0, 0).setScale(sRatio).setDepth(0)
      )
    }

    // ── Hills (slow parallax — 20%)
    const hillKey = this.textures.exists('bg_hills_r') ? 'bg_hills_r' : 'bg_hills'
    const hSrc    = this.textures.get(hillKey).getSourceImage()
    const hH      = H * 0.45
    const hRatio  = hH / hSrc.height
    const hW      = hSrc.width * hRatio
    this._hillW   = hW
    const hCnt    = Math.ceil(W / hW) + 2
    for (let i = 0; i < hCnt; i++) {
      this._hillTiles.push(
        this.add.image(i * hW, H - GH, hillKey).setOrigin(0, 1).setScale(hRatio).setDepth(3)
      )
    }

    // ── Ground (full speed — 100%)
    const gndKey = this.textures.exists('bg_ground_r') ? 'bg_ground_r' : 'bg_ground'
    const gSrc   = this.textures.get(gndKey).getSourceImage()
    const gRatio = GH / gSrc.height
    const gW     = gSrc.width * gRatio
    this._gndW   = gW
    const gCnt   = Math.ceil(W / gW) + 2
    for (let i = 0; i < gCnt; i++) {
      this._gndTiles.push(
        this.add.image(i * gW, H, gndKey).setOrigin(0, 1).setScale(gRatio).setDepth(8)
      )
    }
  }

  _scrollBg (dt) {
    const f = dt / 1000
    const scroll = (tiles, tileW, speed) => {
      if (!tiles.length) return
      const dx   = speed * f
      const maxX = Math.max(...tiles.map(t => t.x))
      for (const t of tiles) {
        t.x -= dx
        if (t.x + tileW < 0) t.x = maxX + tileW
      }
    }
    scroll(this._skyTiles,  this._skyW,  this._speed * 0.05)
    scroll(this._hillTiles, this._hillW, this._speed * 0.20)
    scroll(this._gndTiles,  this._gndW,  this._speed)
  }

  // ─────────────────────────────────────────────────────────────────────────
  // GROUND PHYSICS ZONE
  // ─────────────────────────────────────────────────────────────────────────
  _buildGround () {
    const { _W: W, _GY: gY } = this
    this._gb = this.add.zone(W / 2, gY + GH / 2, W, GH)
    this.physics.add.existing(this._gb, true)
  }

  // ─────────────────────────────────────────────────────────────────────────
  // ANIMATIONS
  // ─────────────────────────────────────────────────────────────────────────
  _buildAnims () {
    // Run
    if (!this.anims.exists('run')) {
      const has = this.textures.exists('duck_anim')
      this.anims.create({
        key: 'run',
        frames: has
          ? this.anims.generateFrameNumbers('duck_anim', { start: 0, end: 16 })
          : this.anims.generateFrameNumbers('duck',      { start: 0, end: 2  }),
        frameRate: has ? 15 : 9,
        repeat: -1,
      })
    }
    // Jump (plays once)
    if (!this.anims.exists('jump') && this.textures.exists('duck_jump_s')) {
      this.anims.create({
        key: 'jump',
        frames: this.anims.generateFrameNumbers('duck_jump_s', { start: 0, end: 15 }),
        frameRate: 18,
        repeat: 0,
      })
    }
    // Coin spin
    if (!this.anims.exists('coin_spin') && this.textures.exists('coin_anim')) {
      this.anims.create({
        key: 'coin_spin',
        frames: this.anims.generateFrameNumbers('coin_anim', { start: 0, end: 15 }),
        frameRate: 20,
        repeat: -1,
      })
    }
  }

  // ─────────────────────────────────────────────────────────────────────────
  // PLAYER
  // ─────────────────────────────────────────────────────────────────────────
  _buildPlayer () {
    this._hasDuckAnim = this.textures.exists('duck_anim')
    this._hasJumpAnim = this.textures.exists('duck_jump_s')

    const key = this._hasDuckAnim ? 'duck_anim' : 'duck'
    this._p = this.physics.add.sprite(this._W * 0.16, this._GY, key, 0)
    this._p.setOrigin(0.5, 1).setDepth(10)
    this._p.setGravityY(GY_G).setCollideWorldBounds(false)

    if (this._hasDuckAnim) {
      this._p.setDisplaySize(120, 120)
      this._p.body.setSize(86, 96).setOffset(57, 100)
    } else {
      this._p.setScale(DS)
      this._p.body.setSize(295 * 0.52, 697 * 0.62).setOffset(295 * 0.24, 697 * 0.38)
    }
    this._p.play('run')

    // Return to run after jump anim finishes
    this._p.on('animationcomplete', anim => {
      if (anim.key === 'jump' && this._alive) this._p.play('run')
    })

    this.physics.add.collider(this._p, this._gb, () => { this._jumps = 0 })
  }

  // ─────────────────────────────────────────────────────────────────────────
  // GROUPS
  // ─────────────────────────────────────────────────────────────────────────
  _buildGroups () {
    this._coinGroup = this.physics.add.group()
    this.physics.add.overlap(this._p, this._coinGroup, (_, c) => this._collectCoin(c))
    this._obsGroup  = this.add.group()
  }

  // ─────────────────────────────────────────────────────────────────────────
  // INPUT
  // ─────────────────────────────────────────────────────────────────────────
  _buildInput () {
    this.input.keyboard?.on('keydown-SPACE', () => this._jump())
    this.input.keyboard?.on('keydown-UP',    () => this._jump())

    // pointerup + 150ms debounce → no double-fires
    this.input.on('pointerup', () => {
      const now = Date.now()
      if (now - this._lastJump < 150) return
      this._lastJump = now
      this._jump()
    })

    // Prevent default touch so browser doesn't swallow events
    this.time.delayedCall(200, () => {
      this._canvas = this.sys.game.canvas
      if (!this._canvas) return
      this._canvas.style.touchAction = 'none'
      this._touchHandler = e => e.preventDefault()
      this._canvas.addEventListener('touchstart', this._touchHandler, { passive: false })
      this._canvas.addEventListener('touchend',   this._touchHandler, { passive: false })
    })
  }

  _jump () {
    if (!this._alive || this._banned) return
    if (this._intro) this._endIntro()
    const onGround = this._p.body.blocked.down || this._p.body.touching.down
    if (onGround) this._jumps = 0
    if (this._jumps < 2) {
      this._p.setVelocityY(this._jumps === 0 ? JV : DJV)
      this._jumps++
      this._cb.onJump?.()
      if (this._hasJumpAnim) {
        this._p.play('jump', true)
      } else {
        this.tweens.add({
          targets: this._p, scaleY: DS * 1.2, scaleX: DS * 0.83,
          duration: 85, yoyo: true, ease: 'Quad.easeOut',
        })
      }
    }
  }

  // ─────────────────────────────────────────────────────────────────────────
  // INTRO
  // ─────────────────────────────────────────────────────────────────────────
  _buildIntro () {
    const { _W: W, _H: H } = this
    this._introBg = this.add.graphics().setDepth(24)
    this._introBg.fillStyle(0x000033, 0.45)
    this._introBg.fillRoundedRect(W * 0.12, H * 0.36, W * 0.76, 72, 18)
    this._introBg.lineStyle(2, 0xffffff, 0.25)
    this._introBg.strokeRoundedRect(W * 0.12, H * 0.36, W * 0.76, 72, 18)

    this._tapTxt = this.add.text(W / 2, H * 0.395, tp('tap_start'), {
      fontFamily: 'system-ui,-apple-system,sans-serif',
      fontSize: '26px', fontStyle: 'bold',
      color: '#ffffff', stroke: '#003399', strokeThickness: 4,
    }).setOrigin(0.5).setDepth(25)
    this.tweens.add({ targets: this._tapTxt, alpha: 0.2, duration: 600, yoyo: true, repeat: -1 })

    this._tipTxt = this.add.text(W / 2, H * 0.50, '👆 ' + tp('dbl_jump'), {
      fontFamily: 'system-ui,sans-serif', fontSize: '14px', color: '#aaddff',
    }).setOrigin(0.5).setDepth(25)
  }

  _endIntro () {
    if (!this._intro) return
    this._intro = false
    this.tweens.add({
      targets: [this._tapTxt, this._tipTxt, this._introBg],
      alpha: 0, duration: 200,
      onComplete: () => {
        this._tapTxt?.destroy()
        this._tipTxt?.destroy()
        this._introBg?.destroy()
        this._tapTxt = this._tipTxt = this._introBg = null
      },
    })
  }

  // ─────────────────────────────────────────────────────────────────────────
  // SPAWNERS
  // ─────────────────────────────────────────────────────────────────────────
  _startSpawners () {
    // Coins: start at 1400ms gap, tighten to 600ms over 3 minutes
    this._ct = this.time.addEvent({
      delay: 1400, loop: true,
      callback: () => {
        if (!this._alive || this._intro) return
        this._spawnCoins()
        const t = Math.min(this._elapsed / RAMP, 1)
        this._ct.delay = Math.max(600, 1400 - 800 * t)
      },
    })

    // Obstacles: first one at 3s, then gap 2800→1200ms over 3 min
    this.time.delayedCall(3000, () => {
      this._ot = this.time.addEvent({
        delay: 2800, loop: true,
        callback: () => {
          if (!this._alive || this._intro) return
          this._spawnObs()
          const t = Math.min(this._elapsed / RAMP, 1)
          this._ot.delay = Math.max(1200, 2800 - 1600 * t)
        },
      })
    })
  }

  // ─────────────────────────────────────────────────────────────────────────
  // COINS
  // ─────────────────────────────────────────────────────────────────────────
  _spawnCoins () {
    const { _W: W, _GY: gY } = this
    const p  = Phaser.Math.Between(0, 3)
    const mk = y => { if (this._alive) this._mkCoin(W + 60, y) }

    if      (p === 0) mk(Phaser.Math.Between(gY * 0.32, gY - 55))
    else if (p === 1) { const y = Phaser.Math.Between(gY * 0.38, gY - 60); for (let i = 0; i < 3; i++) this.time.delayedCall(i * 220, () => mk(y)) }
    else if (p === 2) { for (let i = 0; i < 5; i++) { const ay = gY - 50 - Math.sin(i / 4 * Math.PI) * 110; this.time.delayedCall(i * 170, () => mk(ay)) } }
    else              { for (let i = 0; i < 4; i++) this.time.delayedCall(i * 250, () => mk(gY - 30)) }
  }

  _mkCoin (x, y) {
    // Glow underneath
    const glow = this.add.image(x, y, 'coin_glow').setOrigin(0.5, 0.5).setDepth(5)
    glow.setDisplaySize(80, 80)
    this.tweens.add({ targets: glow, scaleX: 0.72, scaleY: 0.72, duration: 800, yoyo: true, repeat: -1, ease: 'Sine.easeInOut' })

    // Coin sprite
    const useAnim = this.anims.exists('coin_spin')
    const c = this._coinGroup.create(x, y, useAnim ? 'coin_anim' : 'coin', 0)
    c.setOrigin(0.5, 0.5).setDepth(6)
    if (useAnim) {
      c.setDisplaySize(90, 90)
      c.body.setSize(80, 80).setOffset(24, 24)
    } else {
      c.setScale(0.11)
      c.body.setSize(209 * 0.65, 813 * 0.65).setOffset(209 * 0.175, 813 * 0.175)
    }
    c.body.setAllowGravity(false).setVelocityX(-this._speed)
    c.play(useAnim ? 'coin_spin' : 'spin')
    c._glow = glow

    // Bob
    this.tweens.add({ targets: [c, glow], y: y - 8, duration: 580 + Math.random() * 150, yoyo: true, repeat: -1, ease: 'Sine.easeInOut' })
    return c
  }

  _collectCoin (coin) {
    if (!validateCoin()) return
    const { x, y } = coin
    coin._glow?.destroy()
    this._ps.coinBurst(x, y)
    GlowFX.flashHalo(this, x, y, 0xFFD700, 32)
    this._cfx.zoomPulse(1.03, 75)
    coin.destroy()

    this._score++
    setEncScore(this._score)
    this._streak++
    this._cb.onScore?.(this._score)
    this._cb.onCoinCollect?.()
    this._floatTxt(x, y - 20, '+1', '#FFD700', 26)

    if (this._streak % SC === 0) {
      this._ps.confettiRain(this._W, this._H)
      this._cfx.flashGold(250)
      this._floatTxt(this._W / 2, this._H * 0.30, tp('streak', this._streak), '#FF6633', 26)
    }
    if (this._score >= 100 && !this._slow) {
      this._slow = true
      this._cfx.flashGold(350)
      this._cfx.slowMotion(0.35, 1000)
      this._ps.goldenRain(this._W, this._H)
      this._floatTxt(this._W / 2, this._H * 0.26, tp('century'), '#FFD700', 32)
    }
  }

  // ─────────────────────────────────────────────────────────────────────────
  // OBSTACLES — 8 types, random, no repeat
  // ─────────────────────────────────────────────────────────────────────────
  _spawnObs () {
    const { _W: W, _GY: gY } = this

    // Pick random type, avoid repeating the same type twice in a row
    let typeIdx
    do {
      typeIdx = Phaser.Math.Between(0, OBS_TYPES.length - 1)
    } while (typeIdx === this._lastObsType && OBS_TYPES.length > 1)
    this._lastObsType = typeIdx

    const def = OBS_TYPES[typeIdx]
    const x   = W + 100
    const key = this.textures.exists(def.key) ? def.key : null

    this._makeObstacle(x, gY, def.ow, def.oh, key, def.key)

    // Double obstacle variant
    if (def.double) {
      this._makeObstacle(x + (def.gap || 50), gY, def.ow * 0.82, def.oh * 0.82, key, def.key)
    }
  }

  _makeObstacle (x, gY, ow, oh, texKey, fallbackKey) {
    let sprite

    if (texKey) {
      sprite = this.add.image(x, gY, texKey).setOrigin(0.5, 1).setDepth(7)
      sprite.setDisplaySize(ow, oh)
    } else {
      // Fallback: draw with graphics if texture missing
      sprite = this.add.graphics().setDepth(7)
      if (fallbackKey === 'obs_cactus') {
        sprite.fillStyle(0x2a7a10).fillRoundedRect(x - ow/2, gY - oh, ow, oh, 6)
        sprite.fillStyle(0x3a9a20).fillRect(x - ow/2 + 3, gY - oh + 3, ow - 6, oh - 6)
      } else {
        sprite.fillStyle(0x8b4513).fillRoundedRect(x - ow/2, gY - oh, ow, oh, 8)
        sprite.fillStyle(0x555).fillRect(x - ow/2, gY - oh * 0.35, ow, 8)
        sprite.fillStyle(0x555).fillRect(x - ow/2, gY - oh * 0.65, ow, 8)
      }
    }

    // Shadow
    const shadow = this.add.ellipse(x, gY - 3, ow * 0.85, 10, 0x000000, 0.22).setDepth(6)

    // Physics zone — slightly smaller than visual for forgiving hitbox
    const zone = this.add.zone(x, gY - oh / 2, ow * 0.72, oh * 0.80)
    this.physics.add.existing(zone, false)
    zone.body.setAllowGravity(false).setImmovable(true).setVelocityX(-this._speed)
    zone.setDepth(7)
    zone._sprite = sprite
    zone._shadow = shadow
    zone._isGfx  = !texKey   // flag: graphics object needs different destroy

    this._obsGroup.add(zone)
    this.physics.add.overlap(this._p, zone, () => { if (this._alive) this._die() })
  }

  // ─────────────────────────────────────────────────────────────────────────
  // DEATH
  // ─────────────────────────────────────────────────────────────────────────
  _die () {
    if (!this._alive) return
    this._alive = false
    this._streak = 0
    stopRafMonitor()

    const result = validateScore(this._score)
    const final  = result.valid ? this._score : Math.min(this._score, getEncScore())

    this._p.setTint(0xff3333)
    this._p.anims.stop()
    this._p.setVelocityX(0)
    this._ps.deathBurst(this._p.x, this._p.y - 40)

    this._coinGroup.getChildren().forEach(c => { c._glow?.destroy(); c.body?.setVelocityX(0) })
    this._obsGroup.getChildren().forEach(z => z.body?.setVelocityX(0))

    this._ct?.remove()
    this._ot?.remove()
    this._cfx.shake(0.013, 280)
    this._cfx.flashRed(180)
    this._cleanupTouch()

    this.time.delayedCall(480, () => this._cb.onGameOver?.(final))
  }

  _cleanupTouch () {
    if (this._touchHandler && this._canvas) {
      this._canvas.removeEventListener('touchstart', this._touchHandler)
      this._canvas.removeEventListener('touchend',   this._touchHandler)
      this._touchHandler = null
    }
  }

  _cheatWarn () {
    this._p.setTint(0xffaa00)
    this._floatTxt(this._W / 2, this._H * 0.35, '⚠️ FAIR PLAY', '#ff8800', 22)
    this.time.delayedCall(2500, () => { if (this._p?.active) this._p.clearTint() })
  }

  _floatTxt (x, y, msg, color = '#FFD700', size = 26) {
    const t = this.add.text(x, y, msg, {
      fontFamily: 'system-ui,sans-serif', fontSize: `${size}px`, fontStyle: 'bold',
      color, stroke: '#003', strokeThickness: 4,
    }).setOrigin(0.5).setDepth(22)
    this.tweens.add({ targets: t, y: y - 65, alpha: 0, duration: 700, ease: 'Power2', onComplete: () => t.destroy() })
  }

  // ─────────────────────────────────────────────────────────────────────────
  // PUBLIC
  // ─────────────────────────────────────────────────────────────────────────
  restartGame () {
    // Clean up obstacle sprites
    this._obsGroup?.getChildren().forEach(z => {
      if (z._isGfx) z._sprite?.destroy()
      else z._sprite?.destroy()
      z._shadow?.destroy()
    })
    // Clean up coin glows
    this._coinGroup?.getChildren().forEach(c => c._glow?.destroy())
    stopRafMonitor()
    this._cleanupTouch()
    this.scene.restart()
  }

  // ─────────────────────────────────────────────────────────────────────────
  // UPDATE — called every frame
  // ─────────────────────────────────────────────────────────────────────────
  update (_, dt) {
    if (!this._alive) return

    // ── 1. Speed ramp: smooth easeInOut over exactly RAMP seconds ───────
    this._elapsed += dt / 1000
    const t = Math.min(this._elapsed / RAMP, 1.0)
    // smoothstep: 3t²-2t³  — starts slow, accelerates in middle, eases to max
    const eased  = t * t * (3 - 2 * t)
    const target = SI + (SM - SI) * eased

    // Low-pass filter (α=0.05) — prevents any frame-to-frame snapping
    this._speed += (target - this._speed) * 0.05

    // ── 2. Scroll background ─────────────────────────────────────────────
    this._scrollBg(dt)

    // ── 3. Duck trail ─────────────────────────────────────────────────────
    this._trail += dt
    if (this._trail >= TI) {
      this._trail = 0
      if (this._p?.body && !this._p.body.blocked.down) {
        this._ps.duckTrail(
          this._p.x - this._p.displayWidth  * 0.25,
          this._p.y - this._p.displayHeight * 0.40,
        )
      }
    }

    // ── 4. Update coins ───────────────────────────────────────────────────
    this._coinGroup.getChildren().forEach(c => {
      if (!c.active) return
      c.body.setVelocityX(-this._speed)
      if (c._glow) c._glow.x = c.x
      if (c.x < -100) { c._glow?.destroy(); c.destroy() }
    })

    // ── 5. Update obstacles ───────────────────────────────────────────────
    this._obsGroup.getChildren().forEach(z => {
      if (!z.active) return
      z.body.setVelocityX(-this._speed)

      // Sync sprite to physics zone
      if (z._sprite) {
        if (z._isGfx) {
          // graphics objects move differently — use x offset
          z._sprite.x = z.x - (z._initX ? z._initX - z.x : 0)
        } else {
          z._sprite.x = z.x
        }
        z._shadow.x = z.x
      }

      if (z.x < -200) {
        z._sprite?.destroy()
        z._shadow?.destroy()
        z.destroy()
      }
    })

    // ── 6. Floor clamp ─────────────────────────────────────────────────────
    if (this._p?.y > this._GY + 5) {
      this._p.y = this._GY
      this._p.setVelocityY(0)
      this._jumps = 0
      if (this._p.anims.currentAnim?.key === 'jump') this._p.play('run')
    }
  }
}
