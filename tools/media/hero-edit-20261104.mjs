/** Paired native A/V editorial cut. No audio is shifted onto a different mouth image. */
import {readFileSync} from 'node:fs';
import {spawnSync} from 'node:child_process';
const [input,output]=process.argv.slice(2);
if(!input||!output||input===output)throw new Error('Provide distinct input.webm and new output.webm');
const config=JSON.parse(readFileSync(new URL('../../config/hero-film.json',import.meta.url),'utf8'));
const cuts=config.editorial_edit.segments_seconds;
const n=cuts.length,filters=[`[0:v]split=${n}${cuts.map((_,i)=>`[v${i}]`).join('')}`,`[0:a]asplit=${n}${cuts.map((_,i)=>`[a${i}]`).join('')}`];
for(const [i,[start,end]] of cuts.entries()){
 if(!Number.isFinite(start)||!Number.isFinite(end)||start<0||end<=start)throw new Error('Invalid cut');
 filters.push(`[v${i}]trim=start=${start}:end=${end},setpts=PTS-STARTPTS[vv${i}]`,`[a${i}]atrim=start=${start}:end=${end},asetpts=PTS-STARTPTS[aa${i}]`);
}
filters.push(`${cuts.map((_,i)=>`[vv${i}][aa${i}]`).join('')}concat=n=${n}:v=1:a=1[v][a]`);
filters.push('[a]loudnorm=I=-16:TP=-2.5:LRA=9:measured_I=-15.76:measured_TP=-0.73:measured_LRA=20.60:measured_thresh=-27.30:offset=-0.19:linear=false[am]');
const r=spawnSync('ffmpeg',['-nostdin','-v','error','-n','-c:v','libvpx-vp9','-i',input,'-filter_complex',filters.join(';'),'-map','[v]','-map','[am]','-c:v','libvpx-vp9','-pix_fmt','yuva420p','-auto-alt-ref','0','-row-mt','1','-threads','4','-crf','26','-b:v','0','-c:a','libopus','-b:a','128k','-ar','48000',output],{stdio:'inherit'});
process.exitCode=r.status??1;
