import fs from 'node:fs';
import http from 'node:http';
import path from 'node:path';
import {fileURLToPath} from 'node:url';

// Standalone review only: does not build or change the HyperFrames composition.
const root=path.dirname(fileURLToPath(import.meta.url));
const mime={'.html':'text/html','.js':'text/javascript','.mp3':'audio/mpeg','.wav':'audio/wav'};
http.createServer((req,res)=>{
  let pathname;
  try{pathname=decodeURIComponent(new URL(req.url,'http://localhost').pathname);}catch{res.writeHead(400);res.end();return;}
  const file=path.resolve(root,'.'+(pathname==='/'?'/chain-reaction-viewer.html':pathname));
  if(!file.startsWith(root+path.sep)||!fs.existsSync(file)||!fs.statSync(file).isFile()){res.writeHead(404);res.end();return;}
  let data=fs.readFileSync(file);
  if(file.endsWith('.html'))data=Buffer.from(data.toString().replaceAll('https://unpkg.com/three@0.180.0/','/node_modules/three/'));
  res.setHeader('Content-Type',mime[path.extname(file)]||'application/octet-stream');
  res.setHeader('Cache-Control','no-cache');res.setHeader('Accept-Ranges','bytes');
  const range=/^bytes=(\d+)-(\d*)$/.exec(req.headers.range||'');
  if(range){
    const start=Number(range[1]),end=Math.min(range[2]?Number(range[2]):data.length-1,data.length-1);
    if(start>end){res.writeHead(416,{'Content-Range':`bytes */${data.length}`});res.end();return;}
    res.writeHead(206,{'Content-Range':`bytes ${start}-${end}/${data.length}`,'Content-Length':end-start+1});res.end(data.subarray(start,end+1));return;
  }
  res.setHeader('Content-Length',data.length);res.end(data);
}).listen(8822,'127.0.0.1',()=>console.log('Standalone viewer: http://127.0.0.1:8822/chain-reaction-viewer.html'));
