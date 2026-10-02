from pathlib import Path
import json,urllib.request,urllib.error
ROOT=Path(__file__).resolve().parent
key=None
for line in (ROOT.parents[1]/'FunClip.env').read_text().splitlines():
    if line.strip().startswith('ELEVENLABS_API_KEY='):key=line.split('=',1)[1].strip().strip('\"').strip("'")
if not key:raise SystemExit('API key missing')
jobs=[('roll',3.5,'Close-up foley of a heavy steel marble rolling smoothly down two metal rails. Soft detailed metallic rolling texture, gradually faster, no impact, no voices, no music.'),('click',.5,'One single sharp dry solid wooden domino clack, close microphone, immediate attack, short decay, isolated. No other sounds, no music.'),('gong',5,'One beautiful deep bronze gong struck once immediately at the start with a soft heavy mallet, shimmering resonant metallic overtones and long natural decay in a quiet studio. No music, no speech, no second strike.')]
for name,duration,prompt in jobs:
    out=ROOT/'assets'/'audio'/f'{name}.mp3'
    if out.exists():print(name,'cached');continue
    body=json.dumps({'text':prompt,'duration_seconds':duration,'prompt_influence':.6,'model_id':'eleven_text_to_sound_v2'}).encode()
    req=urllib.request.Request('https://api.elevenlabs.io/v1/sound-generation',data=body,headers={'xi-api-key':key,'Content-Type':'application/json'},method='POST')
    try:
        with urllib.request.urlopen(req,timeout=120) as r:out.write_bytes(r.read())
        print(name,'saved',out.stat().st_size)
    except urllib.error.HTTPError as e:print(name,'HTTP',e.code);raise SystemExit(1)
