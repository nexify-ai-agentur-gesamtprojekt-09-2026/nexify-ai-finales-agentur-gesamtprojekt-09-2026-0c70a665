type EditorialVideo = Pick<HTMLMediaElement, 'muted' | 'play'>;

/**
 * Respect browser sound policy; a rejected audible start gets one muted attempt.
 * `audible` is the visitor's own sound choice once they made one (AtelierFilm), otherwise the
 * editorial default of the asset. A resumed film therefore keeps the chosen sound.
 */
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
