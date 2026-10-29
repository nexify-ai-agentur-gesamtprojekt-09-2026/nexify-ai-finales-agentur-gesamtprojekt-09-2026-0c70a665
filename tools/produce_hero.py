"""NeXify: one explicitly approved hero-video task; persistent resume, no paid retries.
Video: Kling v3 Pro image-to-video via Emergent Universal Key (fal queue inference through the
Emergent integration proxy only, not fal Platform APIs). Voice: ElevenLabs. Merge: ffmpeg.
Uses supplied Pascal, NeX and yellow Oracle reference bytes, never hero-trio.png.
No public generation endpoint and no secrets or signed URLs in evidence.
"""
from __future__ import annotations
import argparse
import base64
from datetime import datetime, timezone
import hashlib
import json
import os
from pathlib import Path
import subprocess
import sys
import time
from urllib.parse import urlparse

ROOT = Path(__file__).resolve().parents[1]
WORK = ROOT / '.local/hero-production'
MEDIA = ROOT / 'apps/web/public/media/runway'
STATE = WORK / 'job.json'
SOURCE = WORK / 'production-start.png'
ORIGINAL = WORK / 'kling-original.mp4'
NARRATION_FILE = WORK / 'narration.mp3'
REFERENCES = {
    'pascal': ROOT / 'apps/web/public/media/presenters/pascal-original-6dd03834.png',
    'nex': ROOT / 'apps/web/public/media/presenters/nex-toucan-121a804c.png',
    'oracle': ROOT / 'apps/web/public/media/presenters/ai-fly-oracle-avatar-9f705e5b.png',
}
ENDPOINT = 'fal-ai/kling-video/v3/pro/image-to-video'
DURATION = '14'
PROMPT = (
    'Locked-off full-body wide shot of exactly these three characters on a uniform dark graphite studio background. '
    'The friendly man in the navy jacket and white sneakers takes two small natural steps forward alongside the black toucan with lime wings. '
    'The yellow-lime cloud-shaped Oracle with its black bowler hat and black monocle gently glides beside his shoulder. '
    'They settle, look toward the viewer, the man makes a small welcoming open-hand gesture, then a calm smile, '
    'the toucan tilts its head curiously, the Oracle bobs softly. '
    'Preserve the exact faces, outfits, materials, relative sizes and identities. '
    'The toucan stays approximately waist-high, the Oracle stays small beside the shoulder. '
    'Keep all three complete bodies, both shoes, bird feet and the whole Oracle inside the frame with generous margin throughout. '
    'Static camera, natural slow motion, soft neutral lighting, plain graphite backdrop, no speech, silent scene. '
    'No text, no interface, no border, no glowing scenery, no new characters, no zoom or camera crop.'
)
NEGATIVE = 'blur, distort, low quality, text, captions, subtitles, logo, extra characters, camera zoom, cropping, glowing frame'
NARRATION = ('Willkommen bei NeXify. Gemeinsam mit NeX und AI Fly Oracle machen wir aus deinem Vorhaben den nächsten klaren Schritt. '
             'Eine Website, ein Kundenportal oder weniger Routinearbeit? Lass uns beginnen.')


def load_env():
    from dotenv import load_dotenv
    load_dotenv(ROOT / 'backend/.env', override=False)


def save(state):
    WORK.mkdir(parents=True, exist_ok=True)
    state['updated_at'] = datetime.now(timezone.utc).isoformat()
    temp = STATE.with_suffix('.tmp')
    temp.write_text(json.dumps(state, ensure_ascii=False, indent=2) + '\n')
    temp.replace(STATE)


def read():
    return json.loads(STATE.read_text()) if STATE.exists() else {}


# --- Emergent Universal Key media client (fal queue inference through Emergent proxy only) ---
def proxy_base():
    return os.environ.get('INTEGRATION_PROXY_URL', 'https://integrations.emergentagent.com').rstrip('/') + '/api/v1/fal'


def headers(extra=None):
    key = os.environ.get('EMERGENT_LLM_KEY')
    if not key:
        raise RuntimeError('universal_key_missing')
    out = {'Authorization': 'Bearer ' + key, 'Content-Type': 'application/json'}
    if os.environ.get('job_id'):
        out['X-App-ID'] = out['X-Job-ID'] = os.environ['job_id']
    if os.environ.get('run_id'):
        out['X-Environment-ID'] = os.environ['run_id']
    if extra:
        out.update(extra)
    return out


def trusted_queue_url(value):
    base = urlparse(proxy_base() + '/queue')
    url = urlparse(value)
    if url.scheme != base.scheme or url.netloc != base.netloc or not url.path.startswith(base.path.rstrip('/') + '/'):
        raise RuntimeError('untrusted_queue_url')
    return value


def get_with_retry(url, timeout):
    import requests
    delay = 1
    for attempt in range(5):
        try:
            return requests.get(url, headers=headers(), timeout=timeout)
        except (requests.ConnectTimeout, requests.ReadTimeout, requests.ConnectionError):
            if attempt == 4:
                raise RuntimeError('poll_network_exhausted_resume_with_poll') from None
            time.sleep(delay)
            delay *= 2


def prepare():
    from PIL import Image, ImageOps
    if STATE.exists():
        raise RuntimeError('production_already_started_source_locked')
    canvas = Image.new('RGBA', (960, 960), (8, 10, 15, 255))
    # Derivative for video input only. Remove supplied translucent halos, not identity pixels.
    placements = {'pascal': ((440, 792), (286, 80)), 'nex': ((304, 376), (32, 498)), 'oracle': ((224, 224), (698, 224))}
    for name, (size, position) in placements.items():
        image = Image.open(REFERENCES[name]).convert('RGBA')
        alpha = image.getchannel('A').point(lambda a: max(0, min(255, (a - 128) * 255 // 100)))
        image.putalpha(alpha)
        box = image.getbbox()
        if box:
            image = image.crop(box)
        image = ImageOps.contain(image, size, Image.Resampling.LANCZOS)
        canvas.alpha_composite(image, position)
    WORK.mkdir(parents=True, exist_ok=True)
    canvas.convert('RGB').save(SOURCE, optimize=True)
    print('Produktionsstartbild aus den drei Originalreferenzen vorbereitet', flush=True)


def start():
    import requests
    if os.environ.get('CONFIRM_PAID_VIDEO_TASK') != 'YES':
        raise RuntimeError('explicit_paid_approval_required')
    if not SOURCE.is_file():
        raise RuntimeError('source_missing')
    state = {'status': 'SUBMITTING', 'provider': 'emergent-universal-key', 'endpoint': ENDPOINT, 'duration_seconds': int(DURATION),
             'source_sha256': hashlib.sha256(SOURCE.read_bytes()).hexdigest(),
             'references': {name: {'path': str(path.relative_to(ROOT)), 'sha256': hashlib.sha256(path.read_bytes()).hexdigest()} for name, path in REFERENCES.items()},
             'prompt': PROMPT, 'narration': NARRATION}
    WORK.mkdir(parents=True, exist_ok=True)
    # Atomic exclusive creation guards duplicate paid submission, including uncertain network outcomes.
    with STATE.open('x') as stream:
        json.dump(state, stream, ensure_ascii=False, indent=2)
    payload = {'prompt': PROMPT, 'negative_prompt': NEGATIVE, 'duration': DURATION, 'generate_audio': False, 'cfg_scale': 0.5,
               'start_image_url': 'data:image/png;base64,' + base64.b64encode(SOURCE.read_bytes()).decode()}
    try:
        reply = requests.post(proxy_base() + '/proxy', headers=headers({'X-Fal-Target-Url': 'https://queue.fal.run/' + ENDPOINT}), json=payload, timeout=120)
        if reply.status_code == 402:
            raise RuntimeError('universal_key_insufficient_credits')
        if reply.status_code >= 400:
            raise RuntimeError('submit_http_' + str(reply.status_code) + ':' + reply.text[:300])
        submission = reply.json()
        state.update(status='PENDING', request_id=submission.get('request_id'),
                     status_url=trusted_queue_url(submission['status_url']), response_url=trusted_queue_url(submission['response_url']))
        save(state)
        print('Video-Auftrag erstellt:', state['request_id'], flush=True)
    except (requests.RequestException, KeyError, ValueError) as exc:
        state.update(status='SUBMISSION_UNRESOLVED', error=type(exc).__name__)
        save(state)
        raise RuntimeError('submit_unresolved_do_not_recreate') from None
    except RuntimeError as exc:
        state.update(status='SUBMISSION_FAILED', error=str(exc))
        save(state)
        raise


def poll():
    state = read()
    if not state.get('status_url'):
        raise RuntimeError('no_request_no_new_submission')
    if state.get('downloaded'):
        print('Original bereits gesichert', flush=True)
        return
    for _ in range(150):
        reply = get_with_retry(state['status_url'], 30)
        if reply.status_code >= 400:
            raise RuntimeError('status_http_' + str(reply.status_code))
        body = reply.json()
        status = (body.get('status') or 'UNKNOWN').upper()
        state['status'] = status
        save(state)
        print('Video:', status, 'Position:', body.get('queue_position', '-'), flush=True)
        if status in ('COMPLETED', 'OK'):
            if body.get('error'):
                raise RuntimeError('generation_error')
            result = get_with_retry(state['response_url'], 60)
            if result.status_code >= 400:
                raise RuntimeError('result_http_' + str(result.status_code))
            url = (result.json().get('video') or {}).get('url', '')
            if not url.startswith('https://'):
                raise RuntimeError('output_missing')
            import requests
            with requests.get(url, stream=True, timeout=180) as download, ORIGINAL.with_suffix('.part').open('wb') as stream:
                download.raise_for_status()
                for chunk in download.iter_content(1024 * 1024):
                    stream.write(chunk)
            ORIGINAL.with_suffix('.part').replace(ORIGINAL)
            state['output_sha256'] = hashlib.sha256(ORIGINAL.read_bytes()).hexdigest()
            state['downloaded'] = True
            save(state)
            print('Originalfilm lokal gesichert:', ORIGINAL.stat().st_size, 'Bytes', flush=True)
            return
        if status in ('FAILED', 'CANCELLED', 'CANCELED', 'ERROR'):
            raise RuntimeError('generation_failed_no_automatic_retry')
        time.sleep(6)
    raise RuntimeError('poll_timeout_resume_with_poll_never_start_again')


def voice():
    if NARRATION_FILE.exists():
        print('Bestehende Sprecherdatei wiederverwendet', flush=True)
        return
    if not ORIGINAL.exists():
        raise RuntimeError('video_required_before_voice_cost')
    lock = WORK / 'voice-submission.json'
    with lock.open('x') as stream:
        json.dump({'text': NARRATION, 'status': 'SUBMITTING'}, stream, ensure_ascii=False)
    sys.path.insert(0, str(ROOT / 'apps/agent-gateway'))
    from integrations import SpeechService
    service = SpeechService(os.environ['ELEVENLABS_API_KEY'], os.environ['ELEVENLABS_VOICE_ID'], WORK / 'speech-cache')
    NARRATION_FILE.write_bytes(service.synthesize(NARRATION))
    lock.write_text(json.dumps({'text': NARRATION, 'status': 'SUCCEEDED', 'sha256': hashlib.sha256(NARRATION_FILE.read_bytes()).hexdigest()}, ensure_ascii=False, indent=2))
    print('ElevenLabs Sprecherdatei erzeugt', flush=True)


def ffmpeg():
    try:
        import imageio_ffmpeg
        return imageio_ffmpeg.get_ffmpeg_exe()
    except ImportError:
        return 'ffmpeg'


def merge():
    if not ORIGINAL.exists() or not NARRATION_FILE.exists():
        raise RuntimeError('video_and_voice_required')
    MEDIA.mkdir(parents=True, exist_ok=True)
    # Voice starts 0.6 s after the video, video audio track replaced, output ends with the longer stream padded (apad) then cut to video.
    target = MEDIA / 'hero.mp4'
    # Web delivery: 1080x1080 H.264 High, CRF 23 (approx. 4-5 MB instead of 37 MB original), audio AAC 128k.
    cmd = [ffmpeg(), '-y', '-i', str(ORIGINAL), '-itsoffset', '0.4', '-i', str(NARRATION_FILE),
           '-map', '0:v:0', '-map', '1:a:0', '-vf', 'scale=1080:1080:flags=lanczos', '-c:v', 'libx264', '-preset', 'slow', '-crf', '23',
           '-pix_fmt', 'yuv420p', '-profile:v', 'high', '-c:a', 'aac', '-b:a', '128k', '-shortest', '-movflags', '+faststart', str(target)]
    subprocess.run(cmd, check=True, capture_output=True)
    poster = MEDIA / 'hero-poster.jpg'
    subprocess.run([ffmpeg(), '-y', '-i', str(target), '-frames:v', '1', '-q:v', '3', str(poster)], check=True, capture_output=True)
    (MEDIA / 'hero.vtt').write_text('WEBVTT\n\n00:00.400 --> 00:05.200\nWillkommen bei NeXify. Gemeinsam mit NeX und AI Fly Oracle\n\n00:05.200 --> 00:09.200\nmachen wir aus deinem Vorhaben den nächsten klaren Schritt.\n\n00:09.200 --> 00:13.800\nEine Website, ein Kundenportal oder weniger Routinearbeit? Lass uns beginnen.\n', encoding='utf-8')
    manifest = {'video': 'hero.mp4', 'poster': 'hero-poster.jpg', 'captions': 'hero.vtt', 'duration_seconds': int(DURATION),
                'video_sha256': hashlib.sha256(target.read_bytes()).hexdigest(), 'narration_sha256': hashlib.sha256(NARRATION_FILE.read_bytes()).hexdigest(),
                'provider': 'kling-v3-pro via Emergent Universal Key', 'voice': 'ElevenLabs', 'created_at': datetime.now(timezone.utc).isoformat()}
    (MEDIA / 'manifest.json').write_text(json.dumps(manifest, ensure_ascii=False, indent=2) + '\n')
    state = read()
    state.update(merged=True, hero_sha256=manifest['video_sha256'])
    save(state)
    print('Hero-Video fertig:', target, target.stat().st_size, 'Bytes', flush=True)


if __name__ == '__main__':
    parser = argparse.ArgumentParser()
    parser.add_argument('action', choices=['prepare', 'start', 'poll', 'voice', 'merge'])
    args = parser.parse_args()
    load_env()
    try:
        {'prepare': prepare, 'start': start, 'poll': poll, 'voice': voice, 'merge': merge}[args.action]()
    except (RuntimeError, FileExistsError, KeyError, subprocess.CalledProcessError) as exc:
        print('Gestoppt:', str(exc)[:500], file=sys.stderr)
        sys.exit(1)
