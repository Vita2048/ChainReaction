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
  if(file.endsWith('.html'))data=data.toString().replaceAll('https://unpkg.com/three@0.180.0/','/node_modules/three/').replace('poseAt(0); requestAnimationFrame(loop);','playing=false; window.inspectViewer={setTime:t=>time=t,poseAt,SIM,TRIP,LAST_REST,paddleAngle,dominoes,latch,striker,scene,camera,controls}; poseAt(0); requestAnimationFrame(loop);');
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
  await page.evaluate(()=>{const v=window.inspectViewer;v.camera.position.set(10,6.7,6.4);v.controls.target.set(10.3,.65,.5);});
  for(const [name,t] of [['ready',0],['contact',result.release],['gong',result.strike],['rest',10]]){
    await page.evaluate(t=>{const v=window.inspectViewer;v.setTime(t);v.poseAt(t);},t);
    await new Promise(r=>setTimeout(r,150));
    await page.screenshot({path:`snapshots/viewer-${name}.png`});
  }
  console.log(JSON.stringify({result:'PASS',samples:3601,...result},null,2));
}finally{await browser?.close();server.close();}

