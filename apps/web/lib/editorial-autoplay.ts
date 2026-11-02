type EditorialVideo = Pick<HTMLMediaElement, 'muted' | 'play'>;

/** Respect browser sound policy; a rejected audible start gets one muted attempt. */
export async function autoStartEditorialVideo(video:EditorialVideo, audible:boolean){
 video.muted=!audible;
 try{await video.play();return {playing:true,muted:video.muted};}
 catch{
  if(!audible)return {playing:false,muted:true};
  video.muted=true;
  try{await video.play();return {playing:true,muted:true};}
  catch{return {playing:false,muted:true};}
 }
}
