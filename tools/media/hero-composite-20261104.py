"""Reproducible VFX candidate. Uses existing motion and unchanged Oracle artwork.
No new pixels are synthesized for a face. The second generated person is excluded.
The Oracle is an explicitly composited original, not a new character performance.
Requires Python, numpy, Pillow and ffmpeg/libvpx. Input is preserved separately.
"""
import argparse, subprocess, json
from pathlib import Path
import numpy as np
from PIL import Image

p=argparse.ArgumentParser();p.add_argument('source');p.add_argument('oracle');p.add_argument('output');a=p.parse_args()
meta=json.loads(subprocess.check_output(['ffprobe','-v','error','-select_streams','v:0','-show_entries','stream=width,height,avg_frame_rate','-of','json',a.source]))['streams'][0]
assert (meta['width'],meta['height'],meta['avg_frame_rate'])==(1280,720,'24/1'),meta
W,H,FPS=1280,720,24
oracle=Image.open(a.oracle).convert('RGBA')
dec=subprocess.Popen(['ffmpeg','-v','error','-i',a.source,'-f','rawvideo','-pix_fmt','rgb24','pipe:1'],stdout=subprocess.PIPE)
log=open(a.output+'.encode.log','w')
enc=subprocess.Popen(['ffmpeg','-v','error','-y','-f','rawvideo','-pix_fmt','rgba','-s',f'{W}x{H}','-r',str(FPS),'-i','pipe:0','-i',a.source,'-map','0:v:0','-map','1:a:0','-c:v','libvpx-vp9','-pix_fmt','yuva420p','-auto-alt-ref','0','-row-mt','1','-threads','4','-crf','28','-b:v','0','-c:a','libopus','-b:a','128k','-ar','48000','-af','loudnorm=I=-16:TP=-1.5:LRA=11:measured_I=-18.92:measured_TP=-2.21:measured_LRA=13.30:measured_thresh=-30.60:offset=-0.58:linear=false','-shortest',a.output],stdin=subprocess.PIPE,stderr=log)
count=0
try:
 while True:
  data=dec.stdout.read(W*H*3)
  if not data:break
  if len(data)!=W*H*3:raise RuntimeError('Truncated raw frame')
  t=count/FPS;q=min(t/4,1)
  rgb=np.frombuffer(data,dtype=np.uint8).reshape(H,W,3).astype(np.float32)
  r,g,b=rgb[:,:,0],rgb[:,:,1],rgb[:,:,2]
  # Soft key by magenta saturation, including dark floor spill. Preserve skin/navy/green.
  key=np.clip((np.minimum(r,b)-1.3*g)/(0.5*g+6),0,1)
  alpha=(1-key)*255
  # Remove residual magenta edge lighting without recoloring green or skin.
  spill=np.maximum(np.minimum(r,b)-g,0)
  rgb[:,:,0]-=spill*.85;rgb[:,:,2]-=spill*.85
  rgba=np.dstack((np.clip(rgb,0,255),alpha)).astype(np.uint8)
  boundary=int(800+min(t,2)*40)
  # Subject paths remain separate. No inpainting or invented face reconstruction.
  speaker=rgba.copy();speaker[:,:int(495-22.5*t) if t<4 else 350,3]=0;speaker[:,640:,3]=0
  toucan=rgba.copy();toucan[:,:boundary,3]=0
  stage=Image.new('RGBA',(W,H))
  stage.alpha_composite(Image.fromarray(toucan),(-int(800*q),int(170+90*q)))
  stage.alpha_composite(Image.fromarray(speaker),(150,0))
  size=round(100+105*q);o=oracle.resize((size,size),Image.Resampling.LANCZOS)
  stage.alpha_composite(o,(round(900+40*q),round(210-35*q+2*np.sin(t*1.4))))
  enc.stdin.write(stage.tobytes());count+=1
finally:
 dec.stdout.close();enc.stdin.close()
code1=dec.wait();code2=enc.wait();log.close()
if code1 or code2:raise SystemExit(f'Decode/encode failed {code1}/{code2}')
print(json.dumps({'frames':count,'fps':FPS,'duration_seconds':count/FPS,'composited_original_oracle':True,'second_generated_person_removed':True,'audio':'same native source; loudness mastered without offset'}))
