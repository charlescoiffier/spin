import Phaser from 'phaser';
import type { Wall } from '../collision/geometry';
export function createTestEnvironment(scene: Phaser.Scene): Wall[] {
 const g=scene.add.graphics(); const extent=4000;
 g.lineStyle(1,0x658080,.13);
 for(let n=-extent;n<=extent;n+=80){g.lineBetween(n,-extent,n,extent);g.lineBetween(-extent,n,extent,n);}
 g.lineStyle(1,0x8faeae,.28);
 g.lineBetween(-extent,0,extent,0);g.lineBetween(0,-extent,0,extent);
 for(let y=-3200;y<=3200;y+=640) for(let x=-3200;x<=3200;x+=640){
  g.lineStyle(2,0x739a9a,.5).strokeCircle(x,y,6);
  scene.add.text(x+14,y+12,`${x} / ${y}`,{fontFamily:'monospace',fontSize:'11px',color:'#526c77'});
 }
 const walls: Wall[]=[
  {id:'left',x:-360,y:-220,width:90,height:260},
  {id:'bottom',x:-160,y:360,width:500,height:40},
  {id:'right',x:340,y:100,width:40,height:300},
  {id:'top',x:100,y:-300,width:350,height:40},
 ];
 walls.forEach(w=>{
  g.fillStyle(0x25323e).fillRect(w.x,w.y,w.width,w.height);
  g.lineStyle(2,0x8ba8b8).strokeRect(w.x,w.y,w.width,w.height);
 });
 scene.add.text(-22,-64,'ORIGINE',{fontFamily:'monospace',fontSize:'11px',color:'#9ab3bb'});
 return walls;
}
