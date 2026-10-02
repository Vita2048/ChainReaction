import fs from 'node:fs';
// Planar hinged domino model: gravity torque for uniform rods; contact impulses
// propagate at geometric contact angle. Collision response is art-directed.
const dt=1/240,N=18,H=1.4,spacing=.54,angles=Array(N).fill(0),omega=Array(N).fill(0),active=Array(N).fill(false),events=[];
const frames=[];let release=null;
for(let k=0;k<=3600;k++){
 const t=k*dt;
 if(t>=3.3&&!active[0]){active[0]=true;omega[0]=1.45;events.push({i:0,t:3.3});}
 for(let i=N-1;i>=0;i--){if(!active[i])continue;omega[i]+=3*9.81/(2*H)*Math.sin(angles[i])*dt;angles[i]+=omega[i]*dt;
 if(i<N-1&&angles[i]>=Math.asin((spacing-.10)/H)&&!active[i+1]){active[i+1]=true;omega[i+1]=Math.max(1.1,omega[i]*.80);omega[i]*=.70;events.push({i:i+1,t:+t.toFixed(4)});}
 const stop=i===N-1?Math.PI/2:Math.acos(.10/spacing);if(angles[i]>stop){angles[i]=stop;omega[i]=0;}
 if(i===N-1&&angles[i]>.50&&release===null)release=+t.toFixed(4);
 }
 // Keep each tile behind its neighbour's contact plane, preventing crossings.
 for(let i=N-2;i>=0;i--){const limit=angles[i+1]+Math.asin(Math.max(-1,Math.min(1,(spacing*Math.cos(angles[i+1])-.10)/H)));angles[i]=Math.min(angles[i],limit);}
 if(k%2===0)frames.push(angles.map(a=>+a.toFixed(6)));
}
const trigger=frames.findIndex(frame=>9.18+H*Math.sin(frame[17])+.05*Math.cos(frame[17])>=9.85)/120;
release=+(trigger+.10).toFixed(4);
const data={fps:120,frames,events,trigger,release,strike:Math.ceil((release+.38)*30)/30};
fs.writeFileSync('assets/simulation.json',JSON.stringify(data));fs.writeFileSync('assets/simulation.js','export default '+JSON.stringify(data)+';');console.log(JSON.stringify({events,release,strike:data.strike}));
