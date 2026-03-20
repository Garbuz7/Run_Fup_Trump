export class GlowFX {
  static flashHalo(scene, x, y, color=0xFFD700, radius=40) {
    const g = scene.add.graphics().setDepth(13)
    for (let i=3; i>0; i--) { g.fillStyle(color, 0.05*i); g.fillCircle(0,0,radius*(1+i*0.5)) }
    g.fillStyle(color, 0.18); g.fillCircle(0,0,radius)
    g.x=x; g.y=y
    scene.tweens.add({ targets:g, scaleX:3, scaleY:3, alpha:0, duration:340, ease:'Power2', onComplete:()=>g.destroy() })
  }
}
