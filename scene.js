import * as T from 'three';
import {RoundedBoxGeometry} from 'three/addons/geometries/RoundedBoxGeometry.js';
import {RoomEnvironment} from 'three/addons/environments/RoomEnvironment.js';
import {EffectComposer} from 'three/addons/postprocessing/EffectComposer.js';
import {RenderPass} from 'three/addons/postprocessing/RenderPass.js';
import {UnrealBloomPass} from 'three/addons/postprocessing/UnrealBloomPass.js';
import {OutputPass} from 'three/addons/postprocessing/OutputPass.js';
import sim from './assets/simulation.js';
import {PX,PY,PZ,L,HR,GX,GY,initial,hit,strikerAngle} from './mechanics.js';
const canvas=document.querySelector('#world'),renderer=new T.WebGLRenderer({canvas,antialias:true,alpha:false,preserveDrawingBuffer:true});
renderer.setSize(1920,1080,false);renderer.setPixelRatio(1);renderer.shadowMap.enabled=true;renderer.shadowMap.type=T.PCFSoftShadowMap;renderer.toneMapping=T.ACESFilmicToneMapping;renderer.toneMappingExposure=.85;
const scene=new T.Scene();scene.background=new T.Color('#080d19');scene.fog=new T.FogExp2('#080d19',.019);
const pmrem=new T.PMREMGenerator(renderer);scene.environment=pmrem.fromScene(new RoomEnvironment(),.04).texture;scene.environmentIntensity=.6;
const camera=new T.PerspectiveCamera(39,1920/1080,.08,100);
const composer=new EffectComposer(renderer);composer.addPass(new RenderPass(scene,camera));composer.addPass(new UnrealBloomPass(new T.Vector2(1920,1080),.22,.35,1.5));composer.addPass(new OutputPass());
const mat=(color,metalness=0,roughness=.35)=>new T.MeshStandardMaterial({color,metalness,roughness});
const dark=mat('#172332',.6,.3),edge=mat('#34465d',.8,.2),brass=mat('#e8b85c',.85,.24),chrome=mat('#e8f4ff',1,.10),black=mat('#10151c',.5,.28);
const cyan=new T.MeshStandardMaterial({color:'#75d7ff',emissive:'#39a5ff',emissiveIntensity:2,roughness:.2,metalness:.3});
function mesh(geo,material,x=0,y=0,z=0,parent=scene){const m=new T.Mesh(geo,material);m.position.set(x,y,z);m.castShadow=true;m.receiveShadow=true;parent.add(m);return m;}
function box(w,h,d,m,x,y,z,parent=scene,r=.06){return mesh(new RoundedBoxGeometry(w,h,d,3,r),m,x,y,z,parent);}
function rod(a,b,r,m,parent=scene){const aa=new T.Vector3(...a),bb=new T.Vector3(...b),delta=bb.clone().sub(aa);const o=mesh(new T.CylinderGeometry(r,r,delta.length(),12),m,0,0,0,parent);o.position.copy(aa.add(bb).multiplyScalar(.5));o.quaternion.setFromUnitVectors(new T.Vector3(0,1,0),delta.normalize());return o;}
function tube(curve,r,m){return mesh(new T.TubeGeometry(curve,220,r,10,false),m);}
function light(color,power,pos,target){const l=new T.SpotLight(color,power,70,.75,.6,1.4);l.position.set(...pos);l.target.position.set(...target);scene.add(l,l.target);return l;}
scene.add(new T.HemisphereLight('#b7d6ff','#1e2230',.65));
const key=light('#ffe8c6',220,[1,13,6],[3,0,0]);key.castShadow=true;key.shadow.mapSize.set(2048,2048);key.shadow.bias=-.00015;key.shadow.normalBias=.025;
light('#68a9ff',130,[-4,7,-6],[0,1,0]);light('#ffca75',220,[13,9,-3],[10,2,0]);
mesh(new T.PlaneGeometry(200,200),mat('#0c1422',.15,.65),0,-.58,0).rotation.x=-Math.PI/2;
box(23,.5,4.4,dark,2.3,-.3,0,scene,.2);box(22.9,.045,4.3,edge,2.3,-.035,0,scene,.09);
for(const z of [-2.05,2.05])rod([-8.8,-.06,z],[13.55,-.06,z],.019,brass);
for(let x=-8;x<=13;x+=1.3)for(const z of [-1.85,1.85]){const bolt=mesh(new T.CylinderGeometry(.038,.038,.02,12),chrome,x,.0,z);box(.032,.009,.009,black,x,.015,z,scene,.002);}
// Curving twin-rail descent, ending at the height of the first domino impact.
const track=new T.CatmullRomCurve3([new T.Vector3(-8,3.0,-.6),new T.Vector3(-7.25,2.9,.6),new T.Vector3(-5.6,2.35,.8),new T.Vector3(-4.1,1.7,-.6),new T.Vector3(-2.3,1.12,-.7),new T.Vector3(-.46,1.05,0)]);
const railY=.325,railZ=.205;
for(const s of [-1,1]){const pts=[];for(let j=0;j<=140;j++){const p=track.getPointAt(j/140),tan=track.getTangentAt(j/140);const side=new T.Vector3(-tan.z,0,tan.x).normalize();p.addScaledVector(side,s*railZ);p.y-=railY;pts.push(p);}tube(new T.CatmullRomCurve3(pts),.046,brass);}
for(let j=0;j<=16;j++){const p=track.getPointAt(j/16),v=track.getTangentAt(j/16),side=new T.Vector3(-v.z,0,v.x).normalize();const a=p.clone().addScaledVector(side,-.27),b=p.clone().addScaledVector(side,.27);a.y-=railY;b.y-=railY;rod(a.toArray(),b.toArray(),.035,edge);if(j%2===0){rod([p.x,.05,p.z],[p.x,p.y-.36,p.z],.055,edge);box(.43,.06,.42,black,p.x,.04,p.z);}}
const ball=mesh(new T.SphereGeometry(.38,48,32),chrome);
const seam=new T.Mesh(new T.TorusGeometry(.379,.007,6,80),brass);seam.rotation.x=Math.PI/2;ball.add(seam);
// Hinged tiles retain their contact plane and their edges visibly sit on pivots.
const dominoes=[],palette=['#ff6854','#ff9d4d','#ffc857','#96d26c','#35c8b4','#517cff'];
for(let i=0;i<18;i++){const pivot=new T.Group();pivot.position.set(i*.54,.065,0);scene.add(pivot);
 const col=new T.Color(palette[Math.floor(i/3)]);const m=new T.MeshPhysicalMaterial({color:col,metalness:.26,roughness:.24,clearcoat:.9,clearcoatRoughness:.12});
 box(.1,1.4,.74,m,0,.7,0,pivot,.035);
 for(const z of [-.34,.34])rod([0,.08,z],[0,1.32,z],.008,brass,pivot);
 for(let k=0;k<3;k++)mesh(new T.SphereGeometry(.029,10,8),brass,-.057,.42+k*.27,0,pivot).scale.set(.2,1,1);
 rod([i*.54,.065,-.49],[i*.54,.065,.49],.037,brass);
 for(const z of [-.49,.49])box(.19,.13,.12,black,i*.54,.065,z);
 dominoes.push(pivot);
}
// Floor-mounted torsion-spring hammer. The last domino presses a rigid
// trip paddle; a round-bar hook (extension of the latch axle) lifts off the
// yellow catch bar on the cocked striker arm.
// Contact geometry and rebound live in mechanics.js and are numerically checked.
box(2.7,.12,1.16,black,10.1,.06,PZ);
for(const z of [PZ-.44,PZ+.44]){
 box(.4,.44,.18,edge,PX,.24,z);
 rod([PX,PY,z-.12],[PX,PY,z+.12],.105,brass);
 for(const x of [9.04,11.18])mesh(new T.CylinderGeometry(.055,.055,.03,12),chrome,x,.135,z);
}
rod([PX,PY,PZ-.65],[PX,PY,PZ+.65],.065,chrome);
// Two visibly wound torsion springs with anchored and moving tangs.
for(const sign of [-1,1]){
 const points=[];for(let j=0;j<=220;j++){const u=j/220,a=u*Math.PI*2*7;points.push(new T.Vector3(PX+.13*Math.cos(a),PY+.13*Math.sin(a),PZ+sign*(.12+.28*u)));}
 tube(new T.CatmullRomCurve3(points),.022,brass);
 rod([PX+.13,PY,PZ+sign*.4],[PX+.2,.14,PZ+sign*.4],.022,brass);
}
const striker=new T.Group();striker.position.set(PX,PY,PZ);scene.add(striker);
box(L-.18,.09,.12,brass,(L-.18)/2,0,0,striker,.03);
const hammer=mesh(new T.SphereGeometry(HR,40,28),chrome,L,0,0,striker);
for(const sign of [-1,1])rod([.13,0,sign*.12],[.44,0,sign*.12],.022,brass,striker);
// Short yellow catch bar (same brass as striker arm), protruding only on the hook
// side. Shifted toward the hammer end. The round hook fingertip catches its top
// edge while cocked; it swings free with the striker after release.
box(.10,.09,.35,brass,1.30,-.02,.155,striker,.03);
// Pivoted trip lever: paddle in domino lane, transverse axle, round-bar release
// hook (chrome extension of the axle) catching the yellow catch bar.
const latch=new T.Group();latch.position.set(9.45,.18,PZ);scene.add(latch);
rod([0,0,-1.05],[0,0,.26],.045,chrome,latch);
rod([0,0,-PZ],[.45,.65,-PZ],.055,brass,latch);
box(.10,.55,.50,brass,.45,.90,-PZ,latch,.035);
// One continuous ROUND bar: low run near the base, bend up into a vertical post
// beside the striker, fingertip over the top edge of the catch bar.
rod([0,0,.26],[.11,0,.26],.032,chrome,latch);
mesh(new T.SphereGeometry(.04,16,12),chrome,0,0,.26,latch);
mesh(new T.SphereGeometry(.032,16,12),chrome,.11,0,.26,latch);
rod([.11,0,.26],[.11,.28,.26],.030,chrome,latch);
mesh(new T.SphereGeometry(.03,16,12),chrome,.11,.28,.26,latch);
rod([.11,.28,.26],[-.03,.28,.26],.026,chrome,latch);
for(const z of [PZ-.15,PZ+.15])box(.18,.23,.10,edge,9.45,.115,z);
const gong=new T.Group();gong.position.set(GX,GY,PZ);gong.rotation.y=Math.PI/2;scene.add(gong);
const gongMat=new T.MeshStandardMaterial({color:'#e8b85c',metalness:.93,roughness:.26,emissive:'#f9ab30',emissiveIntensity:0});
const disc=mesh(new T.CylinderGeometry(1.02,1.02,.075,96),gongMat,0,0,0,gong);disc.rotation.x=Math.PI/2;
mesh(new T.SphereGeometry(.27,32,20),brass,0,0,.06,gong).scale.z=.35;
const rings=[];for(let i=0;i<6;i++){const r=.34+i*.12;for(const side of [-1,1]){const ring=mesh(new T.TorusGeometry(r,.009,8,100),i===5?cyan:brass,0,0,side*.047,gong);rings.push(ring);}}
for(const z of [PZ-1.12,PZ+1.12]){rod([GX,0,z],[GX,3.0,z],.07,brass);box(.30,.12,.30,black,GX,.05,z);}
rod([GX,3.0,PZ-1.15],[GX,3.0,PZ+1.15],.075,brass);
for(const z of [PZ-.65,PZ+.65]){
 rod([GX,3.0,z],[GX,GY+.78,z],.035,edge);
 const shackle=mesh(new T.TorusGeometry(.072,.019,8,24),chrome,GX,GY+.78,z);shackle.rotation.y=Math.PI/2;
}
const flare=new T.PointLight('#ffc366',0,7);flare.position.set(GX+.6,GY+.4,PZ+.4);scene.add(flare);
const waves=[];for(let i=0;i<3;i++){const m=new T.MeshBasicMaterial({color:'#ffc76c',transparent:true,opacity:0,depthWrite:false});const o=mesh(new T.TorusGeometry(1,.009,6,100),m,GX+.08,GY,PZ);o.rotation.y=Math.PI/2;waves.push(o);}
const clamp=(x,a=0,b=1)=>Math.max(a,Math.min(b,x)),smooth=x=>{x=clamp(x);return x*x*(3-2*x);};
const camKeys=[
 {t:0,p:[-5.3,4.1,5.4],l:[-7.0,2.45,0],f:38},
 {t:2.4,p:[-.9,3.0,5.1],l:[-2.4,1.1,0],f:40},
 {t:3.45,p:[1.0,2.2,5.3],l:[.5,.8,0],f:39},
 {t:6.45,p:[8.2,3.0,5.6],l:[7.2,.9,0],f:40},
 {t:7.1,p:[8.6,3.5,6.2],l:[10.1,.72,.55],f:40},
 {t:7.8,p:[9.3,3.4,6.5],l:[10.7,1.15,.75],f:40},
 {t:9.0,p:[10.2,3.4,7.0],l:[11.0,1.25,.75],f:40},
 {t:10.5,p:[14.5,4.2,8.5],l:[10.9,1.35,.65],f:42},
 {t:15,p:[9,12,22],l:[3,1.1,0],f:43}
];
function renderAt(time){const t=clamp(time,0,15);
 if(t<=3.3){const u=clamp(Math.pow(t/3.3,1.25));ball.position.copy(track.getPointAt(u));ball.rotation.z=-u*track.getLength()/.38;}
 else{const q=t-3.3;ball.position.set(-.46-Math.min(.9,q*.35),Math.max(.385,1.05-1.6*q*q),Math.min(1.25,q*.37));ball.rotation.z=-track.getLength()/.38+q;}
 const f=t*sim.fps,a=Math.min(sim.frames.length-1,Math.floor(f)),b=Math.min(a+1,sim.frames.length-1);dominoes.forEach((p,i)=>p.rotation.z=-(sim.frames[a][i]+(sim.frames[b][i]-sim.frames[a][i])*(f-a)));
 latch.rotation.z=-.48*smooth((t-sim.trigger)/.13);
 striker.rotation.z=strikerAngle(t,sim.release,sim.strike);
 const q=Math.max(0,t-sim.strike),impact=t>=sim.strike?Math.exp(-q*2.8):0;
 gongMat.emissiveIntensity=impact*.8;flare.intensity=impact*24;
 waves.forEach((o,i)=>{const p=(t-sim.strike-i*.18);o.scale.setScalar(1+Math.max(0,p)*1.15);o.material.opacity=p>=0&&p<1.4?.38*(1-p/1.4):0;});
 let k=0;while(k<camKeys.length-2&&t>camKeys[k+1].t)k++;const c=camKeys[k],d=camKeys[k+1],u=smooth((t-c.t)/(d.t-c.t));
 camera.position.fromArray(c.p).lerp(new T.Vector3(...d.p),u);const target=new T.Vector3(...c.l).lerp(new T.Vector3(...d.l),u);camera.lookAt(target);camera.fov=c.f+(d.f-c.f)*u;camera.updateProjectionMatrix();composer.render();
}
window.addEventListener('hf-seek',e=>renderAt(e.detail.time));
const driver={time:0};const tl=gsap.timeline({paused:true});tl.to(driver,{time:15,duration:15,ease:'none',onUpdate:()=>renderAt(driver.time)},0);tl.fromTo('#world',{opacity:0},{opacity:1,duration:.3,ease:'power1.out'},0);tl.to('#world',{opacity:0,duration:.5,ease:'power1.in'},14.5);window.__timelines=window.__timelines||{};window.__timelines['chain-reaction']=tl;
if(window.__hfForceTimelineRebind)window.__hfForceTimelineRebind();
renderAt(window.__hfThreeTime||0);



