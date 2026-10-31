/**
 * Home scene contracts (Masterplan v2 §8.4/§8.7 PUB-home): FILM-home-welcome (H00),
 * FILM-home-project (S01), FILM-home-choice (S02).
 *
 * Cue timings mirror the produced ElevenLabs tracks and their VTT files in
 * /media/home-review/*.vtt. Texts are the customer dialogue from the Masterplan.
 * Figures are pixel-exact cut-outs from the approved Zielbild (no generative edit),
 * see tools/extract_zielbild_figures.py and media/presenters/zielbild-figures.manifest.json.
 */
export type Speaker='pascal'|'nex'|'oracle';
export type SceneCue={speaker:Speaker;start:number;end:number;text:string};
export type SceneSpec={
 id:'welcome'|'project'|'choice';
 filmId:string;
 audioSrc:string;
 captionsSrc:string;
 entranceSeconds:number;
 endHoldSeconds:number;
 cues:SceneCue[];
};

export const speakerNames:Record<Speaker,string>={pascal:'Pascal',nex:'NeX',oracle:'AI Fly Oracle'};

export const sceneFigures={
 pascalWalk:'/media/presenters/zielbild-pascal-walk.png',
 pascalStand:'/media/presenters/pascal-original-6dd03834.png',
 nexWalk:'/media/presenters/zielbild-nex-walk.png',
 nexStand:'/media/presenters/nex-toucan-121a804c.png',
 oracle:'/media/presenters/zielbild-aifly-float.png'
} as const;

/**
 * Real loop clips (Kling v3 Pro image-to-video, Emergent Universal Key) rendered from the composed
 * brand-stage frames (tools/compose_loop_frames.py → tools/produce_loops.py). Start = end frame, so the
 * loops are seamless; the welcome intro walks the trio into the loop pose once. No face edits, no lip-sync.
 * Published under apps/web/public/media/home-loops/ (manifest.json with SHA256).
 */
const clip=(name:string)=>({mp4:`/media/home-loops/${name}.mp4`,webm:`/media/home-loops/${name}.webm`});
export const sceneMedia={
 welcome:{intro:clip('welcome-intro'),loop:clip('welcome-loop'),poster:'/media/home-loops/welcome-loop.jpg'},
 project:{loop:clip('project-loop'),poster:'/media/home-loops/project-loop.jpg'},
 choice:{loop:clip('choice-loop'),poster:'/media/home-loops/choice-loop.jpg'}
} as const;

export const homeScenes:Record<SceneSpec['id'],SceneSpec>={
 welcome:{
  id:'welcome',filmId:'FILM-home-welcome',audioSrc:'/media/home-review/welcome-elevenlabs-v4.mp3',captionsSrc:'/media/home-review/welcome.vtt',entranceSeconds:4,endHoldSeconds:3,
  cues:[
   {speaker:'pascal',start:4,end:15.31,text:'Hallo, ich bin Pascal. Willkommen bei NeXify! Schön, dass du da bist. Wir schauen gemeinsam, was dein Unternehmen wirklich braucht – und wie deine vorhandenen Systeme dabei helfen können.'},
   {speaker:'nex',start:16.81,end:24.86,text:'Ich bin NeX. Geht es um eine Website, einen automatisierten Ablauf oder ein Kundenportal? Du kannst hier direkt deinen Einstieg wählen.'},
   {speaker:'oracle',start:26.36,end:35.76,text:'Und ich bin AI Fly Oracle. Ich helfe dir, dein Vorhaben zu ordnen, offene Fragen sichtbar zu machen und den nächsten Schritt vorzubereiten.'},
   {speaker:'pascal',start:37.26,end:40.42,text:'Schau dich in Ruhe um. Womit möchtest du anfangen?'}
  ]
 },
 project:{
  id:'project',filmId:'FILM-home-project',audioSrc:'/media/home-review/project-elevenlabs-v4.mp3',captionsSrc:'/media/home-review/project.vtt',entranceSeconds:4,endHoldSeconds:3,
  cues:[
   {speaker:'pascal',start:4,end:13.72,text:'Bevor wir über Technik sprechen, schauen wir auf dein Vorhaben. Was soll für deine Kunden oder dein Team einfacher werden? Du brauchst dafür noch keine fertige Lösung.'},
   {speaker:'nex',start:15.22,end:23.03,text:'Ein Beispiel aus deinem Alltag hilft: Wo beginnt die Arbeit, welche Informationen werden gebraucht und was soll am Ende vorliegen?'},
   {speaker:'oracle',start:24.53,end:36.49,text:'Wir ordnen dein Ziel, deine vorhandenen Systeme und die offenen Fragen. So wird sichtbar, welcher nächste Schritt sinnvoll ist. Zugangsdaten brauchst du für diese erste Beschreibung nicht.'},
   {speaker:'pascal',start:37.99,end:42.9,text:'Erzähl uns kurz, was du verändern möchtest. Den passenden Umfang klären wir gemeinsam.'}
  ]
 },
 choice:{
  id:'choice',filmId:'FILM-home-choice',audioSrc:'/media/home-review/choice-elevenlabs-v4.mp3',captionsSrc:'/media/home-review/choice.vtt',entranceSeconds:4,endHoldSeconds:3,
  cues:[
   {speaker:'nex',start:4,end:13.8,text:'Möchtest du dein Angebot im Internet verständlich zeigen? Dann ist der Website-Bereich ein guter Einstieg. Dort geht es um Inhalte, Gestaltung und den Weg zur Anfrage.'},
   {speaker:'pascal',start:15.3,end:25.57,text:'Wenn sich eine Aufgabe ständig wiederholt, schauen wir auf den Ablauf dahinter. Gemeinsam klären wir, welche Schritte sich verbinden lassen und wo Menschen entscheiden sollen.'},
   {speaker:'oracle',start:27.07,end:38.8,text:'Geht es um Informationen und Zusammenarbeit, kann eine App oder ein Portal der passende Weg sein. Entscheidend ist, was deine Kunden oder dein Team dort tatsächlich erledigen sollen.'},
   {speaker:'pascal',start:40.3,end:46.33,text:'Wähle den Bereich, der zu deinem Vorhaben passt. Wenn du unsicher bist, helfen wir dir beim Einordnen.'}
  ]
 }
};

export const sceneLabels={
 de:{start:'Begrüßung starten',startGeneric:'Szene abspielen',pause:'Anhalten',resume:'Weiter',restart:'Noch einmal',sound:'Ton an',soundOff:'Ton aus',captions:'Untertitel',transcript:'Gesprochenen Text lesen',position:'Position in der Szene',loading:'Stimmen werden geladen …',error:'Die Stimmen können gerade nicht geladen werden. Der Text bleibt lesbar.',retry:'Erneut versuchen',reduced:'Bewegung reduziert – die Szene bleibt als ruhiges Bild, Stimmen und Text funktionieren.',spokenIn:'Gesprochen auf Deutsch',ended:'Szene beendet'},
 nl:{start:'Welkom starten',startGeneric:'Scène afspelen',pause:'Pauze',resume:'Verder',restart:'Nog een keer',sound:'Geluid aan',soundOff:'Geluid uit',captions:'Ondertiteling',transcript:'Gesproken tekst lezen (Duits)',position:'Positie in de scène',loading:'Stemmen worden geladen …',error:'De stemmen kunnen nu niet worden geladen. De tekst blijft leesbaar.',retry:'Opnieuw proberen',reduced:'Beweging beperkt – de scène blijft een rustig beeld, stemmen en tekst werken.',spokenIn:'Gesproken in het Duits',ended:'Scène afgelopen'},
 fr:{start:'Lancer l’accueil',startGeneric:'Lire la scène',pause:'Pause',resume:'Reprendre',restart:'Encore une fois',sound:'Son activé',soundOff:'Son coupé',captions:'Sous-titres',transcript:'Lire le texte (allemand)',position:'Position dans la scène',loading:'Chargement des voix…',error:'Les voix ne peuvent pas être chargées. Le texte reste lisible.',retry:'Réessayer',reduced:'Mouvements réduits – la scène reste une image calme, les voix et le texte fonctionnent.',spokenIn:'Parlé en allemand',ended:'Scène terminée'},
 en:{start:'Start the welcome',startGeneric:'Play the scene',pause:'Pause',resume:'Resume',restart:'Play again',sound:'Sound on',soundOff:'Sound off',captions:'Captions',transcript:'Read the spoken text (German)',position:'Position in the scene',loading:'Voices are loading …',error:'The voices cannot be loaded right now. The text remains readable.',retry:'Try again',reduced:'Motion reduced – the scene stays a calm image; voices and text work.',spokenIn:'Spoken in German',ended:'Scene ended'}
} as const;
