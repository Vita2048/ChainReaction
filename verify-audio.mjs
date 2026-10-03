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
  if(file.endsWith('.html'))data=data.toString().replaceAll('https://unpkg.com/three@0.180.0/','/node_modules/three/').replace('poseAt(0); requestAnimationFrame(loop);','playing=false; window.inspectAudio={audioClips,SIM,E,seek:t=>time=t,play:value=>playing=value,rate:value=>speed=value,clock:()=>time}; poseAt(0); requestAnimationFrame(loop);');
  const mime={'.html':'text/html','.mp3':'audio/mpeg','.wav':'audio/wav'};
  res.setHeader('Content-Type',mime[path.extname(file)]||'text/javascript');
  res.setHeader('Accept-Ranges','bytes');
  if(req.headers.range){const match=/bytes=(\d+)-(\d*)/.exec(req.headers.range);const start=Number(match[1]),end=match[2]?Number(match[2]):data.length-1;res.writeHead(206,{'Content-Range':`bytes ${start}-${end}/${data.length}`,'Content-Length':end-start+1});res.end(data.subarray(start,end+1));return;}
  res.setHeader('Content-Length',Buffer.byteLength(data));res.end(data);
});
await new Promise(r=>server.listen(0,'127.0.0.1',r));
let browser;
try{
  browser=await puppeteer.launch({executablePath:'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe',headless:true,args:['--no-sandbox']});
  const page=await browser.newPage(),errors=[];page.on('pageerror',e=>errors.push(e.message));
  await page.goto(`http://127.0.0.1:${server.address().port}/chain-reaction-viewer.html`);
  await page.waitForFunction(()=>window.inspectAudio?.audioClips.every(c=>c.media.readyState>=2));
  await page.click('#sound');
  const state=()=>page.evaluate(()=>{
    const v=window.inspectAudio;
    return {time:v.clock(),active:v.audioClips.filter(c=>!c.media.paused).map(c=>({file:c.media.src.split('/').at(-1),position:c.media.currentTime,start:c.start,offset:c.offset,rate:c.media.playbackRate,volume:c.media.volume})),mediaErrors:v.audioClips.filter(c=>c.media.error).length};
  });
  await page.evaluate(()=>{const v=window.inspectAudio;v.seek(1);v.play(true);});
  await new Promise(r=>setTimeout(r,150));const rolling=await state();
  assert.equal(rolling.active.length,1);assert.equal(rolling.active[0].file,'roll.mp3');
  assert(Math.abs(rolling.active[0].position-rolling.time)<.15,JSON.stringify(rolling));
  await page.evaluate(()=>window.inspectAudio.play(false));await new Promise(r=>setTimeout(r,60));assert.equal((await state()).active.length,0);
  await page.evaluate(()=>{const v=window.inspectAudio;v.seek(v.SIM.events[0].t+.01);v.play(true);});
  await new Promise(r=>setTimeout(r,60));const click=await state();assert(click.active.some(c=>c.file==='click.mp3'));
  await page.evaluate(()=>{const v=window.inspectAudio;v.seek(v.SIM.strike+.15);});
  await new Promise(r=>setTimeout(r,60));const gong=await state();assert(gong.active.some(c=>c.file==='gong-master.wav'));
  await page.evaluate(()=>{const v=window.inspectAudio;v.seek(v.E.roll+1);v.rate(.5);});
  await new Promise(r=>setTimeout(r,80));const slow=await state();assert(slow.active.length>0);assert(slow.active.every(c=>c.rate===.5));
  await page.click('#sound');await new Promise(r=>setTimeout(r,60));assert.equal((await state()).active.length,0);
  assert.deepEqual(errors,[]);assert.equal(slow.mediaErrors,0);
  console.log(JSON.stringify({result:'PASS',rollingSyncError:Math.abs(rolling.active[0].position-rolling.time),domino:click.active.map(c=>c.file),gong:gong.active.map(c=>c.file),pauseMuteAndHalfSpeed:true},null,2));
}finally{await browser?.close();server.close();}
