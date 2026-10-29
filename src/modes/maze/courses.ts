import type { Wall } from '../../collision/geometry';
import type { MazeDefinition } from './MazeDefinition';
function boundary(width:number,height:number):Wall[]{
 return [
  {id:'north',x:0,y:0,width,height:24},
  {id:'south',x:0,y:height-24,width,height:24},
  {id:'west',x:0,y:24,width:24,height:height-48},
  {id:'east',x:width-24,y:24,width:24,height:height-48},
 ];
}
export const courses:readonly MazeDefinition[]=[
 {id:'initiation',version:1,title:'01 · Le détour',spawn:{a:{x:170,y:200},angle:0},exit:{x:770,y:120,width:250,height:240},walls:[
  ...boundary(1100,1040),{id:'turn',x:450,y:24,width:40,height:650},
 ]},
 {id:'precision',version:1,title:'02 · Les lacets',spawn:{a:{x:170,y:200},angle:0},exit:{x:1180,y:100,width:230,height:240},walls:[
  ...boundary(1500,1120),{id:'first',x:440,y:24,width:40,height:700},
  {id:'second',x:850,y:400,width:40,height:696},
 ]},
 {id:'choice',version:1,title:'03 · La bifurcation',spawn:{a:{x:170,y:520},angle:0},exit:{x:1120,y:410,width:240,height:240},walls:[
  ...boundary(1440,1040),{id:'island',x:520,y:280,width:340,height:480},
  {id:'detour',x:1000,y:780,width:40,height:236},
 ]},
];
