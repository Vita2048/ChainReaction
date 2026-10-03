// Camera staging for the full 1080p composition. Mechanisms come from the viewer.
const camKeys=[
  {t:0,p:[-5.3,4.1,6.4],l:[-7,2.1,0]},
  {t:2.5,p:[-.9,3,6.4],l:[-2.4,1.1,0]},
  {t:3.4,p:[1,2.8,7.2],l:[.5,.8,0]},
  {t:6.1,p:[7.2,3.2,7.4],l:[6.5,1,0]},
  {t:7.1,p:[10.8,5.3,10],l:[12.1,2.1,.8]},
  {t:8.2,p:[10.8,5.3,10],l:[12.1,2.1,.8]},
  {t:9.2,p:[18.7,7.8,10.5],l:[15.5,2.4,.8]},
  {t:13.5,p:[18.7,7.8,10.5],l:[15.5,2.4,.8]},
  {t:15.4,p:[20.2,4.7,8.5],l:[19.4,1.4,-1.6]},
  {t:18.25,p:[20.2,4.7,8.5],l:[19.4,1.4,-1.6]},
  {t:18.9,p:[27.3,5.3,10],l:[25.1,1.8,-1.6]},
  {t:21.7,p:[27.3,5.3,10],l:[25.1,1.8,-1.6]},
  {t:23,p:[29.6,7.5,12.5],l:[27.5,1.2,2.6]},
  {t:25,p:[25,6.8,13],l:[24,1.2,3.8]},
  {t:27,p:[20.5,6.2,12.5],l:[20,1.4,4.1]},
  {t:28.2,p:[16.5,5.2,12.3],l:[16.2,1.8,4.1]},
  {t:31,p:[16.5,5.2,12.3],l:[16.2,1.8,4.1]},
  {t:34,p:[16.5,5.8,14],l:[16.2,1.8,4.1]}
];
function renderAt(time){
  const t=clamp(time,0,DURATION);poseAt(t);
  let k=0;while(k<camKeys.length-2&&t>camKeys[k+1].t)k++;
  const a=camKeys[k],b=camKeys[k+1],u=smooth((t-a.t)/(b.t-a.t));
  camera.position.fromArray(a.p).lerp(vec(b.p),u);
  camera.lookAt(vec(a.l).lerp(vec(b.l),u));renderer.render(scene,camera);
}
window.addEventListener('hf-seek',e=>renderAt(e.detail.time));
const driver={time:0},tl=gsap.timeline({paused:true});
tl.to(driver,{time:DURATION,duration:DURATION,ease:'none',onUpdate:()=>renderAt(driver.time)},0);
window.__timelines=window.__timelines||{};window.__timelines['chain-reaction']=tl;
if(window.__hfForceTimelineRebind)window.__hfForceTimelineRebind();
renderAt(window.__hfThreeTime||0);
