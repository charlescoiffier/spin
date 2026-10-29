import {test} from 'node:test';import assert from 'node:assert/strict';
import {getContacts,containsDisk} from '../src/collision/geometry.ts';
const walls=[{id:'wall',x:0,y:0,width:24,height:100}];
test('disque face, tangence, coin et marge de séparation',()=>{
 assert.equal(getContacts({x:-17,y:40},{x:-80,y:40},17,3.5,walls).length,1);
 assert.equal(getContacts({x:-18,y:40},{x:-80,y:40},17,3.5,walls).length,0);
 assert.equal(getContacts({x:-18,y:40},{x:-80,y:40},17,3.5,walls,1).length,1);
 assert.equal(getContacts({x:-10,y:-10},{x:-80,y:-50},17,3.5,walls).length,1);
 const c=getContacts({x:-16,y:40},{x:-80,y:40},17,3.5,walls)[0];assert.ok(c.normal.x<0);assert.ok(c.depth>0);
});
test('barre traverse le mur avec ses deux extrémités libres',()=>{
 assert.equal(getContacts({x:-50,y:40},{x:80,y:40},17,3.5,walls).length,1);
 assert.equal(getContacts({x:-3,y:-40},{x:-3,y:140},1,3.5,walls).length,1);
 assert.equal(getContacts({x:-4,y:-40},{x:-4,y:140},1,3.5,walls).length,0);
 assert.equal(getContacts({x:-40,y:-40},{x:60,y:140},1,3.5,walls).length,1);
});
test('segment nul, ordre déterministe et translation du monde',()=>{
 const a={x:-10,y:40};const list=[{...walls[0],id:'z'},{...walls[0],id:'a'}];
 const contacts=getContacts(a,a,17,3.5,list);assert.deepEqual(contacts.map(c=>c.wallId),['a','z']);
 const moved=getContacts({x:a.x+1000,y:a.y-500},{x:a.x+1000,y:a.y-500},17,3.5,list.map(w=>({...w,x:w.x+1000,y:w.y-500})));
 assert.deepEqual(moved,contacts);
});
test('sortie exige un disque entièrement inclus',()=>{
 const r={x:0,y:0,width:100,height:100};assert.ok(containsDisk(r,{x:17,y:17},17));assert.ok(!containsDisk(r,{x:16,y:17},17));
});
