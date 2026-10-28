import type {ReactNode} from 'react';
import type {Locale} from '../lib/i18n';
import PresenterScene from './PresenterScene';
import './IdentityHero.css';

const copy={
 de:{eyebrow:'NeXify AI · gemeinsam weiter',title:'Ein klarer nächster Schritt.',body:'Du gibst die Richtung vor. Wir bringen Aufgaben, Wissen und Abläufe zusammen.',scene:'Pascal, NeX und AI Fly Oracle auf einer gemeinsamen Bühne',note:'Bildszene aus unveränderten Originalfiguren · Videos folgen.',steps:[['Verstehen.','Ausgangspunkt sind die Aufgaben, die heute Zeit und Aufmerksamkeit kosten.'],['Bewusst entscheiden.','Du bestimmst Ziel, Grenzen und den nächsten Schritt.'],['Geordnet weiterarbeiten.','NeX und AI Fly Oracle begleiten Verbindung und Orientierung.']]},
 nl:{eyebrow:'NeXify AI · samen verder',title:'Een duidelijke volgende stap.',body:'Jij bepaalt de richting. Wij brengen taken, kennis en processen samen.',scene:'Pascal, NeX en AI Fly Oracle samen op één podium',note:'Beeldscène met ongewijzigde originele figuren · video’s volgen.',steps:[['Begrijpen.','We beginnen bij de taken die vandaag tijd en aandacht vragen.'],['Bewust kiezen.','Jij bepaalt het doel, de grenzen en de volgende stap.'],['Geordend verderwerken.','NeX en AI Fly Oracle begeleiden verbinding en oriëntatie.']]},
 fr:{eyebrow:'NeXify AI · avancer ensemble',title:'Une prochaine étape claire.',body:'Tu donnes la direction. Nous relions les tâches, les connaissances et les processus.',scene:'Pascal, NeX et AI Fly Oracle réunis sur une même scène',note:'Scène composée de figures originales inchangées · vidéos à venir.',steps:[['Comprendre.','Nous partons des tâches qui demandent du temps et de l’attention aujourd’hui.'],['Choisir consciemment.','Tu définis l’objectif, les limites et la prochaine étape.'],['Avancer avec méthode.','NeX et AI Fly Oracle accompagnent la connexion et l’orientation.']]}
};

/** Approved interim composition, not a video or a screenshot of live functionality. */
export default function IdentityHero({locale,intro,actions}:{locale:Locale;intro:string;actions:ReactNode}){
 const t=copy[locale];
 return <section className="identity-hero" aria-labelledby="home-headline" data-media-state="interim-images-video-pending" data-identity-layout="accepted-v1">
  <div className="identity-scene">
   <div className="identity-copy"><span className="identity-line" aria-hidden="true"/><p className="identity-eyebrow">{t.eyebrow}</p><h1 id="home-headline">{t.title}</h1><p>{t.body}</p></div>
   <div className="identity-stage home-interim-scenes" role="group" aria-label={t.scene}>
    <div className="identity-wall" aria-hidden="true"/><div className="identity-floor" aria-hidden="true"/>
    <div className="identity-shadow identity-shadow-pascal" aria-hidden="true"/><div className="identity-shadow identity-shadow-nex" aria-hidden="true"/><div className="identity-shadow identity-shadow-aifly" aria-hidden="true"/>
    <svg className="identity-route" viewBox="0 0 1200 750" preserveAspectRatio="none" aria-hidden="true"><path className="identity-route-light" d="M190 653 C330 683 490 688 650 693 C774 698 862 652 1037 627"/><path className="identity-route-accent" d="M190 653 C330 683 490 688 650 693 C774 698 862 652 1037 627"/></svg>
    <div className="identity-task-deck" aria-hidden="true"><i/><i/><i/></div><div className="identity-output" aria-hidden="true"><i/><i/><i/></div><div className="identity-decision" aria-hidden="true"/>
    {(['pascal','nex','aifly'] as const).map(speaker=><PresenterScene key={speaker} speaker={speaker} title={t.scene} locale={locale} hero/>)}
   </div>
  </div>
  <p className="identity-note">{t.note}</p>
  <ol className="identity-story">{t.steps.map(([title,body],i)=><li key={i}><span className="identity-step-number" aria-hidden="true">0{i+1}</span><h2>{title}</h2><p>{body}</p></li>)}</ol>
  <div className="identity-introduction"><p>{intro}</p><div className="home-hero-actions">{actions}</div></div>
 </section>;
}
