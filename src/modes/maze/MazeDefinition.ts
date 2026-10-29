import type { Point } from '../../core/SpinMotion';
import {getContacts, type Rect, type Wall} from '../../collision/geometry';
export interface MazeDefinition {
 id:string; version:number; title:string; walls:readonly Wall[];
 spawn:{a:Point;angle:number}; exit:Rect;
}
export function validateMaze(maze:MazeDefinition): string[] {
 const errors:string[]=[];
 if(!maze.id||!Number.isInteger(maze.version)||maze.version<1)errors.push('Identité ou version invalide');
 const validRect=(r:Rect)=>[r.x,r.y,r.width,r.height].every(Number.isFinite)&&r.width>0&&r.height>0;
 if(!validRect(maze.exit)||maze.exit.width<114||maze.exit.height<114)errors.push('Sortie invalide');
 if(new Set(maze.walls.map(w=>w.id)).size!==maze.walls.length)errors.push('Identifiants des murs dupliqués');
 if(maze.walls.some(w=>!validRect(w)||w.width<24||w.height<24))errors.push('Mur invalide');
 if(![maze.spawn.a.x,maze.spawn.a.y,maze.spawn.angle].every(Number.isFinite))errors.push('Départ invalide');
 if(errors.length)return errors;
 const a=maze.spawn.a,b={x:a.x+80*Math.cos(maze.spawn.angle),y:a.y+80*Math.sin(maze.spawn.angle)};
 if(getContacts(a,b,17,3.5,maze.walls).length)errors.push('Départ dans un mur');
 const e=maze.exit;
 if(maze.walls.some(w=>w.x<e.x+e.width&&w.x+w.width>e.x&&w.y<e.y+e.height&&w.y+w.height>e.y))errors.push('Sortie dans un mur');
 return errors;
}
