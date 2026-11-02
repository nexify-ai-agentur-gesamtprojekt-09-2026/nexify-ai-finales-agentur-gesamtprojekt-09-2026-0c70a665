"""Local edit of retained project videos. The portrait is an AI-extracted still,
not a natural walking/speaking performance. No external provider calls."""
from pathlib import Path
import hashlib,json,subprocess,sys
ROOT=Path(__file__).resolve().parents[2]
PUBLIC=ROOT/'apps/web/public'
MEDIA=PUBLIC/'media/atelier'
def run(*args):
 subprocess.run(['ffmpeg','-hide_banner','-loglevel','error','-y','-filter_complex_threads','1',*map(str,args)],check=True)
def sha(path):return hashlib.sha256(path.read_bytes()).hexdigest()
def poster(video,image,at='2'):
 run('-ss',at,'-i',video,'-frames:v','1','-q:v','2',image)
path=ROOT/'config/editorial-art.json';registry=json.loads(path.read_text())
for asset in ([] if '--hero-only' in sys.argv else registry['assets']):
 source=asset['film_history'][0];target=MEDIA/f"films/{asset['id']}-luxury-forward-20261102.mp4";image=target.with_suffix('.jpg')
 graph=("[0:v]trim=duration=5.041667,setpts=PTS-STARTPTS,fps=24,split=2[a][b];"
        "[a]scale=1296:864:force_original_aspect_ratio=increase,crop=1296:864,gblur=sigma=20[back];"
        "[b]scale=1296:-2,format=rgba,geq=r='r(X,Y)':g='g(X,Y)':b='b(X,Y)':a='255*min(1,min(Y/24,(H-1-Y)/24))'[front];"
        "[back][front]overlay=(W-w)/2:(H-h)/2,setsar=1[out]")
 run('-i',PUBLIC/source['src'].lstrip('/'),'-filter_complex',graph,'-map','[out]','-an','-t','5.041667','-c:v','libx264','-preset','medium','-crf','18','-pix_fmt','yuv420p','-threads','2','-movflags','+faststart',target)
 poster(target,image)
 previous=asset['film']
 if not any(f['src']==previous['src'] for f in asset['film_history']):asset['film_history'].append(previous)
 asset['film']={'src':'/'+str(target.relative_to(PUBLIC)),'poster':'/'+str(image.relative_to(PUBLIC)),'width':1296,'height':864,'title':asset['alt']['de'],'sha256':sha(target),'bytes':target.stat().st_size,'kind':'generated_editorial_motion_no_speech','duration_seconds':5.041667,'loop_edit':'forward_once_hold','source_task_id':source['task_id'],'source_sha256':source['sha256'],'edit_kind':'local_forward_only_soft_outer_extension','poster_sha256':sha(image)}
 print('rendered',asset['id'],flush=True)
path.write_text(json.dumps(registry,ensure_ascii=False,indent=2)+'\n')
portrait=MEDIA/'presenters/pascal-walking-cutout-20261102.png'
source=MEDIA/'films/web-20261102.mp4';target=MEDIA/'films/hero-glass-portrait-20261102.mp4';image=target.with_suffix('.jpg')
graph=("[0:v]trim=duration=5.041667,setpts=PTS-STARTPTS,fps=24,tpad=stop_mode=clone:stop_duration=5,scale=1920:1080,eq=brightness=-0.08:saturation=0.9[back];"
       "[1:v]scale=-1:1000,fps=24,format=rgba[p];[2:v]scale=520:520,fps=24,format=rgba[n];[3:v]scale=320:320,fps=24,format=rgba[o];"
       "[back][p]overlay=(W-w)/2:40:shortest=1[v1];[v1][n]overlay=90:520:shortest=1[v2];[v2][o]overlay=W-w-100:310:shortest=1,setsar=1[out]")
run('-i',source,'-loop','1','-i',portrait,'-loop','1','-i',MEDIA/'presenters/nex-lossless.webp','-loop','1','-i',MEDIA/'presenters/oracle-lossless.webp','-filter_complex',graph,'-map','[out]','-t','10','-an','-c:v','libx264','-preset','medium','-crf','18','-pix_fmt','yuv420p','-threads','2','-movflags','+faststart',target)
poster(target,image,'3')
description={'decision':'USER-VIDEO-SHOTPLAN-20261102','kind':'edited_video_with_AI_extracted_portrait_and_moving_environment','speaking_performance':False,'lip_sync':False,'original_portrait':'/media/atelier/presenters/pascal-walking-original-20261102.jpg','original_sha256':sha(MEDIA/'presenters/pascal-walking-original-20261102.jpg'),'cutout':'/'+str(portrait.relative_to(PUBLIC)),'cutout_sha256':sha(portrait),'film':{'src':'/'+str(target.relative_to(PUBLIC)),'poster':'/'+str(image.relative_to(PUBLIC)),'width':1920,'height':1080,'title':'Pascal, NeX und AIFly ORACLE im Glasatelier','duration_seconds':10,'hasAudio':False,'autoplayWithAudio':False,'playOnce':True,'sha256':sha(target),'poster_sha256':sha(image)}}
(ROOT/'config/hero-film.json').write_text(json.dumps(description,ensure_ascii=False,indent=2)+'\n')
print('rendered hero',flush=True)
