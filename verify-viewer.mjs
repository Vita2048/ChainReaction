import fs from 'node:fs';
import http from 'node:http';
import path from 'node:path';
import assert from 'node:assert/strict';
import puppeteer from 'puppeteer-core';

const root=process.cwd();
const server=http.createServer((req,res)=>{
  const file=path.join(root,decodeURIComponent(req.url.split('?')[0]));
  if(!file.startsWith(root)||!fs.existsSync(file)){res.writeHead(404);res.end();return;}
  let data=fs.readFileSync(file);
  if(file.endsWith('.html'))data=data.toString().replaceAll('https://unpkg.com/three@0.180.0/','/node_modules/three/').replace('poseAt(0); requestAnimationFrame(loop);','playing=false; window.inspectViewer={setTime:t=>time=t,poseAt,SIM,TRIP,LAST_REST,paddleAngle,dominoes,latch,striker,scene,camera,controls,E,DURATION,spiralBall,blueBall,launchStart,flightVelocity,flightDuration,gravity,funnelTop,seesaw,launcher,pendulum,blocks,finaleTiles,flag,counterweight,views,finalLever,T,retainingCradle,cradlePoints,cradleWire,cockedBob,weight}; poseAt(0); requestAnimationFrame(loop);');
  res.setHeader('Content-Type',file.endsWith('.html')?'text/html':'text/javascript');res.end(data);
});
await new Promise(r=>server.listen(0,'127.0.0.1',r));
let browser;
try{
  browser=await puppeteer.launch({executablePath:'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe',headless:true,args:['--no-sandbox']});
  const page=await browser.newPage();await page.setViewport({width:1200,height:900});
  const errors=[];page.on('pageerror',e=>errors.push(e.message));
  await page.goto(`http://127.0.0.1:${server.address().port}/chain-reaction-viewer.html`);
  await page.waitForFunction(()=>window.inspectViewer);
  const result=await page.evaluate(()=>{
    const v=window.inspectViewer;let minGap=Infinity,maxGap=0;
    for(let i=0;i<=3600;i++){
      const t=i/240;v.poseAt(t);const theta=-v.dominoes[17].rotation.z,phi=-v.latch.rotation.z;
      const x=v.TRIP.x+v.TRIP.top*Math.sin(phi)-v.TRIP.half*Math.cos(phi);
      const y=v.TRIP.y+v.TRIP.top*Math.cos(phi)+v.TRIP.half*Math.sin(phi);
      const gap=(x-9.18)*Math.cos(theta)-(y-.065)*Math.sin(theta)-.05;
      minGap=Math.min(minGap,gap);if(phi>0)maxGap=Math.max(maxGap,Math.abs(gap));
    }
    return {trigger:v.SIM.trigger,release:v.SIM.release,strike:v.SIM.strike,restAngle:v.LAST_REST,minGap,maxContactGap:maxGap};
  });
  assert.deepEqual(errors,[]);assert(result.minGap> -1e-8);assert(result.maxContactGap<1e-8);
  assert(result.trigger<result.release&&result.release<result.strike);
  const extension=await page.evaluate(()=>{
    const v=window.inspectViewer;const failures=[];
    const signature=t=>{v.poseAt(t);const a=[];v.scene.traverse(o=>a.push(...o.position.toArray(),...o.quaternion.toArray(),...o.scale.toArray()));return a;};
    for(let i=0;i<=4080;i++)if(!signature(i/120).every(Number.isFinite))failures.push('Non-finite pose at '+i/120);
    const end=signature(33);signature(0);const reset=signature(33);
    if(JSON.stringify(end)!==JSON.stringify(reset))failures.push('Pose depends on seek history');
    let maxJump=0;
    for(const at of [v.E.launch,v.E.land,v.E.paddle,v.E.pendulum]){v.poseAt(at-.00001);const a=v.blueBall.position.clone();v.poseAt(at+.00001);maxJump=Math.max(maxJump,a.distanceTo(v.blueBall.position));}
    v.poseAt(0);const ropeSum=v.flag.position.y+v.counterweight.position.y;
    v.poseAt(33);const ropeError=Math.abs(ropeSum-v.flag.position.y-v.counterweight.position.y);
    const raised=v.flag.position.y,remaining=v.finaleTiles.filter(d=>d.pivot.rotation.z> -1).length;
    v.scene.updateMatrixWorld(true);
    const boxes=v.blocks.map(b=>new v.T.Box3().setFromObject(b.mesh));
    for(let i=0;i<boxes.length;i++){
      if(boxes[i].min.y<-.01)failures.push('Wooden block below platform');
      for(let j=i+1;j<boxes.length;j++)if(boxes[i].intersectsBox(boxes[j]))failures.push('Overlapping settled blocks '+i+'/'+j);
    }
    const corner=new v.T.Vector3(-.36,.05,0).applyMatrix4(v.finalLever.matrixWorld),theta=-v.finaleTiles.at(-1).pivot.rotation.z;
    const leverContact=(16.8-corner.x)*Math.cos(theta)-(corner.y-.065)*Math.sin(theta)-.055;
    if(Math.abs(leverContact)>1e-6)failures.push('Final tile misses flag lever');
    const blockGap=v.finaleTiles[0].root.position.x-.055-(v.blocks[1].mesh.position.x+.2);
    if(Math.abs(blockGap)>1e-6)failures.push('Sliding block misses first return tile');
    v.poseAt(v.E.cup-.00001);const cupStart=v.spiralBall.position.clone();v.poseAt(v.E.cup+.00001);const cupJump=cupStart.distanceTo(v.spiralBall.position);
    return {failures,maxJump,cupJump,ropeError,raised,remaining,times:v.E};
  });
  assert.deepEqual(extension.failures,[]);assert(extension.maxJump<.001);assert(extension.cupJump<.001);assert(extension.ropeError<1e-8);assert(extension.raised>3);assert.equal(extension.remaining,0);
  const cradle=await page.evaluate(()=>{
    const v=window.inspectViewer;let minGap=Infinity,releaseGap=Infinity;
    for(let i=0;i<=720;i++){
      const t=v.E.paddle+i/120;v.poseAt(t);v.scene.updateMatrixWorld(true);
      const center=v.weight.getWorldPosition(new v.T.Vector3());
      for(const p of v.cradlePoints){const gap=p.clone().applyMatrix4(v.retainingCradle.matrixWorld).distanceTo(center)-.45-v.cradleWire;minGap=Math.min(minGap,gap);if(Math.abs(t-v.E.pendulum)<.001)releaseGap=Math.min(releaseGap,gap);}
    }
    v.poseAt(0);v.scene.updateMatrixWorld(true);const held=v.weight.getWorldPosition(new v.T.Vector3()).distanceTo(v.cockedBob);
    return {minGap,releaseGap,held,opening:v.cradlePoints[0].distanceTo(v.cradlePoints.at(-1))};
  });
  assert(cradle.minGap>=-.001,JSON.stringify(cradle));assert(cradle.releaseGap>.1);assert(cradle.held<1e-8);assert(cradle.opening>.6);
  await page.click('#bar [data-t="30"]');
  assert.equal(await page.$eval('#play',e=>e.textContent),'Play');
  assert.equal(await page.$eval('#time',e=>Number(e.value)),30);
  await page.click('#sound');assert.equal(await page.$eval('#sound',e=>e.textContent),'Sound on');await page.click('#sound');
  await page.click('[data-view="finale"]');
  assert.deepEqual(errors,[]);
  await page.evaluate(()=>{const v=window.inspectViewer;v.camera.position.set(10,6.7,6.4);v.controls.target.set(10.3,.65,.5);});
  for(const [name,t] of [['ready',0],['contact',result.release],['gong',result.strike],['rest',10]]){
    await page.evaluate(t=>{const v=window.inspectViewer;v.setTime(t);v.poseAt(t);},t);
    await new Promise(r=>setTimeout(r,150));
    await page.screenshot({path:`snapshots/viewer-${name}.png`});
  }
  for(const [name,t,view] of [['overview',0,'overview'],['spiral',12,'spiral'],['seesaw',16.2,'launch'],['launch',17.45,'launch'],['pendulum',19.2,'pendulum'],['impact',21.1,'pendulum'],['finale',31,'finale']]){
    await page.evaluate(({t,view})=>{const v=window.inspectViewer;v.setTime(t);v.poseAt(t);v.camera.position.set(...v.views[view].p);v.controls.target.set(...v.views[view].t);},{t,view});
    await new Promise(r=>setTimeout(r,120));await page.screenshot({path:`snapshots/extension-${name}.png`});
  }
  for(const [name,t] of [['held',18.85],['opening',19.05],['released',19.2]]){
    await page.evaluate(t=>{const v=window.inspectViewer;v.setTime(t);v.poseAt(t);v.camera.position.set(28,2.8,-1.6);v.controls.target.set(22.8,1.4,-1.6);},t);
    await new Promise(r=>setTimeout(r,120));await page.screenshot({path:`snapshots/cradle-${name}.png`});
  }
  console.log(JSON.stringify({result:'PASS',samples:3601,...result,extension,cradle},null,2));
}finally{await browser?.close();server.close();}




