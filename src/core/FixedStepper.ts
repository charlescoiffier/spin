/** Absolute monotone timestamps keep input ordering independent of render FPS. */
export class FixedStepper {
 static readonly seconds = 1/240;
 private origin=0;
 private last=0;
 private tick=0;
 private presses: number[]=[];
 reset(nowMs: number): void {this.origin=nowMs;this.last=nowMs;this.tick=0;this.presses=[];}
 enqueuePress(nowMs: number): void {this.presses.push(nowMs);this.presses.sort((a,b)=>a-b);}
 advance(nowMs: number,onPress:()=>void,onStep:(dt:number,stepTimeMs:number)=>void): boolean {
  if(nowMs-this.last>250 || nowMs<this.last)return false;
  this.last=nowMs;
  const target=Math.floor((nowMs-this.origin)/(1000/240)+1e-8);
  while(this.tick<target){
   const end=this.origin+(++this.tick)*1000/240;
   while(this.presses.length && this.presses[0]<=end+1e-8){this.presses.shift();onPress();}
   onStep(FixedStepper.seconds,end);
  }
  return true;
 }
}
