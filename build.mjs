import fs from 'node:fs';
const s=JSON.parse(fs.readFileSync('assets/simulation.json'));
const lane=points=>JSON.stringify({version:1,lanes:[{target:'volume',points:points.map(([t,v])=>({t,v}))}]}).replaceAll('"','&quot;');
let audio='<audio id="roll" src="assets/audio/roll.mp3" data-start="0" data-duration="3.3" data-track-index="1" data-automation="'+lane([[0,0],[.18,.43],[2.95,.56],[3.3,0]])+'"></audio>';
for(const e of s.events)audio+='<audio id="clack-'+e.i+'" src="assets/audio/click.mp3" data-media-start="0.022" data-start="'+e.t+'" data-duration=".20" data-volume=".75" data-track-index="2"></audio>';
audio+='<audio id="latch-release" src="assets/audio/click.mp3" data-media-start="0.022" data-start="'+s.release+'" data-duration=".20" data-volume=".40" data-track-index="2"></audio>';
audio+='<audio id="gong" src="assets/audio/gong-master.wav" data-start="'+s.strike+'" data-duration="5" data-track-index="3" data-automation="'+lane([[0,.85],[3.8,.85],[5,0]])+'"></audio>';
let html=fs.readFileSync('index.template.txt','utf8').replace('<!-- AUDIO -->',audio).replace('<script type="module" src="scene.js"></script>','<script type="module">'+fs.readFileSync('scene.js','utf8')+'</script>');fs.writeFileSync('index.html',html);console.log('Built: 15 seconds, 18 contact cues, gong '+s.strike+'s');

