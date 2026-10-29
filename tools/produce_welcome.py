"""NeXify FILM-home-welcome (Masterplan v2, 42-45 s): Pascal, NeX und AIFly begrüßen den Besucher.
Pipeline (jeder Schritt persistent, kein automatischer bezahlter Retry):
  voices   -> ElevenLabs: 4 Dialogzeilen (Pascal/NeX/AIFly/Pascal), Dauern messen
  frame    -> Startbild: Trio frei auf der Markenfläche (kein Studio, kein Rahmen)
  seg N    -> Kling v3 Pro image-to-video (Emergent Universal Key, fal queue via Emergent proxy), 15 s, multi_prompt
  poll N   -> Ergebnis abholen; Endframe wird Startbild des nächsten Segments
  lipsync  -> Kling LipSync für Pascals Sprechpassagen (<= 10 s Clips)
  assemble -> Schnitt, Tonmischung, Export hero.mp4/.webm, Poster, VTT, Manifest
Universal-Key-Client: nur fal Queue-Inferenz über den Emergent-Proxy, keine fal Platform-APIs.
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
WORK = ROOT / '.local/welcome-production'
MEDIA = ROOT / 'apps/web/public/media/runway'
PREVIEW_DIST = ROOT / '.local/emergent-preview-dist/media/welcome-work'
PUBLIC_ORIGIN = os.environ.get('PREVIEW_PUBLIC_ORIGIN', '')
REFERENCES = {
    'pascal': ROOT / 'apps/web/public/media/presenters/pascal-original-6dd03834.png',
    'nex': ROOT / 'apps/web/public/media/presenters/nex-toucan-121a804c.png',
    'oracle': ROOT / 'apps/web/public/media/presenters/ai-fly-oracle-avatar-9f705e5b.png',
}
VIDEO_ENDPOINT = 'fal-ai/kling-video/v3/pro/image-to-video'
LIPSYNC_ENDPOINT = 'fal-ai/kling-video/lipsync/audio-to-video'
W, H = 1920, 1080

# Masterplan v2 FILM-home-welcome, vollständiger Originaldialog (82 Wörter).
LINES = [
    ('pascal_1', 'pascal', 'Hallo, ich bin Pascal. Willkommen bei NeXify! Schön, dass du da bist. Wir schauen gemeinsam, was dein Unternehmen wirklich braucht – und wie deine vorhandenen Systeme dabei helfen können.'),
    ('nex', 'nex', 'Ich bin NeX. Geht es um eine Website, einen automatisierten Ablauf oder ein Kundenportal? Du kannst hier direkt deinen Einstieg wählen.'),
    ('oracle', 'oracle', 'Und ich bin AI Fly Oracle. Ich helfe dir, dein Vorhaben zu ordnen, offene Fragen sichtbar zu machen und den nächsten Schritt vorzubereiten.'),
    ('pascal_2', 'pascal', 'Schau dich in Ruhe um. Womit möchtest du anfangen?'),
]
VOICES = {'pascal': None, 'nex': 'fzqS9sNPYJhLlhsfDm0l', 'oracle': 'TVGn2JVJHeMuzxos8a3h'}  # pascal = ELEVENLABS_VOICE_ID (Otto)

SCENE = ('Static wide shot, dark green-black brand floor with faint light arcs. Man in navy jacket, white tee, grey trousers, white sneakers; black round toucan robot with lime wings; small yellow cloud Oracle with bowler hat and monocle, floating. All bodies and feet fully in frame, identities unchanged. No text, no frame. ')
NEGATIVE = 'blur, distort, low quality, text, captions, subtitles, logo, extra characters, camera zoom, camera movement, cropping feet, cropping heads, frame, border, studio backdrop'

# Segmente: 3 x 15 s = 45 s. Zeiten innerhalb des Segments.
SEGMENTS = [
    [(4, 'Pascal and the toucan walk in with relaxed steps, Pascal laughing warmly, glancing at the toucan, then an open-hand gesture toward the Oracle gliding beside them. They stop.'),
     (11, 'Pascal faces the viewer and speaks warmly, lips moving naturally, small open-hand welcoming gesture, genuine laugh and smile between sentences. The toucan and the Oracle listen.')],
    [(1, 'Pascal finishes speaking with a warm smile and turns his head slightly toward the toucan.'),
     (9, 'The toucan turns to the viewer and lifts one lime wing in a friendly gesture as if speaking, head tilting lively. Pascal and the Oracle listen attentively.'),
     (5, 'The Oracle glides slightly forward and bobs calmly as if explaining, monocle catching light. Pascal and the toucan turn toward it and listen.')],
    [(5, 'The Oracle keeps floating calmly in front with small smooth movements as if explaining. Pascal nods, the toucan listens.'),
     (4, 'Pascal looks at the viewer again and speaks warmly with a small inviting gesture, lips moving naturally, friendly smile.'),
     (6, 'All three settle into a calm friendly final pose facing the viewer. Pascal smiles, the toucan stands still, the Oracle hovers gently.')],
]


def load_env():
    from dotenv import load_dotenv
    load_dotenv(ROOT / 'backend/.env', override=False)


def state_path(name):
    return WORK / (name + '.json')


def read(name):
    p = state_path(name)
    return json.loads(p.read_text()) if p.exists() else {}


def save(name, data):
    WORK.mkdir(parents=True, exist_ok=True)
    data['updated_at'] = datetime.now(timezone.utc).isoformat()
    tmp = state_path(name).with_suffix('.tmp')
    tmp.write_text(json.dumps(data, ensure_ascii=False, indent=2) + '\n')
    tmp.replace(state_path(name))


def ffmpeg():
    import imageio_ffmpeg
    return imageio_ffmpeg.get_ffmpeg_exe()


def run(cmd):
    subprocess.run(cmd, check=True, capture_output=True)


def duration(path):
    out = subprocess.run([ffmpeg(), '-i', str(path)], capture_output=True, text=True).stderr
    for line in out.splitlines():
        if 'Duration:' in line:
            h, m, s = line.split('Duration:')[1].split(',')[0].strip().split(':')
            return int(h) * 3600 + int(m) * 60 + float(s)
    raise RuntimeError('duration_unknown')


# ---------- Universal Key media client (fal queue through Emergent proxy only) ----------
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


def trusted(value):
    base = urlparse(proxy_base() + '/queue')
    url = urlparse(value)
    if url.scheme != base.scheme or url.netloc != base.netloc or not url.path.startswith(base.path.rstrip('/') + '/'):
        raise RuntimeError('untrusted_queue_url')
    return value


def submit(name, endpoint, payload, meta):
    """Exactly one paid submission per state name; exclusive file creation blocks duplicates."""
    import requests
    if os.environ.get('CONFIRM_PAID_VIDEO_TASK') != 'YES':
        raise RuntimeError('explicit_paid_approval_required')
    WORK.mkdir(parents=True, exist_ok=True)
    state = {'status': 'SUBMITTING', 'endpoint': endpoint, **meta}
    with state_path(name).open('x') as stream:
        json.dump(state, stream, ensure_ascii=False, indent=2)
    try:
        reply = requests.post(proxy_base() + '/proxy', headers=headers({'X-Fal-Target-Url': 'https://queue.fal.run/' + endpoint}), json=payload, timeout=180)
        if reply.status_code == 402:
            raise RuntimeError('universal_key_insufficient_credits')
        if reply.status_code >= 400:
            raise RuntimeError('submit_http_%s:%s' % (reply.status_code, reply.text[:300]))
        sub = reply.json()
        state.update(status='PENDING', request_id=sub.get('request_id'), status_url=trusted(sub['status_url']), response_url=trusted(sub['response_url']))
        save(name, state)
        print('Auftrag', name, 'erstellt:', state['request_id'], flush=True)
    except (requests.RequestException, KeyError, ValueError) as exc:
        state.update(status='SUBMISSION_UNRESOLVED', error=type(exc).__name__)
        save(name, state)
        raise RuntimeError('submit_unresolved_do_not_recreate') from None
    except RuntimeError as exc:
        state.update(status='SUBMISSION_FAILED', error=str(exc))
        save(name, state)
        raise


def get_retry(url, timeout):
    import requests
    delay = 1
    for attempt in range(5):
        try:
            return requests.get(url, headers=headers(), timeout=timeout)
        except (requests.ConnectTimeout, requests.ReadTimeout, requests.ConnectionError):
            if attempt == 4:
                raise RuntimeError('poll_network_exhausted') from None
            time.sleep(delay)
            delay *= 2


def poll(name, target: Path):
    import requests
    state = read(name)
    if not state.get('status_url'):
        raise RuntimeError('no_request_for_' + name)
    if state.get('downloaded'):
        print(name, 'bereits gesichert', flush=True)
        return
    for _ in range(200):
        reply = get_retry(state['status_url'], 30)
        if reply.status_code >= 400:
            raise RuntimeError('status_http_' + str(reply.status_code))
        body = reply.json()
        status = (body.get('status') or 'UNKNOWN').upper()
        state['status'] = status
        save(name, state)
        print(name, status, flush=True)
        if status in ('COMPLETED', 'OK'):
            res = get_retry(state['response_url'], 60)
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
            state.update(downloaded=True, output_sha256=hashlib.sha256(target.read_bytes()).hexdigest(), seconds=duration(target))
            save(name, state)
            print(name, 'gesichert:', target.stat().st_size, 'Bytes,', state['seconds'], 's', flush=True)
            return
        if status in ('FAILED', 'CANCELLED', 'CANCELED', 'ERROR'):
            raise RuntimeError('generation_failed_no_automatic_retry')
        time.sleep(6)
    raise RuntimeError('poll_timeout_resume_with_poll')


# ---------- Schritte ----------
def voices():
    import requests
    WORK.mkdir(parents=True, exist_ok=True)
    key = os.environ['ELEVENLABS_API_KEY']
    report = read('voices')
    for name, speaker, text in LINES:
        target = WORK / ('voice-%s.mp3' % name)
        if target.exists():
            continue
        voice = VOICES[speaker] or os.environ['ELEVENLABS_VOICE_ID']
        reply = requests.post('https://api.elevenlabs.io/v1/text-to-speech/%s?output_format=mp3_44100_128' % voice,
                              headers={'xi-api-key': key, 'Accept': 'audio/mpeg'},
                              json={'text': text, 'model_id': 'eleven_multilingual_v2', 'voice_settings': {'stability': 0.45, 'similarity_boost': 0.8, 'style': 0.35}}, timeout=60)
        if reply.status_code >= 400 or not reply.headers.get('content-type', '').startswith('audio/'):
            raise RuntimeError('elevenlabs_http_%s' % reply.status_code)
        target.write_bytes(reply.content)
        report[name] = {'speaker': speaker, 'seconds': round(duration(target), 2), 'sha256': hashlib.sha256(reply.content).hexdigest()}
        save('voices', report)
        print(name, report[name]['seconds'], 's', flush=True)
    print(json.dumps({k: v['seconds'] for k, v in report.items() if isinstance(v, dict)}, indent=1), flush=True)


def frame():
    """Startbild 1920x1080: Markenfläche (Grün-Schwarz, Lime/Cyan-Lichtbögen, spiegelnder Boden) + Trio frei rechts, Text-Freiraum links oben."""
    import numpy as np
    from PIL import Image, ImageDraw, ImageFilter, ImageOps
    WORK.mkdir(parents=True, exist_ok=True)
    base = np.zeros((H, W, 3), dtype=float)
    ys = np.linspace(0, 1, H)[:, None]
    base[..., 0] = 4 + 7 * ys; base[..., 1] = 7 + 13 * ys; base[..., 2] = 6 + 10 * ys
    # Bodenlinie: ab 78% Höhe leicht aufgehellter, spiegelnder Boden
    floor = np.clip((ys - 0.78) / 0.22, 0, 1)
    base[..., 0] += 6 * floor; base[..., 1] += 9 * floor; base[..., 2] += 9 * floor
    bg = Image.fromarray(np.clip(base, 0, 255).astype('uint8'))
    # Lichtbögen (lime + cyan), weich
    arcs = Image.new('RGB', (W, H), (0, 0, 0)); ad = ImageDraw.Draw(arcs)
    for box, width, col in [((-300, 80, W + 500, H + 900), 7, (140, 190, 40)), ((-100, 220, W + 700, H + 1100), 5, (100, 150, 30)),
                            ((200, 380, W + 900, H + 1300), 4, (60, 150, 160)), ((500, 520, W + 1100, H + 1500), 3, (40, 110, 130))]:
        ad.arc(box, start=195, end=335, fill=col, width=width)
    arcs = arcs.filter(ImageFilter.GaussianBlur(9))
    glow = Image.new('RGB', (W, H), (0, 0, 0)); gd = ImageDraw.Draw(glow)
    gd.ellipse((W * 0.35, H * 0.82, W * 1.05, H * 1.08), fill=(16, 28, 10))
    gd.ellipse((W * 0.70, -H * 0.15, W * 1.25, H * 0.40), fill=(8, 22, 9))
    gd.ellipse((W * 0.78, H * 0.60, W * 1.10, H * 0.95), fill=(5, 20, 28))
    glow = glow.filter(ImageFilter.GaussianBlur(140))
    merged = np.clip(np.asarray(bg).astype(int) + np.asarray(arcs).astype(int) * 0.32 + np.asarray(glow).astype(int), 0, 255).astype('uint8')
    bg = Image.fromarray(merged).convert('RGBA')
    # Figuren nach Mock: NeX links unten groß, Pascal mittig-rechts, AIFly rechts oben
    placements = {'pascal': ((520, 820), (960, 184)), 'nex': ((400, 470), (520, 513)), 'oracle': ((260, 260), (1430, 330))}
    figures = {}
    for name, (size, pos) in placements.items():
        image = Image.open(REFERENCES[name]).convert('RGBA')
        alpha = image.getchannel('A').point(lambda a: max(0, min(255, (a - 128) * 255 // 100)))
        image.putalpha(alpha)
        box = image.getbbox()
        if box:
            image = image.crop(box)
        figures[name] = (ImageOps.contain(image, size, Image.Resampling.LANCZOS), pos)
    shadows = Image.new('RGBA', (W, H), (0, 0, 0, 0)); sd = ImageDraw.Draw(shadows)
    for name, (img, (x, y)) in figures.items():
        fy = y + img.height
        if name == 'oracle':
            sd.ellipse((x + 40, H - 50, x + img.width - 40, H - 20), fill=(0, 0, 0, 60))
        else:
            sd.ellipse((x + 20, fy - 22, x + img.width - 20, fy + 16), fill=(0, 0, 0, 190))
    out = Image.alpha_composite(bg, shadows.filter(ImageFilter.GaussianBlur(16)))
    for name in ('nex', 'pascal', 'oracle'):
        img, pos = figures[name]
        out.alpha_composite(img, pos)
    out.convert('RGB').save(WORK / 'frame-0.png', optimize=True)
    print('Startbild gespeichert:', WORK / 'frame-0.png', flush=True)


def data_uri(path, mime):
    return 'data:%s;base64,' % mime + base64.b64encode(Path(path).read_bytes()).decode()


def seg(index: int):
    start = WORK / ('frame-%d.png' % index)
    if not start.exists():
        raise RuntimeError('start_frame_missing_%d' % index)
    shots = SEGMENTS[index]
    payload = {'start_image_url': data_uri(start, 'image/png'), 'duration': str(sum(d for d, _ in shots)), 'generate_audio': False, 'cfg_scale': 0.5,
               'negative_prompt': NEGATIVE, 'shot_type': 'customize',
               'multi_prompt': [{'prompt': SCENE + ' ' + text, 'duration': str(d)} for d, text in shots]}
    submit('seg-%d' % index, VIDEO_ENDPOINT, payload, {'segment': index, 'start_sha256': hashlib.sha256(start.read_bytes()).hexdigest(), 'shots': shots})


def poll_seg(index: int):
    target = WORK / ('seg-%d.mp4' % index)
    poll('seg-%d' % index, target)
    nxt = WORK / ('frame-%d.png' % (index + 1))
    if not nxt.exists():
        # letzter Frame als Startbild des nächsten Segments
        run([ffmpeg(), '-y', '-sseof', '-0.05', '-i', str(target), '-frames:v', '1', '-q:v', '1', str(nxt)])
        print('Endframe ->', nxt, flush=True)


def publish_work(path: Path) -> str:
    """Macht eine Arbeitsdatei kurzzeitig über den Preview-Server öffentlich (für Lipsync-Eingaben)."""
    PREVIEW_DIST.mkdir(parents=True, exist_ok=True)
    dst = PREVIEW_DIST / path.name
    dst.write_bytes(path.read_bytes())
    origin = os.environ.get('PREVIEW_PUBLIC_ORIGIN', '')
    if not origin:
        raise RuntimeError('PREVIEW_PUBLIC_ORIGIN_missing')
    return origin.rstrip('/') + '/media/welcome-work/' + path.name


def lipsync(clip: str, video: str, audio: str):
    """clip = state name, video/audio = Pfade (<=10 s Video, 2..60 s Audio)."""
    v = Path(video); a = Path(audio)
    if duration(v) > 10.05:
        raise RuntimeError('lipsync_video_longer_than_10s')
    payload = {'video_url': publish_work(v), 'audio_url': publish_work(a)}
    submit(clip, LIPSYNC_ENDPOINT, payload, {'video': v.name, 'audio': a.name})


# ---------- Schnitt / Export ----------
def _enc(args_in, out, extra=None):
    cmd = [ffmpeg(), '-y', '-loglevel', 'error', *args_in, *(extra or []), str(out)]
    run(cmd)


def assemble(final_seconds: float = 43.6):
    """Schnitt: seg0[0,4) + Lipsync A + Lipsync B, dann seg1, seg2 (weiche 0.3 s Überblendung), Tonmischung, Export."""
    import json as _json
    FF = ffmpeg()
    V = lambda n: str(WORK / n)
    norm = ['-vf', 'scale=1920:1080:flags=lanczos,fps=24,format=yuv420p', '-c:v', 'libx264', '-preset', 'medium', '-crf', '17', '-an']
    # Teile normieren
    _enc(['-t', '4', '-i', V('seg-0.mp4')], WORK / 'p-intro.mp4', norm)
    _enc(['-i', V('lip-a.mp4')], WORK / 'p-lipa.mp4', norm)
    _enc(['-i', V('lip-b.mp4')], WORK / 'p-lipb.mp4', norm)
    _enc(['-i', V('seg-1.mp4')], WORK / 'p-seg1.mp4', norm)
    seg2_src = V('lip-c-merged.mp4') if (WORK / 'lip-c-merged.mp4').exists() else V('seg-2.mp4')
    _enc(['-i', seg2_src], WORK / 'p-seg2.mp4', norm)
    (WORK / 'concat0.txt').write_text(''.join("file '%s'\n" % (WORK / n) for n in ('p-intro.mp4', 'p-lipa.mp4', 'p-lipb.mp4')))
    _enc(['-f', 'concat', '-safe', '0', '-i', V('concat0.txt')], WORK / 'p-seg0.mp4', ['-c', 'copy'])
    d0, d1 = duration(WORK / 'p-seg0.mp4'), duration(WORK / 'p-seg1.mp4')
    fade = 0.3
    off1 = round(d0 - fade, 3); off2 = round(off1 + d1 - fade, 3)
    _enc(['-i', V('p-seg0.mp4'), '-i', V('p-seg1.mp4'), '-i', V('p-seg2.mp4'), '-filter_complex',
          '[0:v][1:v]xfade=transition=fade:duration=%s:offset=%s[v01];[v01][2:v]xfade=transition=fade:duration=%s:offset=%s[v]' % (fade, off1, fade, off2),
          '-map', '[v]', '-t', str(final_seconds)], WORK / 'video-silent.mp4', ['-c:v', 'libx264', '-preset', 'medium', '-crf', '17', '-pix_fmt', 'yuv420p'])
    # Tonspur: Einsatzzeiten (ms) laut Regie; seg1 beginnt bei d0-fade, seg2 bei off2
    starts = {'pascal_1': 4.0, 'nex': off1 + 1.3, 'oracle': off1 + 11.0, 'pascal_2': off2 + 5.8}
    inputs, filters, labels = [], [], []
    for i, (name, at) in enumerate(starts.items()):
        inputs += ['-i', V('voice-%s.mp3' % name)]
        filters.append('[%d:a]aformat=sample_rates=48000:channel_layouts=stereo,adelay=%d|%d[a%d]' % (i + 1, int(at * 1000), int(at * 1000), i))
        labels.append('[a%d]' % i)
    filters.append('%samix=inputs=%d:normalize=0,afade=t=out:st=%s:d=1.2[a]' % (''.join(labels), len(labels), final_seconds - 1.2))
    _enc(['-i', V('video-silent.mp4'), *inputs, '-filter_complex', ';'.join(filters), '-map', '0:v', '-map', '[a]', '-t', str(final_seconds)],
         WORK / 'welcome-master.mp4', ['-c:v', 'copy', '-c:a', 'aac', '-b:a', '160k', '-movflags', '+faststart'])
    MEDIA.mkdir(parents=True, exist_ok=True)
    # Web-Exporte
    _enc(['-i', V('welcome-master.mp4')], MEDIA / 'hero.mp4', ['-vf', 'scale=1600:900', '-c:v', 'libx264', '-preset', 'slow', '-crf', '23', '-pix_fmt', 'yuv420p', '-profile:v', 'high', '-c:a', 'aac', '-b:a', '128k', '-movflags', '+faststart'])
    _enc(['-i', V('welcome-master.mp4')], MEDIA / 'hero.webm', ['-vf', 'scale=1600:900', '-c:v', 'libvpx-vp9', '-b:v', '0', '-crf', '33', '-deadline', 'good', '-cpu-used', '4', '-row-mt', '1', '-c:a', 'libopus', '-b:a', '96k'])
    _enc(['-ss', '13.5', '-i', V('welcome-master.mp4'), '-frames:v', '1', '-q:v', '2'], MEDIA / 'hero-poster.jpg')
    def ts(x):
        m, s = divmod(x, 60); return '%02d:%06.3f' % (m, s)
    cues = [(starts['pascal_1'], starts['pascal_1'] + 11.2, LINES[0][2]), (starts['nex'], starts['nex'] + 8.9, LINES[1][2]), (starts['oracle'], starts['oracle'] + 9.0, LINES[2][2]), (starts['pascal_2'], starts['pascal_2'] + 3.6, LINES[3][2])]
    (MEDIA / 'hero.vtt').write_text('WEBVTT\n\n' + ''.join('%s --> %s\n%s\n\n' % (ts(a), ts(b), t) for a, b, t in cues), encoding='utf-8')
    manifest = {'id': 'FILM-home-welcome', 'route': '/', 'section': 'H00', 'video': 'hero.mp4', 'video_webm': 'hero.webm', 'poster': 'hero-poster.jpg', 'captions': 'hero.vtt',
                'duration_seconds': round(duration(MEDIA / 'hero.mp4'), 2), 'words': sum(len(l[2].split()) for l in LINES),
                'video_sha256': hashlib.sha256((MEDIA / 'hero.mp4').read_bytes()).hexdigest(),
                'references': {n: hashlib.sha256(p.read_bytes()).hexdigest() for n, p in REFERENCES.items()},
                'provider': 'Kling v3 Pro (image-to-video, multi_prompt) + Kling LipSync via Emergent Universal Key', 'voice': 'ElevenLabs eleven_multilingual_v2 (Otto, Mark, Peter)',
                'created_at': datetime.now(timezone.utc).isoformat(), 'status': 'produced_pending_owner_review'}
    (MEDIA / 'manifest.json').write_text(_json.dumps(manifest, ensure_ascii=False, indent=2) + '\n')
    print('Fertig:', manifest['duration_seconds'], 's ->', MEDIA / 'hero.mp4', flush=True)


# Qualitätsprobe: keine verketteten KI-Endframes als neue Identitätsquelle.
# Preisvertrag am 29.10.2026 aus dem exakten Kling-v3-Pro-Katalog: 0.14 USD/s
# ohne native Audiospur. Ein einzelner 5-s-Auftrag; kein automatischer Ersatzauftrag.
def identity_probe_frame():
    from PIL import Image, ImageOps
    stage = Image.new('RGBA', (1600, 1000), (8, 10, 15, 255))
    placements = {'nex': ((460, 530), (80, 414)), 'pascal': ((590, 928), (580, 32)), 'oracle': ((320, 320), (1210, 220))}
    for name, (size, pos) in placements.items():
        image = Image.open(REFERENCES[name]).convert('RGBA')
        image.putalpha(image.getchannel('A').point(lambda a: max(0, min(255, (a - 128) * 255 // 100))))
        box = image.getbbox()
        if not box:
            raise RuntimeError('empty_reference_' + name)
        image = ImageOps.contain(image.crop(box), size, Image.Resampling.LANCZOS)
        stage.alpha_composite(image, pos)
    WORK.mkdir(parents=True, exist_ok=True)
    stage.convert('RGB').save(WORK / 'identity-probe-frame.png')
    # Zusätzliches Gesichtsdetail aus ORIGINAL, kein erfundener Seitenwinkel.
    original = Image.open(REFERENCES['pascal']).convert('RGB')
    original.crop((350, 20, 680, 350)).save(WORK / 'pascal-reference-detail.png')
    print('Identitätsprobe vorbereitet: Originalreferenzen, durchgehender Graphitgrund')


def identity_probe():
    # Isolierter Kostendeckel dieses Nachbesserungsauftrags. Keine alten Jobs
    # nachberechnen oder zurücksetzen. Unklarer Submit bleibt gesperrt.
    if os.environ.get('CONFIRM_PAID_VIDEO_TASK') != 'YES':
        raise RuntimeError('explicit_paid_approval_required')
    frame_path = WORK / 'identity-probe-frame.png'
    face_path = WORK / 'pascal-reference-detail.png'
    if not frame_path.exists() or not face_path.exists():
        raise RuntimeError('identity_probe_frame_required')
    prompt = ('Locked tripod, single uncut wide shot of EXACTLY the three subjects in the start image. '
              'The real man @Element1 is Pascal. Preserve his exact facial geometry, age, eye shape, short dark hair, beard, body proportions, necklace and clothing from the reference. '
              'He breathes naturally, blinks once, gives a very subtle closed-mouth smile and a small relaxed open-palm welcome gesture. '
              'No laughing, no broad grin, no exaggerated expressions, no beauty retouch. Feet stay planted and fully visible. '
              'The toucan makes one gentle attentive head tilt. The small Oracle hovers subtly without changing its silhouette, hat or monocle; it has NO mouth. '
              'Keep the flat dark graphite background RGB 8 10 15, static even lighting, no seams, no light arcs, no gradients. '
              'No cuts, no zoom, no camera movement. All three bodies remain fully inside the frame with safe margins.')
    payload = {'start_image_url': data_uri(frame_path, 'image/png'), 'duration': '5', 'generate_audio': False,
               'cfg_scale': 0.7, 'prompt': prompt,
               'elements': [{'frontal_image_url': data_uri(REFERENCES['pascal'], 'image/png'),
                             'reference_image_urls': [data_uri(face_path, 'image/png')]}],
               'negative_prompt': NEGATIVE + ', face morph, different man, younger man, plastic skin, broad smile, laugh, open mouth, big teeth, moving background, light arcs, mouth on Oracle'}
    submit('identity-probe-v1', VIDEO_ENDPOINT, payload, {
        'purpose': 'identity_quality_probe_not_final_film', 'budget_limit_usd': 10,
        'estimated_cost_usd': 0.70, 'reserved_budget_usd': 1.40,
        'price_source': 'selected model catalog 2026-10-29, USD 0.14 per second without audio',
        'original_references': {n: hashlib.sha256(p.read_bytes()).hexdigest() for n, p in REFERENCES.items()}})


if __name__ == '__main__':
    parser = argparse.ArgumentParser()
    parser.add_argument('action', choices=['voices', 'frame', 'seg', 'poll', 'lipsync', 'poll-clip', 'assemble'])
    parser.add_argument('args', nargs='*')
    args = parser.parse_args()
    load_env()
    try:
        if args.action == 'voices':
            voices()
        elif args.action == 'frame':
            frame()
        elif args.action == 'seg':
            seg(int(args.args[0]))
        elif args.action == 'poll':
            poll_seg(int(args.args[0]))
        elif args.action == 'lipsync':
            lipsync(args.args[0], args.args[1], args.args[2])
        elif args.action == 'poll-clip':
            poll(args.args[0], WORK / (args.args[0] + '.mp4'))
        elif args.action == 'assemble':
            assemble()
    except (RuntimeError, FileExistsError, KeyError, subprocess.CalledProcessError) as exc:
        print('Gestoppt:', str(exc)[:600], file=sys.stderr)
        sys.exit(1)


