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
  if(file.endsWith('.html'))data=data.toString().replaceAll('https://unpkg.com/three@0.180.0/','/node_modules/three/').replace('poseAt(0); requestAnimationFrame(loop);','playing=false; window.inspectGong={setTime:t=>time=t,poseAt,SIM,E,T,scene,camera,controls,gong,gongHanger,lifter,stopCurve,stopRadius,spiralBall}; poseAt(0); requestAnimationFrame(loop);');
  res.setHeader('Content-Type',file.endsWith('.html')?'text/html':'text/javascript');res.end(data);
});
await new Promise(r=>server.listen(0,'127.0.0.1',r));
let browser;
try{
  browser=await puppeteer.launch({executablePath:'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe',headless:true,args:['--no-sandbox']});
  const page=await browser.newPage();await page.setViewport({width:1100,height:1000});
  const errors=[];page.on('pageerror',e=>errors.push(e.message));
  await page.goto(`http://127.0.0.1:${server.address().port}/chain-reaction-viewer.html`);
  await page.waitForFunction(()=>window.inspectGong);
  const result=await page.evaluate(()=>{
    const v=window.inspectGong,point=()=>v.stopCurve.getPoint(1).applyMatrix4(v.lifter.matrixWorld);
    const pose=t=>{v.poseAt(t);v.scene.updateMatrixWorld(true);};
    pose(0);const held=v.spiralBall.position.clone(),ready=point(),hinge=v.gongHanger.position.clone();
    const initialGap=ready.distanceTo(held)-.22-v.stopRadius;
    pose(v.SIM.strike-.001);const before=v.gongHanger.rotation.z;
    pose(v.SIM.strike+.01);const after=v.gongHanger.rotation.z;
    let minGap=Infinity,maxHeldDrift=0;
    for(let i=0;i<=240;i++){
      const t=v.E.gate+i/120;pose(t);
      if(t<=v.E.roll)maxHeldDrift=Math.max(maxHeldDrift,v.spiralBall.position.distanceTo(held));
      for(let j=0;j<=160;j++){
        const p=v.stopCurve.getPoint(j/160).applyMatrix4(v.lifter.matrixWorld);
        minGap=Math.min(minGap,p.distanceTo(v.spiralBall.position)-.22-v.stopRadius);
      }
    }
    pose(v.E.roll);const lowered=point(),released=lowered.toArray();
    pose(v.E.roll+.2);const travel=v.spiralBall.position.distanceTo(held);
    pose(0);pose(v.E.roll);const rewindError=point().distanceTo(new v.T.Vector3(...released));
    return {initialGap,before,after,minGap,maxHeldDrift,drop:ready.y-lowered.y,travel,rewindError,hingeDrift:v.gongHanger.position.distanceTo(hinge),sharedHinge:v.lifter.parent===v.gongHanger&&v.gong.parent===v.gongHanger};
  });
  assert.deepEqual(errors,[]);assert(Math.abs(result.initialGap)<1e-8);
  assert.equal(result.before,0);assert(result.after<0);assert(result.sharedHinge);
  assert(result.minGap>-.00001);assert.equal(result.maxHeldDrift,0);
  assert(result.drop>.35);assert(result.travel>.01);assert.equal(result.rewindError,0);assert.equal(result.hingeDrift,0);
  for(const [name,offset] of [['held',-.05],['tilting',.225],['released',.55]]){
    await page.evaluate(offset=>{const v=window.inspectGong;const t=v.SIM.strike+offset;v.setTime(t);v.poseAt(t);v.camera.position.set(11.2,5.4,-7.7);v.controls.target.set(12.9,2.9,1.05);},offset);
    await new Promise(r=>setTimeout(r,150));await page.screenshot({path:`snapshots/gong-${name}.png`});
  }
  console.log(JSON.stringify({result:'PASS',...result},null,2));
}finally{await browser?.close();server.close();}
