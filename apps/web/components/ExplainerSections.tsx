"use client";

import type { Localized, PublicPage } from "../lib/page-types";
import { SiteLink } from "./Router";
import { useUI } from "./Workspace";
import "./PresenterEditorial.css";
import PresenterVideo,{isPublicVideo,type PublicVideo} from "./PresenterVideo";
import PresenterScene from './PresenterScene';
import IdentityIllustration from './IdentityIllustration';

export type ExplainerModule = {
  id: string;
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

const speakers = { pascal: "Pascal", nex: "NeX", aifly: "AIFly" } as const;
const labels = {
  de: { ai: "KI-Assistent", outcome: "Dein nächster Schritt", captions: "Deutsch", collection: "So geht es weiter" },
  nl: { ai: "AI-assistent", outcome: "Uw volgende stap", captions: "Nederlands", collection: "Zo gaat u verder" },
  fr: { ai: "Assistant IA", outcome: "Votre prochaine étape", captions: "Français", collection: "La suite de votre parcours" }
};

export default function ExplainerSections({ modules, pages, video, moduleVideos = {} }: { modules: ExplainerModule[]; pages: PublicPage[]; video?:PublicVideo;moduleVideos?:Record<string,Partial<Record<PublicVideo["locale"],PublicVideo>>> }) {
  const { locale } = useUI();
  const text = labels[locale];
  return <div className="editorial-explainers" role="group" aria-label={text.collection}>
    {isPublicVideo(video,locale)?<section className="editorial-route-film"><PresenterVideo video={video} locale={locale}/></section>:null}
    {modules.map(module => {
      if (!Object.hasOwn(speakers, module.speaker)) return null;
      const speaker = speakers[module.speaker];
      const moduleVideo = moduleVideos[module.id]?.[locale];
      const playable = isPublicVideo(moduleVideo,locale);
      const next = pages.find(page => page.id === module.next_action.target_id);
      const side = module.media_side === "right" ? "right" : "left";
      return <section className={`editorial-module ${playable?'has-video':'has-image'} media-on-${side}`} key={module.id}>
        {!playable&&<div className="editorial-module-media">{module.id==='home-explain-1'||module.id==='home-explain-2'?<IdentityIllustration variant={module.id==='home-explain-1'?'project':'orientation'} locale={locale}/>:<PresenterScene speaker={module.speaker} title={module.title[locale]} locale={locale}/>}</div>}
        {playable && <div className="editorial-module-media">
          <figure>
            <PresenterVideo video={moduleVideo!} locale={locale}/>
            <figcaption>{moduleVideo?.title}</figcaption>
          </figure>
        </div>}
        <div className="editorial-module-copy">
          <span className="editorial-speaker">{speaker}{module.speaker !== "pascal" ? ` · ${text.ai}` : ""}</span>
          <h2>{module.title[locale]}</h2>
          <p>{module.body[locale]}</p>
          <p className="editorial-module-outcome"><strong>{text.outcome}: </strong>{module.outcome[locale]}</p>
          {next && module.next_action.type === "route" ? <SiteLink className="editorial-next-step" href={next.path}>{module.next_action.label[locale]} <span aria-hidden="true">→</span></SiteLink> : null}
        </div>
      </section>;
    })}
  </div>;
}
