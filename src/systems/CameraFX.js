export class CameraFX {
  constructor(scene) { this.s = scene; this.cam = scene.cameras.main; this._slow = false }
  shake(i=0.012, d=280)   { this.cam.shake(d, i) }
  flashRed(d=200)         { this.cam.flash(d, 255, 30, 30, false) }
  flashGold(d=350)        { this.cam.flash(d, 255, 215, 0, false) }
  zoomPulse(z=1.05, d=90) { this.s.tweens.add({ targets:this.cam, zoom:z, duration:d, yoyo:true, ease:'Quad.easeOut' }) }
  slowMotion(f=0.3, d=1200) {
    if (this._slow) return
    this._slow = true
    this.s.time.timeScale = f
    this.s.physics.world.timeScale = 1/f
    this.s.time.delayedCall(d, () => { this.s.time.timeScale=1; this.s.physics.world.timeScale=1; this._slow=false })
  }
}
