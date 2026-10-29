"""Eigene ElevenLabs-Vertonung aller drei Original-Home-Drehpläne.
Nur vorhandenes Kontingent, kein Overage, kein Voice Cloning, kein Auto-Retry.
Ein Audioexport ist KEINE Film- oder Stimmenfreigabe. Keine Veröffentlichung.
"""
from __future__ import annotations
import argparse
from datetime import datetime, timezone
import hashlib
import json
import math
import os
from pathlib import Path
import subprocess
import time
import requests
from dotenv import load_dotenv
from produce_welcome import ffmpeg, duration

ROOT = Path(__file__).resolve().parents[1]
WORK = ROOT / '.local/home-voices-v2'
SOURCE = ROOT / 'config/home-film-scripts.json'
CAST = {
    'pascal': {'voice_id':'gGjaVIGkCSfKUIBYtNT2','name':'Marc - Pleasant and Interesting','stability':0.55,'style':0.18},
    'nex': {'voice_id':'feTHtWuEJFLTOWyoreyy','name':'Jakub - deep but curiously excited.','stability':0.46,'style':0.32},
    'oracle': {'voice_id':'FTNCalFNG5bRnkkaP5Ug','name':'Otto - Casual and Normal','stability':0.65,'style':0.12}
}
MODEL = 'eleven_v4'  # im tatsächlichen Account-/v1/models-Katalog vorhanden


def digest(data):
    return hashlib.sha256(data).hexdigest()


def write(path, data):
    temp = path.with_suffix('.tmp')
    temp.write_text(json.dumps(data, ensure_ascii=False, indent=2)+'\n')
    temp.replace(path)


def catalog(headers):
    r = requests.get('https://api.elevenlabs.io/v1/models', headers=headers, timeout=30)
    r.raise_for_status()
    model = next((m for m in r.json() if m.get('model_id') == MODEL and m.get('can_do_text_to_speech')), None)
    if not model or not any(l.get('language_id') == 'de' for l in model.get('languages', [])):
        raise RuntimeError('requested_german_model_not_available_no_fallback')
    cost = model.get('model_rates', {}).get('character_cost_multiplier')
    if cost is None:
        raise RuntimeError('model_credit_cost_unknown')
    return float(cost)


def quota(headers, needed):
    r = requests.get('https://api.elevenlabs.io/v1/user/subscription', headers=headers, timeout=30)
    if r.status_code == 429:
        # Nur die kostenfreie Leseanfrage wiederholen, niemals den TTS-POST.
        time.sleep(min(65, max(15, int(r.headers.get('retry-after', '60')))))
        r = requests.get('https://api.elevenlabs.io/v1/user/subscription', headers=headers, timeout=30)
    r.raise_for_status()
    q = r.json()
    # Refuse even available credits if overage could accidentally be incurred.
    if q.get('can_extend_character_limit') or q.get('allowed_to_extend_character_limit'):
        raise RuntimeError('overage_must_be_disabled_no_settings_modified')
    remaining = q['character_limit'] - q['character_count']
    if remaining < needed:
        raise RuntimeError('insufficient_included_credits_no_paid_overage')
    return {k:q[k] for k in ('character_count','character_limit')}


def produce(only_first=False):
    load_dotenv(ROOT/'backend/.env', override=False)
    headers = {'xi-api-key':os.environ['ELEVENLABS_API_KEY']}
    WORK.mkdir(parents=True, exist_ok=True)
    source = SOURCE.read_bytes()
    films = json.loads(source)['films']
    multiplier = catalog(headers)
    total = sum(math.ceil(len(l['text'])*multiplier) for f in films for l in f['lines'])
    quota(headers, total)
    voices = requests.get('https://api.elevenlabs.io/v2/voices',params={'page_size':100},headers=headers,timeout=30)
    voices.raise_for_status()
    available = {v['voice_id']:v for v in voices.json()['voices']}
    for v in CAST.values():
        if v['voice_id'] not in available or available[v['voice_id']].get('labels',{}).get('language')!='de':
            raise RuntimeError('german_cast_unavailable')
    for film in films:
        folder = WORK/film['id'];folder.mkdir(exist_ok=True)
        for i,line in enumerate(film['lines']):
            voice = CAST[line['speaker']]
            output = folder/f'{i+1:02d}-{line["speaker"]}.mp3'
            manifest = output.with_suffix('.json')
            if manifest.exists():
                saved = json.loads(manifest.read_text())
                if saved.get('status')=='produced' and saved.get('script_sha256')==digest(source) and output.exists() and digest(output.read_bytes())==saved.get('audio_sha256'):
                    continue
                raise RuntimeError('existing_request_unresolved_or_changed_no_retry_'+output.name)
            q=quota(headers, math.ceil(len(line['text'])*multiplier))
            record={'status':'submitting','provider':'ElevenLabs','model':MODEL,'voice_id':voice['voice_id'],'voice_name':voice['name'],'speaker':line['speaker'],'text':line['text'],'text_sha256':digest(line['text'].encode()),'script_sha256':digest(source),'quota_before':q,'voice_clone':False,'voice_review':'pending','film_review':'not_applicable','started_at':datetime.now(timezone.utc).isoformat()}
            with manifest.open('x') as stream:json.dump(record,stream,ensure_ascii=False,indent=2)
            payload={'text':line['text'],'model_id':MODEL,'language_code':'de','voice_settings':{'stability':voice['stability'],'similarity_boost':0.85,'style':voice['style'],'use_speaker_boost':True,'speed':1.0}}
            try:
                r=requests.post('https://api.elevenlabs.io/v1/text-to-speech/'+voice['voice_id'],params={'output_format':'mp3_44100_128'},headers={**headers,'Accept':'audio/mpeg'},json=payload,timeout=90)
                if r.status_code!=200 or not r.headers.get('content-type','').startswith('audio/'):
                    record.update(status='failed',http_status=r.status_code)
                    write(manifest,record)
                    raise RuntimeError('elevenlabs_tts_http_'+str(r.status_code))
                output.write_bytes(r.content)
                record.update(status='produced',audio_sha256=digest(r.content),seconds=duration(output),request_id=r.headers.get('request-id') or r.headers.get('x-request-id'),character_count_header=r.headers.get('character-cost'),quota_after=quota(headers,0),finished_at=datetime.now(timezone.utc).isoformat())
                write(manifest,record)
                print(film['id'],output.name,record['seconds'],'Sekunden, ElevenLabs',MODEL,flush=True)
            except requests.RequestException:
                record.update(status='request_unresolved_no_retry');write(manifest,record)
                raise RuntimeError('elevenlabs_network_unresolved') from None
            if only_first:
                return
        # Eigene vollständige Tonfassung, natürliche Geschwindigkeit. Keine Kürzung
        # oder Zeitdehnung, falls Dauer vom geplanten Filmfenster abweicht.
        records=[json.loads((folder/f'{i+1:02d}-{line["speaker"]}.json').read_text()) for i,line in enumerate(film['lines'])]
        at=float(film['entrance_seconds']);cues=[];inputs=[];filters=[]
        for i,(line,record) in enumerate(zip(film['lines'],records)):
            inputs+=['-i',str(folder/f'{i+1:02d}-{line["speaker"]}.mp3')]
            filters.append(f'[{i}:a]aformat=sample_rates=48000:channel_layouts=stereo,adelay={round(at*1000)}|{round(at*1000)}[a{i}]')
            cues.append({'speaker':line['speaker'],'text':line['text'],'start':round(at,3),'end':round(at+record['seconds'],3)})
            at+=record['seconds']+1.5
        end=at-1.5+film['end_hold_seconds']
        filters.append(''.join(f'[a{i}]' for i in range(len(records)))+f'amix=inputs={len(records)}:normalize=0,apad,atrim=duration={end},loudnorm=I=-16:TP=-1.5:LRA=11[out]')
        subprocess.run([ffmpeg(),'-y','-loglevel','error',*inputs,'-filter_complex',';'.join(filters),'-map','[out]','-c:a','libmp3lame','-b:a','192k',str(folder/'voiceover.mp3')],check=True,capture_output=True)
        def stamp(n):
            ms=round(n*1000);return f'{ms//3600000:02}:{ms//60000%60:02}:{ms//1000%60:02}.{ms%1000:03}'
        (folder/'captions.vtt').write_text('WEBVTT\n\n'+''.join(f'{stamp(c["start"])} --> {stamp(c["end"])}\n{c["text"]}\n\n' for c in cues))
        write(folder/'timeline.json',{'id':film['id'],'provider':'ElevenLabs','model':MODEL,'cast':CAST,'seconds':duration(folder/'voiceover.mp3'),'within_planned_duration':film['minimum_seconds']<=end<=film['maximum_seconds'],'audio_sha256':digest((folder/'voiceover.mp3').read_bytes()),'script_sha256':digest(source),'cues':cues,'time_stretching':False,'film_produced':False,'approval':'pending'})
        print(film['id'],'Tonfassung',round(end,2),'s; keine Filmfreigabe',flush=True)


if __name__=='__main__':
    parser=argparse.ArgumentParser();parser.add_argument('--first-only',action='store_true');args=parser.parse_args()
    produce(args.first_only)
