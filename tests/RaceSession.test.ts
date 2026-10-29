import {test} from 'node:test';import assert from 'node:assert/strict';
import {RaceSession} from '../src/modes/maze/RaceSession.ts';
test('ready, départ, fin figée et appels répétés',()=>{
 const s=new RaceSession();assert.equal(s.status,'ready');assert.equal(s.elapsedMs(9999),0);
 s.start(1000);s.start(2000);assert.equal(s.elapsedMs(2234),1234);s.finish(2234);s.finish(3000);s.start(4000);assert.equal(s.elapsedMs(9999),1234);assert.equal(s.status,'finished');
});
test('interruption fige le temps, interdit reprise et reset rétablit ready',()=>{
 const s=new RaceSession();s.interrupt();assert.equal(s.status,'ready');s.start(1000);s.elapsedMs(1500);s.interrupt();s.finish(3000);s.start(3000);assert.equal(s.status,'interrupted');assert.equal(s.elapsedMs(5000),500);s.reset();assert.equal(s.status,'ready');assert.equal(s.elapsedMs(9999),0);
});
