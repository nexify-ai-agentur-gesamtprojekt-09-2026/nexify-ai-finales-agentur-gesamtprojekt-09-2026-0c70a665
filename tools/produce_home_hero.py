"""Einmalige H00-Neuproduktion innerhalb des vorhandenen 10-USD-Gesamtlimits.
Originaldrehplan, originale Identitätsreferenzen; keine automatische Veröffentlichung.
S01/S02 werden hier NICHT als produziert ausgegeben.
"""
from __future__ import annotations
import argparse
from decimal import Decimal
import hashlib
import json
import os
from pathlib import Path
import subprocess
from PIL import Image, ImageOps, ImageFilter, ImageDraw
from produce_welcome import ROOT, REFERENCES, VIDEO_ENDPOINT, LIPSYNC_ENDPOINT, WORK, load_env, data_uri, submit, poll, ffmpeg, duration

REV=ROOT/'.local/home-hero-revision'
LIMIT=Decimal('10.00')
PRIOR=Decimal('0.70')  # bereits eingereichte fünfsekündige Identitätsprobe


def save(path,data):
    temp=path.with_suffix('.tmp');temp.write_text(json.dumps(data,ensure_ascii=False,indent=2)+'\n');temp.replace(path)


def frames():
    REV.mkdir(parents=True,exist_ok=True)
    token=json.loads((ROOT/'config/design-tokens.json').read_text())['color']['graphit']['800']['$value']
    base=Image.new('RGBA',(1920,1200),token)
    # Licht und Boden enden VOR den Außenkanten; keine vervierfachten Bildkacheln.
    shadow=Image.new('RGBA',base.size,(0,0,0,0));draw=ImageDraw.Draw(shadow)
    for box in [(76,1084,704,1148),(700,1090,1360,1156)]:draw.ellipse(box,fill=(0,0,0,150))
    base.alpha_composite(shadow.filter(ImageFilter.GaussianBlur(22)))
    placements={'nex':((650,710),(40,425)),'pascal':((680,1080),(700,60)),'oracle':((450,450),(1430,260))}
    for initial in (False,True):
        stage=base.copy()
        for name,(size,pos) in placements.items():
            image=Image.open(REFERENCES[name]).convert('RGBA')
            image.putalpha(image.getchannel('A').point(lambda a:max(0,min(255,(a-128)*255//100))))
            image=image.crop(image.getbbox())
            # Materialkorrektur nur an der vorhandenen AIFly-Oberfläche; Form,
            # Augen/Hut/Monokel, Proportionen und Originaldatei bleiben erhalten.
            if name=='oracle':
                alpha=image.getchannel('A');image=image.filter(ImageFilter.MedianFilter(5));image.putalpha(alpha)
            image=ImageOps.contain(image,size,Image.Resampling.LANCZOS)
            x,y=pos
            if initial:
                old=image.size;image=image.resize((round(old[0]*.86),round(old[1]*.86)),Image.Resampling.LANCZOS)
                x+=(old[0]-image.width)//2;y+=old[1]-image.height
            stage.alpha_composite(image,(x,y))
        stage.convert('RGB').save(REV/('start.png' if initial else 'standing.png'))
    save(REV/'references.json',{'originals':{k:{'path':str(p.relative_to(ROOT)),'sha256':hashlib.sha256(p.read_bytes()).hexdigest()} for k,p in REFERENCES.items()},'derived_oracle_material':'5px median only, original alpha/shape, not owner-approved','publication':'not_approved','frame_size':[1920,1200]})


def reserve(name,cost):
    REV.mkdir(parents=True,exist_ok=True)
    ledger_path=REV/'budget.json'
    ledger=json.loads(ledger_path.read_text()) if ledger_path.exists() else {'limit_usd':str(LIMIT),'prior_probe_usd':str(PRIOR),'reservations':{}}
    if name in ledger['reservations']:return
    total=PRIOR+sum(Decimal(v) for v in ledger['reservations'].values())+cost
    if total>LIMIT:raise RuntimeError('video_budget_limit_exceeded')
    ledger['reservations'][name]=str(cost);ledger['reserved_total_usd']=str(total);save(ledger_path,ledger)


BASE=('Premium natural live-action and high-end smooth 3D, locked tripod medium-wide FULL-BODY composition. '
      'Exactly three characters. @Element1 is the exact real man Pascal in the reference, unchanged face geometry, eye shape, age, beard, haircut, necklace, navy blazer, grey jeans and white sneakers. '
      '@Element2 is exactly NeX, the black white lime toucan. @Element3 is exactly AI Fly Oracle with its same outline, black hat, eyes and monocle, smooth polished lime material NOT fur or plush. Oracle has NO mouth. '
      'All heads, bodies, legs and feet stay inside frame throughout with safe margin; characters are LARGE, not tiny in an empty stage. '
      'Preserve the dark graphite RGB 8 10 15 background matching reference at ALL edges. One soft upper-left key light and matching gentle grounded shadows. '
      'Subtle human breathing, eye contact, natural relaxed smiles; one short gentle genuine chuckle may move cheeks, but NO broad forced grin or changed face. '
      'No cuts, no zoom, no panning, no transitions, no text, no new characters, no props, no office, no background seams. ')
SCENES=[
    'First four seconds: Pascal and NeX each take two natural welcoming steps forward to their LARGE final marks shown in end frame, feet visible. Oracle floats alongside them and arrives above to the right. From second4 Pascal welcomes the viewer with small open-hand gesture, natural conversational German speech mouth movements; NeX and Oracle listen with subtle reactions. Pascal never waves wildly or changes appearance.',
    'Pascal remains relaxed and quiet from second2 onward. From second2 through second10 NeX talks with natural synchronized-looking beak motion and one friendly wing gesture while Pascal smiles and listens. From second12 Oracle starts its calm explanation through subtle eyes, orientation and hover, NO mouth appears. Keep all three figures and their exact identity, no camera cuts.',
    'First six seconds Oracle explains using only attentive orientation, eyes and gentle hovering, no mouth. Pascal and NeX listen. From second7 through second11 Pascal speaks the final friendly invitation with a small gesture toward the right and a warm natural smile. The final four seconds settle into a relaxed end pose with subtle breathing and a brief natural soft chuckle from Pascal; all three remain alive, not a frozen photograph.'
]


def submit_scenes():
    if os.environ.get('CONFIRM_PAID_VIDEO_TASK')!='YES':raise RuntimeError('explicit_paid_approval_required')
    if not (REV/'standing.png').exists():raise RuntimeError('reference_frames_required')
    elements=[{'frontal_image_url':data_uri(REFERENCES[n],'image/png'),'reference_image_urls':[data_uri(REFERENCES[n],'image/png')]} for n in ['pascal','nex','oracle']]
    for i,prompt in enumerate(SCENES):
        name=f'home-welcome-revision-{i+1}';reserve(name,Decimal('2.10'))
        payload={'start_image_url':data_uri(REV/('start.png' if i==0 else 'standing.png'),'image/png'),'end_image_url':data_uri(REV/'standing.png','image/png'),'duration':'15','generate_audio':False,'cfg_scale':0.7,'elements':elements,'prompt':BASE+prompt,'negative_prompt':'face morph, different person, ageing, exaggerated teeth, wide grin, deformed hands, extra limbs, cropped feet, camera zoom, fur, plush, fuzzy Oracle, mouth on Oracle, flat still image, frozen motion, rectangle border, moving background, office, text'}
        submit(name,VIDEO_ENDPOINT,payload,{'film':'FILM-home-welcome','segment':i+1,'duration':15,'estimated_cost_usd':2.10,'native_audio':False,'audio_provider':'ElevenLabs','release':'pending_review','prompt':BASE+prompt})


def collect():
    for i in range(3):poll(f'home-welcome-revision-{i+1}',REV/f'scene-{i+1}.mp4')
    listing=REV/'concat.txt';listing.write_text(''.join("file '"+str(REV/f'scene-{i+1}.mp4')+"'\n" for i in range(3)))
    subprocess.run([ffmpeg(),'-y','-loglevel','error','-f','concat','-safe','0','-i',str(listing),'-an','-c:v','libx264','-crf','17','-pix_fmt','yuv420p',str(REV/'visual-master.mp4')],check=True,capture_output=True)
    print('45s Bildmaster vorhanden, noch NICHT lippensynchron oder freigegeben')

def submit_sync():
    if os.environ.get('CONFIRM_PAID_VIDEO_TASK')!='YES':raise RuntimeError('explicit_paid_approval_required')
    source=REV/'visual-retouched.mp4'
    if not source.exists() or not (REV/'retouch-report.json').exists():raise RuntimeError('retouched_master_required')
    audio=ROOT/'.local/home-voices-v2/FILM-home-welcome/voiceover.mp3'
    clips=[(4.0,7.2),(11.2,4.11),(37.26,3.16)]
    save(REV/'lip-clips.json',{'clips':clips,'audio_sha256':hashlib.sha256(audio.read_bytes()).hexdigest(),'oracle_lipsync':False,'nex_beak':'animation-timed, not phoneme-verified','acceptance':'pending'})
    for i,(start,length) in enumerate(clips):
        video=REV/f'lip-input-{i+1}.mp4';sound=REV/f'lip-audio-{i+1}.mp3'
        subprocess.run([ffmpeg(),'-y','-loglevel','error','-i',str(source),'-ss',str(start),'-t',str(length),'-vf','scale=1728:1080:flags=lanczos','-an','-c:v','libx264','-crf','17','-pix_fmt','yuv420p',str(video)],check=True,capture_output=True)
        subprocess.run([ffmpeg(),'-y','-loglevel','error','-i',str(audio),'-ss',str(start),'-t',str(length),'-c:a','libmp3lame','-b:a','192k',str(sound)],check=True,capture_output=True)
        name=f'home-welcome-sync-{i+1}';reserve(name,Decimal('0.14'))
        submit(name,LIPSYNC_ENDPOINT,{'video_url':data_uri(video,'video/mp4'),'audio_url':data_uri(sound,'audio/mpeg')},{'purpose':'Pascal lip sync only','start':start,'seconds':length,'max_estimated_cost_usd':.14,'source_audio':'ElevenLabs eleven_v4','release':'pending_review'})


def submit_http_sync():
    """Bewusster neuer Auftrag nach bestätigtem Data-URL-Validierungsfehler.
    Kein Retry eines unklaren POST, alte IDs und Reservierungen bleiben erhalten.
    """
    import requests
    if os.environ.get('CONFIRM_PAID_VIDEO_TASK')!='YES':raise RuntimeError('explicit_paid_approval_required')
    base=(os.environ.get('APP_PUBLIC_URL') or os.environ.get('REACT_APP_BACKEND_URL','')).rstrip('/')
    if not base.startswith('https://'):raise RuntimeError('public_https_app_url_required')
    clips=[(4.0,7.2),(11.2,4.11),(37.26,3.16)]
    for i,(start,length) in enumerate(clips):
        urls={'video_url':f'{base}/media/home-review/lip-input-{i+1}.mp4','audio_url':f'{base}/media/home-review/lip-audio-{i+1}.mp3'}
        for key,url in urls.items():
            r=requests.get(url,headers={'Range':'bytes=0-1023'},timeout=30,stream=True)
            try:
                expected='video/' if key=='video_url' else 'audio/'
                if r.status_code not in [200,206] or not r.headers.get('content-type','').startswith(expected):raise RuntimeError('media_not_publicly_readable_'+key)
            finally:r.close()
        name=f'home-welcome-sync-http-{i+1}';reserve(name,Decimal('0.14'))
        submit(name,LIPSYNC_ENDPOINT,urls,{'purpose':'Pascal lip sync, app-owned public HTTPS inputs after deterministic data-URI rejection','start':start,'seconds':length,'max_estimated_cost_usd':.14,'supersedes_failed_request':f'home-welcome-sync-{i+1}','release':'pending_review'})



def finish_sync():
    for i in range(3):poll(f'home-welcome-sync-http-{i+1}',REV/f'lip-output-{i+1}.mp4')
    audio=ROOT/'.local/home-voices-v2/FILM-home-welcome/voiceover.mp3'
    inputs=['-i',str(REV/'visual-retouched.mp4')]
    for i in range(3):inputs+=['-i',str(REV/f'lip-output-{i+1}.mp4')]
    inputs+=['-i',str(audio)]
    spans=[(0,0,4),(1,0,7.2),(2,0,4.11),(0,15.31,37.26),(3,0,3.16),(0,40.42,43.46)]
    filters=[]
    for i,(stream,start,end) in enumerate(spans):
        filters.append(f'[{stream}:v]trim=start={start}:end={end},setpts=PTS-STARTPTS,tpad=stop_mode=clone:stop_duration=0.25,trim=duration={end-start},scale=1820:1136:flags=lanczos,setsar=1,fps=24,settb=AVTB[v{i}]')
    filters.append(''.join(f'[v{i}]' for i in range(len(spans)))+f'concat=n={len(spans)}:v=1:a=0[out]')
    out=REV/'welcome-review.mp4'
    subprocess.run([ffmpeg(),'-y','-loglevel','error',*inputs,'-filter_complex',';'.join(filters),'-map','[out]','-map','4:a','-t','43.46','-c:v','libx264','-crf','17','-pix_fmt','yuv420p','-c:a','aac','-b:a','192k','-movflags','+faststart',str(out)],check=True,capture_output=True)
    subprocess.run([ffmpeg(),'-y','-loglevel','error','-i',str(out),'-vf','scale=1600:-2:flags=lanczos','-c:v','libvpx-vp9','-crf','28','-b:v','0','-deadline','realtime','-cpu-used','5','-row-mt','1','-threads','3','-c:a','libopus','-b:a','128k',str(REV/'welcome-review.webm')],check=True,capture_output=True)
    subprocess.run([ffmpeg(),'-y','-loglevel','error','-ss','4','-i',str(out),'-frames:v','1','-q:v','2',str(REV/'poster.jpg')],check=True,capture_output=True)
    save(REV/'review-manifest.json',{'film_id':'FILM-home-welcome','duration':duration(out),'mp4_sha256':hashlib.sha256(out.read_bytes()).hexdigest(),'voices':'ElevenLabs eleven_v4, three roles','pascal_lipsync':True,'nex_phoneme_sync_verified':False,'oracle_mouth_artifact_retouched':True,'owner_voice_approval':False,'owner_visual_approval':False,'status':'review_candidate_not_full_acceptance'})
    print('Neuer echter Begrüßungsfilm exportiert, Abnahme offen',duration(out),'Sekunden')




if __name__=='__main__':
    load_env();parser=argparse.ArgumentParser();parser.add_argument('action',choices=['frames','submit','collect','sync','finish']);args=parser.parse_args()
    {'frames':frames,'submit':submit_scenes,'collect':collect,'sync':submit_sync,'finish':finish_sync}[args.action]()
