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
  if(file.endsWith('.html'))data=data.toString().replaceAll('https://unpkg.com/three@0.180.0/','/node_modules/three/').replace('poseAt(0); requestAnimationFrame(loop);','playing=false; window.inspectLaunch={setTime:t=>time=t,poseAt,E,T,scene,camera,controls,blueBall,launcher,flag,funnelTop,flightVelocity,gravity}; poseAt(0); requestAnimationFrame(loop);');
  res.setHeader('Content-Type',file.endsWith('.html')?'text/html':'text/javascript');res.end(data);
});
await new Promise(r=>server.listen(0,'127.0.0.1',r));
let browser;
try{
  browser=await puppeteer.launch({executablePath:'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe',headless:true,args:['--no-sandbox']});
  const page=await browser.newPage();await page.setViewport({width:1100,height:850});
  const errors=[];page.on('pageerror',e=>errors.push(e.message));
  await page.goto(`http://127.0.0.1:${server.address().port}/chain-reaction-viewer.html`);
  await page.waitForFunction(()=>window.inspectLaunch);
  const result=await page.evaluate(()=>{
    const v=window.inspectLaunch,h=1e-5;
    const at=t=>{v.poseAt(t);return v.blueBall.position.clone();};
    const p=at(v.E.launch),before=p.clone().sub(at(v.E.launch-h)).divideScalar(h),after=at(v.E.launch+h).sub(p).divideScalar(h);
    const arrivalGap=at(v.E.land-h).distanceTo(v.funnelTop);
    let horizontalDrift=0,accelerationError=0;
    for(let t=v.E.launch+.01;t<v.E.land-.01;t+=.02){
      const a=at(t-h),b=at(t),c=at(t+h),speed=c.clone().sub(a).divideScalar(2*h);
      horizontalDrift=Math.max(horizontalDrift,Math.abs(speed.x-v.flightVelocity.x));
      accelerationError=Math.max(accelerationError,Math.abs((c.y-2*b.y+a.y)/(h*h)+v.gravity));
    }
    const mid=(v.E.launch+v.E.land)/2,expected=at(mid);at(0);const rewindError=at(mid).distanceTo(expected);
    const labels=[];v.scene.traverse(o=>{if(o.material?.map?.isCanvasTexture)labels.push(o);});
    v.poseAt(0);const flagStart=v.flag.position.y;v.poseAt(34);
    return {speedBefore:before.length(),speedAfter:after.length(),velocityJump:before.distanceTo(after),arrivalGap,horizontalDrift,accelerationError,rewindError,labelCount:labels.length,onlyFlag:labels[0]===v.flag,flagTravel:v.flag.position.y-flagStart,gravity:v.gravity};
  });
  assert.deepEqual(errors,[]);assert(result.velocityJump<.001,JSON.stringify(result));
  assert(result.arrivalGap<.001);assert(result.horizontalDrift<1e-7);assert(result.accelerationError<.0001);
  assert.equal(result.rewindError,0);assert.equal(result.labelCount,1);assert(result.onlyFlag);assert(result.flagTravel>2);
  for(const [name,offset] of [['before',-.10],['release',0],['flight',.45]]){
    await page.evaluate(offset=>{const v=window.inspectLaunch,t=v.E.launch+offset;v.setTime(t);v.poseAt(t);v.camera.position.set(20.3,4.2,6);v.controls.target.set(20.3,1.2,-1.6);},offset);
    await new Promise(r=>setTimeout(r,150));await page.screenshot({path:`snapshots/launch-${name}.png`});
  }
  console.log(JSON.stringify({result:'PASS',...result},null,2));
}finally{await browser?.close();server.close();}
