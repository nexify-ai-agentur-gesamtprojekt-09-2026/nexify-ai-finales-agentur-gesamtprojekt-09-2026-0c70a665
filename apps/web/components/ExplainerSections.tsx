"use client";

import type { Localized, PublicPage } from "../lib/page-types";
import { SiteLink } from "./Router";
import { useUI } from "./Workspace";
import "./PresenterEditorial.css";
import PresenterVideo,{isPublicVideo,type PublicVideo} from "./PresenterVideo";
import PresenterScene from './PresenterScene';

export type ExplainerModule = {
  id: string;
  content_section_id?: string | null;
  speaker: "pascal" | "nex" | "aifly";
  title: Partial<Localized>;
  body: Partial<Localized>;
  outcome: Partial<Localized>;
  media_side: "left" | "right";
  media: {
    src: string | null;
    captions: Partial<Localized> | null;
    status: "asset_pending" | "published";
  };
  next_action: { type: "route"; target_id: string; label: Partial<Localized> };
  source_refs: string[];
};

const speakers = { pascal: "Pascal", nex: "NeX", aifly: "AI Fly Oracle" } as const;
const labels = {
  de: { ai: "KI-Assistent", outcome: "Ihr nächster Schritt", captions: "Deutsch", collection: "So geht es weiter" },
  nl: { ai: "AI-assistent", outcome: "Uw volgende stap", captions: "Nederlands", collection: "Zo gaat u verder" },
  fr: { ai: "Assistant IA", outcome: "Votre prochaine étape", captions: "Français", collection: "La suite de votre parcours" },
  en:{"ai": "AI assistant", "outcome": "Your next step", "captions": "English", "collection": "The rest of your journey"}
};

export default function ExplainerSections({ modules, pages, video, moduleVideos = {} }: { modules: ExplainerModule[]; pages: PublicPage[]; video?:PublicVideo;moduleVideos?:Record<string,Partial<Record<PublicVideo["locale"],PublicVideo>>> }) {
  const { locale } = useUI();
  const text = labels[locale];
  const vlocale = locale==="en"?"de":locale; // videos exist only in de/nl/fr; en viewers get the de film (documented)
  const allEnglishCopy = modules.every(module => [module.title,module.body,module.outcome,module.next_action.label].every(value => Boolean(value.en?.trim())));
  const germanAudioNote = locale==="en"?<p className="editorial-note" data-testid="en-video-audio-note">{allEnglishCopy ? "This film’s audio is in German. The explanatory text on this page is available in English." : "This film’s audio is in German. Some explanatory text is shown in its German source version, as marked."}</p>:null;
  return <div className="editorial-explainers" role="group" aria-label={text.collection}>
    {isPublicVideo(video,vlocale)?<section className="editorial-route-film"><PresenterVideo video={video} locale={vlocale}/>{germanAudioNote}</section>:null}
    {modules.map(module => {
      if (!Object.hasOwn(speakers, module.speaker)) return null;
      const copyLocale = [module.title,module.body,module.outcome,module.next_action.label].every(value => Boolean(value[locale]?.trim())) ? locale : "de";
      const copyText = labels[copyLocale];
      const missingEnglish = locale === "en" && copyLocale === "de";
      const moduleAudioNote = locale === "en" ? <p className="editorial-note" data-testid="en-module-video-audio-note">{missingEnglish ? "This film and the accompanying source text are in German." : "This film’s audio is in German. The accompanying explanatory text is in English."}</p> : null;
      const speaker = speakers[module.speaker];
      const moduleVideo = moduleVideos[module.id]?.[vlocale];
      const playable = isPublicVideo(moduleVideo,vlocale);
      const next = pages.find(page => page.id === module.next_action.target_id);
      const side = module.media_side === "right" ? "right" : "left";
      return <section className={`editorial-module ${playable?'has-video':'has-image'} media-on-${side}`} key={module.id}>
        {!playable&&<div className="editorial-module-media"><PresenterScene speaker={module.speaker} title={module.title[copyLocale]||""} locale={copyLocale}/></div>}
        {playable && <div className="editorial-module-media">
          <figure>
            <PresenterVideo video={moduleVideo!} locale={vlocale}/>
            <figcaption>{moduleVideo?.title}</figcaption>
          </figure>
          {moduleAudioNote}
        </div>}
        <div className="editorial-module-copy">
          {missingEnglish && <p className="editorial-note" lang="en" data-testid="explainer-original-language-note">This explanation is shown in its German source version. An English version is not provided.</p>}
          <div lang={copyLocale}>
          <span className="editorial-speaker">{speaker}{module.speaker !== "pascal" ? ` · ${copyText.ai}` : ""}</span>
          <h2>{module.title[copyLocale]}</h2>
          <p>{module.body[copyLocale]}</p>
          <p className="editorial-module-outcome"><strong>{copyText.outcome}: </strong>{module.outcome[copyLocale]}</p>
          {next && module.next_action.type === "route" ? <SiteLink className="editorial-next-step" href={next.path}>{module.next_action.label[copyLocale]} <span aria-hidden="true">→</span></SiteLink> : null}
          </div>
        </div>
      </section>;
    })}
  </div>;
}
