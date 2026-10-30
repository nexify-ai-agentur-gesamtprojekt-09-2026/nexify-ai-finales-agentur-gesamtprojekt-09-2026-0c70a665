"""NeXify home loop clips – Kling v3 Pro image-to-video via Emergent Universal Key (fal queue through the Emergent proxy only).

Clips (start/end frames from tools/compose_loop_frames.py, identity-true cut-outs, no face edits):
  welcome-intro   5 s  start=welcome-start  end=welcome-loop   (trio walks into the hero pose)
  welcome-loop   10 s  start=end=welcome-loop                   (seamless idle loop)
  project-loop   10 s  start=end=project-loop
  choice-loop    10 s  start=end=choice-loop
Budget ledger: .local/home-loops/budget.json (hard limit, includes prior spend). Exactly one paid submission per clip name.
Usage:
  CONFIRM_PAID_VIDEO_TASK=YES python tools/produce_loops.py submit welcome-loop
  python tools/produce_loops.py poll welcome-loop
  python tools/produce_loops.py export
"""
from __future__ import annotations
import base64, hashlib, json, os, subprocess, sys
from datetime import datetime, timezone
from decimal import Decimal
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))
import produce_welcome as pw  # noqa: E402  (shared proxy client: headers/trusted/get_retry/ffmpeg/duration)

ROOT = Path(__file__).resolve().parents[1]
WORK = ROOT / '.local/home-loops'
FRAMES = WORK / 'frames'
CLIPS = WORK / 'clips'
LEDGER = WORK / 'budget.json'
PUBLIC = ROOT / 'apps/web/public/media/home-loops'
ENDPOINT = 'fal-ai/kling-video/v3/pro/image-to-video'
PRICE_PER_SECOND = Decimal('0.14')  # Emergent proxy catalog, 29.10.2026

STAGE = ('Locked static camera, no zoom, no pan, no cut. Dark graphite brand stage with soft green light arcs and a faintly reflective floor. '
         'A real man in a navy blazer, white t-shirt, grey trousers and white sneakers; a black round toucan figure with lime wings and a glowing lime chest light; '
         'a smooth lime-green cloud character with a black bowler hat and monocle, floating. Faces, proportions, clothing and colours stay exactly as in the image. '
         'Photorealistic, calm, premium commercial look. ')
NEGATIVE = ('talking, mouth moving, lip sync, speaking, face morphing, face change, different person, extra fingers, deformed hands, blur, distort, low quality, '
            'text, captions, subtitles, logo, extra characters, camera zoom, camera movement, cropping feet, cropping heads, frame, border, fur, fluffy, studio backdrop, room, furniture')

CLIP_SPECS = {
    'welcome-intro': {'start': 'welcome-start', 'end': 'welcome-loop', 'duration': 5,
                      'prompt': STAGE + 'The man and the toucan take a few relaxed natural steps toward the viewer and come to a calm stop, the man easing both hands into his trouser pockets with a friendly glance to the viewer. The cloud character glides gently with them and settles into a soft hover. Feet stay on the floor, the toucan takes small clean steps.'},
    'welcome-loop': {'start': 'welcome-loop', 'end': 'welcome-loop', 'duration': 10,
                     'prompt': STAGE + 'Everyone holds position. The man breathes calmly, blinks naturally, his gaze drifts briefly toward the toucan and back to the viewer with a small genuine smile, a tiny weight shift, hands stay in his pockets. The toucan tilts its head curiously once and blinks, its chest light pulses very softly. The cloud character hovers with a slow minimal rise and fall and a gentle tilt. The green light arcs shimmer slowly. Seamless loop, ends exactly in the starting pose.'},
    'project-loop': {'start': 'project-loop', 'end': 'project-loop', 'duration': 10,
                     'prompt': STAGE + 'The man presents the small grey model on the platform with one slow open-hand gesture over it, then rests his hand again; he blinks and smiles slightly while looking at the viewer. The toucan leans in a little toward the model and tilts its head, chest light pulsing softly. The cloud character hovers with a slow minimal rise and fall. The lime line on the model glows gently. Seamless loop, ends exactly in the starting pose.'},
    'choice-loop': {'start': 'choice-loop', 'end': 'choice-loop', 'duration': 10,
                    'prompt': STAGE + 'The man sits relaxed on the chair, hands folded, breathes calmly, blinks, nods once very slightly as if listening, with a warm attentive expression. The toucan stands beside him, tilts its head once and blinks, chest light pulsing softly. The cloud character hovers with a slow minimal rise and fall. The green light arcs shimmer slowly. Seamless loop, ends exactly in the starting pose.'},
}


def ledger():
    if LEDGER.exists():
        return json.loads(LEDGER.read_text())
    return {'limit_usd': '20.00', 'prior_spend_usd': '9.30', 'note': 'prior spend = hero/welcome revisions + lipsync + probes until 29.10. 21:00 (conservative)', 'reservations': {}}


def save_ledger(data):
    WORK.mkdir(parents=True, exist_ok=True)
    data['updated_at'] = datetime.now(timezone.utc).isoformat()
    data['reserved_total_usd'] = str(sum(Decimal(v) for v in data['reservations'].values()))
    LEDGER.write_text(json.dumps(data, indent=2) + '\n')


def reserve(name, seconds):
    data = ledger()
    cost = PRICE_PER_SECOND * seconds
    total = Decimal(data['prior_spend_usd']) + sum(Decimal(v) for v in data['reservations'].values()) + cost
    if total > Decimal(data['limit_usd']):
        raise RuntimeError(f'budget_limit_exceeded: {total} > {data["limit_usd"]}')
    data['reservations'][name] = str(cost)
    save_ledger(data)
    print(f'Budget: {name} {cost} USD reserviert, gesamt {total} / {data["limit_usd"]} USD', flush=True)


def data_uri(path: Path):
    return 'data:image/png;base64,' + base64.b64encode(path.read_bytes()).decode()


def submit(name):
    import requests
    spec = CLIP_SPECS[name]
    if os.environ.get('CONFIRM_PAID_VIDEO_TASK') != 'YES':
        raise RuntimeError('explicit_paid_approval_required')
    pw.load_env()
    state_file = WORK / f'{name}.json'
    if state_file.exists():
        raise RuntimeError(f'{name} already submitted – use poll (no duplicate paid job)')
    start = FRAMES / f'{spec["start"]}.png'; end = FRAMES / f'{spec["end"]}.png'
    reserve(name, spec['duration'])
    payload = {'start_image_url': data_uri(start), 'end_image_url': data_uri(end), 'duration': str(spec['duration']), 'generate_audio': False,
               'cfg_scale': 0.5, 'prompt': spec['prompt'], 'negative_prompt': NEGATIVE}
    state = {'status': 'SUBMITTING', 'endpoint': ENDPOINT, 'duration': spec['duration'], 'start_sha256': hashlib.sha256(start.read_bytes()).hexdigest(), 'end_sha256': hashlib.sha256(end.read_bytes()).hexdigest(), 'prompt': spec['prompt']}
    with state_file.open('x') as stream:
        json.dump(state, stream, indent=2)
    try:
        reply = requests.post(pw.proxy_base() + '/proxy', headers=pw.headers({'X-Fal-Target-Url': 'https://queue.fal.run/' + ENDPOINT}), json=payload, timeout=180)
        if reply.status_code == 402:
            raise RuntimeError('universal_key_insufficient_credits')
        if reply.status_code >= 400:
            raise RuntimeError('submit_http_%s:%s' % (reply.status_code, reply.text[:300]))
        sub = reply.json()
        state.update(status='PENDING', request_id=sub.get('request_id'), status_url=pw.trusted(sub['status_url']), response_url=pw.trusted(sub['response_url']))
        print('Auftrag', name, 'erstellt:', state['request_id'], flush=True)
    except (requests.RequestException, KeyError, ValueError) as exc:
        state.update(status='SUBMISSION_UNRESOLVED', error=type(exc).__name__)
        raise RuntimeError('submit_unresolved_do_not_recreate') from None
    except RuntimeError as exc:
        state.update(status='SUBMISSION_FAILED', error=str(exc))
        raise
    finally:
        state['updated_at'] = datetime.now(timezone.utc).isoformat()
        state_file.write_text(json.dumps(state, indent=2) + '\n')


def poll(name):
    import requests, time
    pw.load_env()
    state_file = WORK / f'{name}.json'
    state = json.loads(state_file.read_text())
    if state.get('downloaded'):
        print(name, 'bereits gesichert', flush=True); return
    CLIPS.mkdir(parents=True, exist_ok=True)
    target = CLIPS / f'{name}.mp4'
    for _ in range(300):
        reply = pw.get_retry(state['status_url'], 30)
        if reply.status_code >= 400:
            raise RuntimeError('status_http_' + str(reply.status_code))
        status = (reply.json().get('status') or 'UNKNOWN').upper()
        state['status'] = status; state_file.write_text(json.dumps(state, indent=2) + '\n')
        print(name, status, flush=True)
        if status in ('COMPLETED', 'OK'):
            res = pw.get_retry(state['response_url'], 60)
            if res.status_code >= 400:
                raise RuntimeError('result_http_%s:%s' % (res.status_code, res.text[:300]))
            url = (res.json().get('video') or {}).get('url', '')
            if not url.startswith('https://'):
                raise RuntimeError('output_missing')
            with requests.get(url, stream=True, timeout=300) as dl, target.with_suffix('.part').open('wb') as stream:
                dl.raise_for_status()
                for chunk in dl.iter_content(1024 * 1024):
                    stream.write(chunk)
            target.with_suffix('.part').replace(target)
            state.update(downloaded=True, output_sha256=hashlib.sha256(target.read_bytes()).hexdigest(), seconds=pw.duration(target))
            state_file.write_text(json.dumps(state, indent=2) + '\n')
            print(name, 'gesichert:', target.stat().st_size, 'Bytes,', state['seconds'], 's', flush=True)
            return
        if status in ('FAILED', 'CANCELLED', 'CANCELED', 'ERROR'):
            raise RuntimeError('generation_failed_no_automatic_retry')
        time.sleep(8)
    raise RuntimeError('poll_timeout_resume_with_poll')


def export():
    """Web export in native 1920x1080 with a light finishing pass (no generative edit):
    gentle unsharp for crisp edges, slight contrast/saturation lift, 24 fps kept. H.264 (crf 17) + VP9 (crf 28) + 1080p poster.
    Published under /media/home-loops/ with SHA256 manifest."""
    PUBLIC.mkdir(parents=True, exist_ok=True)
    ff = pw.ffmpeg(); manifest = {}
    # Stage floor: the generated clips carry a soft graphite gradient (8..~30). Map the near-black band back onto the
    # page colour #080A0F so the clip sits on the page without a visible box; mid/high tones untouched.
    flat = ("format=gbrp,lutrgb="
            "r='if(lt(val,18),8,if(lt(val,34),8+(val-18)*26/16,val))':"
            "g='if(lt(val,20),10,if(lt(val,36),10+(val-20)*26/16,val))':"
            "b='if(lt(val,25),15,if(lt(val,41),15+(val-25)*26/16,val))'")
    finish = flat + ',unsharp=5:5:0.55:3:3:0.0,eq=contrast=1.03:saturation=1.04,format=yuv420p'
    poster_vf = flat + ',unsharp=5:5:0.4,format=yuvj420p'
    for name in CLIP_SPECS:
        src = CLIPS / f'{name}.mp4'
        if not src.exists():
            print('fehlt:', name); continue
        mp4 = PUBLIC / f'{name}.mp4'; webm = PUBLIC / f'{name}.webm'; poster = PUBLIC / f'{name}.jpg'
        subprocess.run([ff, '-y', '-i', str(src), '-an', '-vf', finish, '-c:v', 'libx264', '-profile:v', 'high', '-level', '4.2', '-crf', '17', '-preset', 'slow', '-movflags', '+faststart', str(mp4)], check=True, capture_output=True)
        subprocess.run([ff, '-y', '-i', str(src), '-an', '-vf', finish, '-c:v', 'libvpx-vp9', '-b:v', '0', '-crf', '28', '-row-mt', '1', '-deadline', 'good', '-cpu-used', '2', str(webm)], check=True, capture_output=True)
        subprocess.run([ff, '-y', '-i', str(FRAMES / f'{CLIP_SPECS[name]["start"]}.png'), '-vf', poster_vf, '-q:v', '2', str(poster)], check=True, capture_output=True)
        manifest[name] = {'mp4': mp4.name, 'webm': webm.name, 'poster': poster.name, 'resolution': '1920x1080', 'seconds': round(pw.duration(mp4), 2),
                          'sha256': hashlib.sha256(mp4.read_bytes()).hexdigest(), 'webm_sha256': hashlib.sha256(webm.read_bytes()).hexdigest(), 'source_sha256': hashlib.sha256(src.read_bytes()).hexdigest(), 'model': ENDPOINT, 'finish': finish}
        print(name, mp4.stat().st_size // 1024, 'KB mp4,', webm.stat().st_size // 1024, 'KB webm,', manifest[name]['seconds'], 's', flush=True)
    (PUBLIC / 'manifest.json').write_text(json.dumps(manifest, indent=1) + '\n')


if __name__ == '__main__':
    cmd, *args = sys.argv[1:]
    if cmd == 'submit':
        for n in args: submit(n)
    elif cmd == 'poll':
        for n in args: poll(n)
    elif cmd == 'export':
        export()
    else:
        raise SystemExit('submit|poll|export')
