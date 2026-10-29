"""Audio-synchroner Portrait-Crop statt Ganzbühnen-LipSync.
Ein isolierter Pascal-Test, keine automatische Freigabe oder Veröffentlichung.
"""
import argparse,json,os,subprocess,math
from pathlib import Path
import cv2
import numpy as np
from produce_home_hero import REV,reserve,Decimal
from produce_welcome import ffmpeg,load_env,submit,poll,LIPSYNC_ENDPOINT,ROOT
OUT=REV/'portrait-test';START=37.26;LENGTH=3.16;FPS=24;SIDE=768


def detector():return cv2.FaceDetectorYN.create('/app/.local/media-tools/face_detection_yunet.onnx','',(640,480),score_threshold=.7)


def prepare():
    OUT.mkdir(exist_ok=True);cap=cv2.VideoCapture(str(REV/'visual-retouched.mp4'));cap.set(cv2.CAP_PROP_POS_MSEC,START*1000)
    detect=detector();records=[];frames=[]
    for i in range(math.ceil(LENGTH*FPS)):
        ok,frame=cap.read()
        if not ok:break
        roi=np.zeros((480,640,3),np.uint8);roi[:480,:640]=frame[:480,640:1280];_,faces=detect.detect(roi)
        if faces is None:raise RuntimeError('face_tracking_gap_abort_without_spend')
        face=max(faces,key=lambda f:f[14]).copy();face[0]+=640
        for k in [4,6,8,10,12]:face[k]+=640
        x,y,w,h=map(float,face[:4]);side=round(max(w,h)*2);cx=x+w*.5;cy=y+h*.62;left=round(cx-side/2);top=max(0,round(cy-side/2))
        if left<0 or top+side>frame.shape[0] or left+side>frame.shape[1]:raise RuntimeError('crop_out_of_frame')
        crop=frame[top:top+side,left:left+side];frames.append(cv2.resize(crop,(SIDE,SIDE),interpolation=cv2.INTER_LANCZOS4))
        records.append({'frame':i,'left':left,'top':top,'side':side,'face':face.tolist()})
    cap.release()
    process=subprocess.Popen([ffmpeg(),'-y','-loglevel','error','-f','rawvideo','-pix_fmt','bgr24','-s',f'{SIDE}x{SIDE}','-r',str(FPS),'-i','pipe:0','-an','-c:v','libx264','-crf','16','-pix_fmt','yuv420p',str(OUT/'portrait-input.mp4')],stdin=subprocess.PIPE,stderr=subprocess.PIPE)
    for frame in frames:process.stdin.write(frame.tobytes())
    process.stdin.close();err=process.stderr.read();code=process.wait()
    if code:raise RuntimeError(err.decode()[-200:])
    (OUT/'tracking.json').write_text(json.dumps({'start':START,'length':LENGTH,'fps':FPS,'records':records,'approval':'none'},indent=2))
    cv2.imwrite(str(OUT/'portrait-frame.jpg'),frames[0]);print('Getrackter Portraitcrop:',len(records),'Frames; Gesichtshöhe rund50%derCrophöhe (nichtBildfläche)')


def send():
    if os.environ.get('CONFIRM_PAID_VIDEO_TASK')!='YES':raise RuntimeError('explicit_paid_approval_required')
    origin=os.environ['APP_PUBLIC_URL'].rstrip('/');name='home-welcome-portrait-pilot';reserve(name,Decimal('.14'))
    submit(name,LIPSYNC_ENDPOINT,{'video_url':origin+'/media/home-review/portrait-input.mp4','audio_url':origin+'/media/home-review/lip-audio-3.mp3'},{'purpose':'isolated face-crop test, not final film','start':START,'seconds':LENGTH,'max_estimated_cost_usd':.14,'crop':'tracked 768x768 portrait','voice_acceptance':False,'release':False})


def collect():
    poll('home-welcome-portrait-pilot',OUT/'portrait-output.mp4')
    original=cv2.VideoCapture(str(REV/'visual-retouched.mp4'));original.set(cv2.CAP_PROP_POS_MSEC,START*1000)
    replacement=cv2.VideoCapture(str(OUT/'portrait-output.mp4'));track=json.loads((OUT/'tracking.json').read_text())['records'];fps=replacement.get(cv2.CAP_PROP_FPS)
    w=int(original.get(cv2.CAP_PROP_FRAME_WIDTH));h=int(original.get(cv2.CAP_PROP_FRAME_HEIGHT))
    encoder=subprocess.Popen([ffmpeg(),'-y','-loglevel','error','-f','rawvideo','-pix_fmt','bgr24','-s',f'{w}x{h}','-r',str(FPS),'-i','pipe:0','-i',str(REV/'lip-audio-3.mp3'),'-c:v','libx264','-crf','17','-c:a','aac','-b:a','192k','-t',str(LENGTH),'-pix_fmt','yuv420p',str(OUT/'portrait-composite-review.mp4')],stdin=subprocess.PIPE,stderr=subprocess.PIPE)
    last=None
    for rec in track:
        ok,frame=original.read()
        if not ok:break
        replacement.set(cv2.CAP_PROP_POS_MSEC,rec['frame']/FPS*1000);good,portrait=replacement.read()
        if good:last=portrait
        if last is None:raise RuntimeError('no_lipsync_output')
        x,y,s=rec['left'],rec['top'],rec['side'];face=rec['face'];patch=cv2.resize(last,(s,s),interpolation=cv2.INTER_LANCZOS4)
        mouthx=(face[10]+face[12])/2-x;mouthy=(face[11]+face[13])/2-y
        mask=np.zeros((s,s),np.float32);cv2.ellipse(mask,(round(mouthx),round(mouthy+face[3]*.08)),(round(face[2]*.49),round(face[3]*.23)),0,0,360,1,-1)
        mask=cv2.GaussianBlur(mask,(0,0),sigmaX=3)[...,None]
        frame[y:y+s,x:x+s]=(frame[y:y+s,x:x+s]*(1-mask)+patch*mask).astype(np.uint8)
        encoder.stdin.write(frame.tobytes())
    original.release();replacement.release();encoder.stdin.close();error=encoder.stderr.read();code=encoder.wait()
    if code:raise RuntimeError(error.decode()[-200:])
    print('NurMundbereichinOriginalfilmkomponiert; isolierte3.16sPrüffassung, keineEndfreigabe')


if __name__=='__main__':
    load_env();p=argparse.ArgumentParser();p.add_argument('action',choices=['prepare','send','collect']);a=p.parse_args();{'prepare':prepare,'send':send,'collect':collect}[a.action]()
