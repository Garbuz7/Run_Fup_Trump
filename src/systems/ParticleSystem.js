export class ParticleSystem {
  constructor(scene) { this.s = scene }

  coinBurst(x, y) {
    const colors = [0xFFD700, 0xFFA500, 0xFFEC6E, 0xFFFFAA]
    for (let i = 0; i < 10; i++) {
      const r = this.s.add.circle(x, y, Phaser.Math.Between(3,9), Phaser.Utils.Array.GetRandom(colors)).setDepth(15)
      const a = (i / 10) * Math.PI * 2
      const d = Phaser.Math.Between(60, 180)
      this.s.tweens.add({ targets:r, x:x+Math.cos(a)*d, y:y+Math.sin(a)*d-Phaser.Math.Between(0,50), alpha:0, scaleX:0.1, scaleY:0.1, duration:Phaser.Math.Between(380,650), ease:'Power2', onComplete:()=>r.destroy() })
    }
  }

  deathBurst(x, y) {
    const colors = [0xFF3333, 0xFF6633, 0xFFAA00]
    for (let i = 0; i < 14; i++) {
      const r = this.s.add.circle(x, y, Phaser.Math.Between(5,13), Phaser.Utils.Array.GetRandom(colors)).setDepth(18)
      const a = (i / 14) * Math.PI * 2
      const d = Phaser.Math.Between(80, 260)
      this.s.tweens.add({ targets:r, x:x+Math.cos(a)*d, y:y+Math.sin(a)*d, alpha:0, scaleX:0.1, scaleY:0.1, duration:Phaser.Math.Between(450,850), ease:'Power2', onComplete:()=>r.destroy() })
    }
    const ring = this.s.add.circle(x, y, 10, 0xFF6633, 0).setDepth(17).setStrokeStyle(4, 0xFF6633, 1)
    this.s.tweens.add({ targets:ring, scaleX:6, scaleY:6, alpha:0, duration:480, ease:'Power2', onComplete:()=>ring.destroy() })
  }

  confettiRain(W, H) {
    const colors = [0xFFD700, 0xFF6B6B, 0x6BCB77, 0x4D96FF, 0xFF69B4]
    for (let i = 0; i < 35; i++) {
      const r = this.s.add.rectangle(Phaser.Math.Between(0,W), -10, Phaser.Math.Between(6,14), Phaser.Math.Between(8,16), Phaser.Utils.Array.GetRandom(colors)).setDepth(20).setAngle(Phaser.Math.Between(0,360))
      this.s.tweens.add({ targets:r, y:H+20, x:r.x+Phaser.Math.Between(-80,80), angle:r.angle+Phaser.Math.Between(-360,360), alpha:{from:1,to:0.2}, duration:Phaser.Math.Between(900,1800), delay:i*35, ease:'Linear', onComplete:()=>r.destroy() })
    }
  }

  goldenRain(W, H) {
    for (let i = 0; i < 20; i++) {
      const c = this.s.add.circle(Phaser.Math.Between(0,W), -20, Phaser.Math.Between(6,14), 0xFFD700).setDepth(19).setStrokeStyle(2,0xFFA500)
      this.s.tweens.add({ targets:c, y:H+30, x:c.x+Phaser.Math.Between(-60,60), alpha:{from:1,to:0}, duration:Phaser.Math.Between(1000,2000), delay:i*65, ease:'Linear', onComplete:()=>c.destroy() })
    }
  }

  duckTrail(x, y) {
    const r = this.s.add.circle(x, y, Phaser.Math.Between(3,7), 0xFFFFAA).setDepth(3).setAlpha(0.45)
    this.s.tweens.add({ targets:r, alpha:0, scaleX:0.2, scaleY:0.2, x:x-10, duration:180, ease:'Linear', onComplete:()=>r.destroy() })
  }
}
