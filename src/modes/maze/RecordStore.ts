import type { MazeDefinition } from './MazeDefinition';
type StoragePort=Pick<Storage,'getItem'|'setItem'>;
const valid=(value:unknown):value is number=>typeof value==='number'&&Number.isFinite(value)&&value>0;
export class RecordStore {
 private memory=new Map<string,number>();
 constructor(private storage:StoragePort|null){}
 private key(maze:MazeDefinition):string{return `spin:maze:rules-v1:${maze.id}:v${maze.version}`;}
 get(maze:MazeDefinition):number|null {
  const key=this.key(maze),cached=this.memory.get(key);
  let stored:unknown;
  try{const raw=this.storage?.getItem(key);if(raw)stored=JSON.parse(raw);}catch{/* session-only fallback */}
  const best=valid(stored)?Math.min(cached??Infinity,stored):cached;
  if(best!==undefined)this.memory.set(key,best);
  return best??null;
 }
 submit(maze:MazeDefinition,elapsedMs:number):{bestMs:number;improved:boolean}{
  if(!valid(elapsedMs))throw new RangeError('Le temps doit être un nombre positif fini');
  const before=this.get(maze),improved=before===null||elapsedMs<before;
  const bestMs=improved?elapsedMs:before!;
  this.memory.set(this.key(maze),bestMs);
  if(improved)try{this.storage?.setItem(this.key(maze),JSON.stringify(bestMs));}catch{/* keep memory record */}
  return {bestMs,improved};
 }
}
