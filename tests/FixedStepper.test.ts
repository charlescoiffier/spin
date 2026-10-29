import {test} from 'node:test';import assert from 'node:assert/strict';
import {FixedStepper} from '../src/core/FixedStepper.ts';
import {SpinMotion} from '../src/core/SpinMotion.ts';
test('mêmes entrées horodatées à 30, 60 et 120 FPS',()=>{
 const run=(fps:number)=>{const s=new FixedStepper(),m=new SpinMotion(80,5);s.reset(0);[123,340,341,799].forEach(t=>s.enqueuePress(t));for(let i=1;i<=fps;i++)s.advance(i*1000/fps,()=>m.switchPivot(),dt=>m.update(dt));return m.snapshot();};
 assert.deepEqual(run(30),run(60));assert.deepEqual(run(60),run(120));
});
test('rattrapage 200 ms, interruption 251 ms et reset de file',()=>{
 const s=new FixedStepper();s.reset(0);let steps=0,presses=0;s.enqueuePress(10);
 assert.ok(s.advance(200,()=>presses++,()=>steps++));assert.equal(steps,48);assert.equal(presses,1);
 assert.equal(s.advance(451,()=>presses++,()=>steps++),false);assert.equal(steps,48);
 s.enqueuePress(500);s.reset(500);s.advance(510,()=>presses++,()=>{});assert.equal(presses,1);
});
