import * as C from 'cannon-es';
import fs from 'node:fs';
const w=new C.World({gravity:new C.Vec3(0,-9.81,0)});w.solver.iterations=25;
const mat=new C.Material('solid');w.addContactMaterial(new C.ContactMaterial(mat,mat,{friction:.5,restitution:.04}));
const floor=new C.Body({mass:0,material:mat,shape:new C.Plane()});floor.quaternion.setFromEuler(-Math.PI/2,0,0);w.addBody(floor);
const bodies=[];for(let i=0;i<18;i++){const b=new C.Body({mass:.3,material:mat,shape:new C.Box(new C.Vec3(.05,.7,.37)),position:new C.Vec3(i*.54,.705,0),linearDamping:.03,angularDamping:.025});w.addBody(b); bodies.push(b);}
const ball=new C.Body({mass:1.4,material:mat,shape:new C.Sphere(.38),position:new C.Vec3(-.55,1.05,0),velocity:new C.Vec3(3.1,0,0),angularVelocity:new C.Vec3(0,0,-8.15)});w.addBody(ball);
const frames=[],events=[];let seen=new Set();
for(let k=0;k<=1440;k++){const time=k/120;const poses=[ball,...bodies].map(b=>[...b.position.toArray(),...b.quaternion.toArray()].map(x=>+x.toFixed(5)));frames.push(poses);bodies.forEach((b,i)=>{if(!seen.has(i)&&Math.abs(b.quaternion.z)>.18){seen.add(i);events.push({i,t:+(time+3.2).toFixed(4)});}});w.step(1/240);w.step(1/240);}
const data={fps:120,offset:3.2,frames,events,release:events.find(e=>e.i===17)?.t+.17};
fs.writeFileSync('assets/simulation.json',JSON.stringify(data));fs.writeFileSync('assets/simulation.js','export default '+JSON.stringify(data)+';');console.log(JSON.stringify({events,release:data.release}));





