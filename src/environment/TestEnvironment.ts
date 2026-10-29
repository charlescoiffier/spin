import Phaser from 'phaser';
export function createTestEnvironment(scene: Phaser.Scene): void {
 const g=scene.add.graphics(); const extent=4000;
 g.lineStyle(1,0x658080,.13);
 for(let n=-extent;n<=extent;n+=80){g.lineBetween(n,-extent,n,extent);g.lineBetween(-extent,n,extent,n);}
 g.lineStyle(1,0x8faeae,.28);
 g.lineBetween(-extent,0,extent,0);g.lineBetween(0,-extent,0,extent);
 for(let y=-3200;y<=3200;y+=640) for(let x=-3200;x<=3200;x+=640){
  g.lineStyle(2,0x739a9a,.5).strokeCircle(x,y,6);
  scene.add.text(x+14,y+12,`${x} / ${y}`,{fontFamily:'monospace',fontSize:'11px',color:'#526c77'});
 }
 const obstacles=[[-360,-220,90,160],[380,190,160,70],[-160,460,200,70],[610,-330,100,150],[-720,180,110,110]];
 obstacles.forEach(([x,y,w,h])=>{
  g.fillStyle(0x25323e,.9).fillRoundedRect(x,y,w,h,10);
  g.lineStyle(2,0x597080,.8).strokeRoundedRect(x,y,w,h,10);
 });
 g.lineStyle(2,0x806951,.7).strokeTriangle(280,-270,390,-440,500,-270);
 g.lineStyle(2,0x597080,.8).strokeCircle(-480,480,70);
 scene.add.text(-22,-64,'ORIGINE',{fontFamily:'monospace',fontSize:'11px',color:'#9ab3bb'});
}
