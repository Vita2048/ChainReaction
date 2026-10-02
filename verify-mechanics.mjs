import assert from 'node:assert/strict';
import fs from 'node:fs';
import {PX,PY,PZ,L,HR,GX,GY,strikerAngle} from './mechanics.js';
const s=JSON.parse(fs.readFileSync('assets/simulation.json'));
let minimumGap=Infinity;
for(let i=0;i<=3600;i++){
 const t=i/240,angle=strikerAngle(t,s.release,s.strike);
 const sphereMaxX=PX+L*Math.cos(angle)+HR;
 const gap=GX-.0375-sphereMaxX;
 assert(gap>=.0049,'Striker penetrates gong at '+t);
 assert(PY+L*Math.sin(angle)-HR>=.12,'Striker enters its base at '+t);
 minimumGap=Math.min(minimumGap,gap);
}
const hitAngle=strikerAngle(s.strike,s.release,s.strike);
assert(Math.abs((GX-.0375)-(PX+L*Math.cos(hitAngle)+HR)-.005)<1e-8);
assert(Math.abs(PY+L*Math.sin(hitAngle)-GY)<1e-8);
assert(s.trigger<s.release&&s.release<s.strike);
const i=Math.round(s.trigger*s.fps),a=s.frames[i][17],previous=s.frames[i-1][17];
assert(9.18+1.4*Math.sin(a)+.05*Math.cos(a)>=9.85);
assert(9.18+1.4*Math.sin(previous)+.05*Math.cos(previous)<9.85);
console.log(JSON.stringify({samples:3601,minimumGap,contactGap:.005,trigger:s.trigger,release:s.release,strike:s.strike,plateCentre:[GX,GY,PZ],result:'PASS'},null,2));
