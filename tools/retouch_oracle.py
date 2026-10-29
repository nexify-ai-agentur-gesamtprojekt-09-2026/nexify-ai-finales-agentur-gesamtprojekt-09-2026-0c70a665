"""Lokale VFX-Korrektur unzulässiger Mundartefakte am ansonsten referenztreuen Oracle.
Keine neue Identität, kein Eingriff in Pascal/NeX. Originalfilm bleibt unverändert.
Abnahme bleibt offen; diagnostische Masken und Framezahlen werden gesichert.
"""
import argparse,json,sys,subprocess
from pathlib import Path
import numpy as np
import cv2
from produce_home_hero import REV
from produce_welcome import ffmpeg


def retouch(frame):
    h,w=frame.shape[:2];x0=int(w*.70);y0=int(h*.10);x1=w;y1=int(h*.70)
    roi=frame[y0:y1,x0:x1];hsv=cv2.cvtColor(roi,cv2.COLOR_BGR2HSV)
    lime=cv2.inRange(hsv,np.array([20,90,70],np.uint8),np.array([55,255,255],np.uint8))
    contours,_=cv2.findContours(lime,cv2.RETR_EXTERNAL,cv2.CHAIN_APPROX_SIMPLE)
    mask=np.zeros(roi.shape[:2],np.uint8)
    if not contours:return frame,mask,(x0,y0)
    outer=max(contours,key=cv2.contourArea);area=cv2.contourArea(outer)
    if area<1000:return frame,mask,(x0,y0)
    x,y,bw,bh=cv2.boundingRect(outer)
    fill=np.zeros_like(mask);cv2.drawContours(fill,[outer],-1,255,-1)
    # Innere dunkle Komponenten, nicht Silhouette. Oberes Gesicht und rechtes
    # Monokel einschließlich Kette liegen ausdrücklich außerhalb der Zone.
    dark=cv2.inRange(hsv,np.array([0,0,0],np.uint8),np.array([179,255,86],np.uint8))
    dark=cv2.bitwise_and(dark,fill)
    holes,_=cv2.findContours(dark,cv2.RETR_EXTERNAL,cv2.CHAIN_APPROX_SIMPLE)
    for hole in holes:
        m=cv2.moments(hole)
        if not m['m00']:continue
        cx=(m['m10']/m['m00']-x)/bw;cy=(m['m01']/m['m00']-y)/bh
        size=cv2.contourArea(hole)/area
        if .19<cx<.60 and .53<cy<.90 and .0008<size<.12:
            cv2.drawContours(mask,[hole],-1,255,-1)
    if mask.any():
        mask=cv2.dilate(mask,np.ones((5,5),np.uint8),iterations=1)
        fixed=cv2.inpaint(roi,mask,9,cv2.INPAINT_TELEA)
    else:
        fixed=roi.copy()
    # Nur farbige Oracle-Fläche glätten, Augen/Hut/Monokel bleiben pixelgetreu.
    smooth=cv2.bilateralFilter(fixed,9,55,12)
    material=cv2.GaussianBlur(lime,(5,5),0).astype(np.float32)[...,None]/255
    fixed=np.clip(fixed*(1-material)+smooth*material,0,255).astype(np.uint8)
    frame=frame.copy();frame[y0:y1,x0:x1]=fixed
    return frame,mask,(x0,y0)


def run(preview=False):
    cap=cv2.VideoCapture(str(REV/'visual-master.mp4'))
    if not cap.isOpened():raise RuntimeError('video_read_failed')
    fps=cap.get(cv2.CAP_PROP_FPS);w=int(cap.get(cv2.CAP_PROP_FRAME_WIDTH));h=int(cap.get(cv2.CAP_PROP_FRAME_HEIGHT))
    if preview:
        for sec in [0,5,10,15,20,25,30,35,40,43]:
            cap.set(cv2.CAP_PROP_POS_MSEC,sec*1000);ok,frame=cap.read()
            if not ok:continue
            fixed,mask,(x,y)=retouch(frame)
            diagnostic=np.concatenate([frame,fixed],axis=1)
            cv2.imwrite(str(REV/f'retouch-{sec}.jpg'),diagnostic)
            print(sec,int(np.count_nonzero(mask)))
        cap.release();return
    cmd=[ffmpeg(),'-y','-loglevel','error','-f','rawvideo','-pix_fmt','bgr24','-s',f'{w}x{h}','-r',str(fps),'-i','pipe:0','-an','-c:v','libx264','-crf','17','-pix_fmt','yuv420p',str(REV/'visual-retouched.mp4')]
    process=subprocess.Popen(cmd,stdin=subprocess.PIPE,stderr=subprocess.PIPE)
    frames=0;changed=[]
    try:
        while True:
            ok,frame=cap.read()
            if not ok:break
            fixed,mask,_=retouch(frame);process.stdin.write(fixed.tobytes())
            count=int(np.count_nonzero(mask))
            if count:changed.append({'frame':frames,'pixels':count})
            frames+=1
    finally:
        cap.release();process.stdin.close()
    error=process.stderr.read();code=process.wait()
    if code:raise RuntimeError('retouch_export_failed_'+error.decode()[-200:])
    (REV/'retouch-report.json').write_text(json.dumps({'scope':'Oracle lower-face artifacts only; manual visual review required','frames':frames,'fps':fps,'frame_size':[w,h],'changed_frames':changed,'pascal_and_nex_roi_excluded':True,'approved':False},indent=2))
    print('Retusche exportiert',frames,'Frames;',len(changed),'korrigiert, Abnahme offen')


if __name__=='__main__':
    p=argparse.ArgumentParser();p.add_argument('--preview',action='store_true');run(p.parse_args().preview)
