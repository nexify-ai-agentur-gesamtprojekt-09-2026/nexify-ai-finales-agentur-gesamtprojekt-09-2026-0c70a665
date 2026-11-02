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
  title: Localized;
  body: Localized;
  outcome: Localized;
  media_side: "left" | "right";
  media: {
    src: string | null;
    captions: Partial<Localized> | null;
    status: "asset_pending" | "published";
  };
  next_action: { type: "route"; target_id: string; label: Localized };
  source_refs: string[];
};

const speakers = { pascal: true, nex: true, aifly: true } as const;
const labels = {
  de: { collection: "So geht es weiter" },
  nl: { collection: "Zo gaat u verder" },
  fr: { collection: "La suite de votre parcours" },
  en: { collection: "The rest of your journey" }
};

export default function ExplainerSections({ modules, pages, video, moduleVideos = {} }: { modules: ExplainerModule[]; pages: PublicPage[]; video?:PublicVideo;moduleVideos?:Record<string,Partial<Record<PublicVideo["locale"],PublicVideo>>> }) {
  const { locale } = useUI();
  const text = labels[locale];
  const vlocale = locale==="en"?"de":locale; // videos exist only in de/nl/fr; en viewers get the de film (documented)
  const germanAudioNote = locale==="en"?<p className="editorial-note" data-testid="en-video-audio-note">This film’s audio is in German. The explanatory text on this page is available in English.</p>:null;
  return <div className="editorial-explainers" role="group" aria-label={text.collection}>
    {isPublicVideo(video,vlocale)?<section className="editorial-route-film"><PresenterVideo video={video} locale={vlocale}/>{germanAudioNote}</section>:null}
    {modules.map(module => {
      if (!Object.hasOwn(speakers, module.speaker)) return null;
      const moduleVideo = moduleVideos[module.id]?.[vlocale];
      const playable = isPublicVideo(moduleVideo,vlocale);
      const next = pages.find(page => page.id === module.next_action.target_id);
      const side = module.media_side === "right" ? "right" : "left";
      return <section className={`editorial-module ${playable?'has-video':'has-image'} media-on-${side}`} key={module.id}>
        {!playable&&<div className="editorial-module-media"><PresenterScene speaker={module.speaker} title={module.title[locale]} locale={locale}/></div>}
        {playable && <div className="editorial-module-media">
          <figure>
            <PresenterVideo video={moduleVideo!} locale={vlocale}/>
            <figcaption>{moduleVideo?.title}</figcaption>
          </figure>
          {germanAudioNote}
        </div>}
        <div className="editorial-module-copy">
          <h2>{module.title[locale]}</h2>
          <p>{module.body[locale]}</p>
          {next && module.next_action.type === "route" ? <SiteLink className="editorial-next-step" href={next.path}>{module.next_action.label[locale]} <span aria-hidden="true">→</span></SiteLink> : null}
        </div>
      </section>;
    })}
  </div>;
}
