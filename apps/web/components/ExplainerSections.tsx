"use client";

import type { Localized, PublicPage } from "../lib/page-types";
import { SiteLink } from "./Router";
import { useUI } from "./Workspace";
import "./PresenterEditorial.css";

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
  de: { ai: "KI-Assistent", outcome: "Ihr nächster Schritt", captions: "Deutsch", collection: "So geht es weiter" },
  nl: { ai: "AI-assistent", outcome: "Uw volgende stap", captions: "Nederlands", collection: "Zo gaat u verder" },
  fr: { ai: "Assistant IA", outcome: "Votre prochaine étape", captions: "Français", collection: "La suite de votre parcours" }
};

function ownedMediaPath(value: unknown, extension: "video" | "captions"): value is string {
  if (typeof value !== "string" || !value.startsWith("/media/") || value.includes("..")) return false;
  // Canonical own-origin paths only: no percent escapes, backslashes, query,
  // fragment, whitespace or controls that a browser could normalize elsewhere.
  return extension === "video"
    ? /^\/media\/[A-Za-z0-9/_-]+\.(?:mp4|webm)$/.test(value)
    : /^\/media\/[A-Za-z0-9/_-]+\.vtt$/.test(value);
}

export default function ExplainerSections({ modules, pages }: { modules: ExplainerModule[]; pages: PublicPage[] }) {
  const { locale } = useUI();
  const text = labels[locale];
  return <div className="editorial-explainers" role="group" aria-label={text.collection}>
    {modules.map(module => {
      if (!Object.hasOwn(speakers, module.speaker)) return null;
      const speaker = speakers[module.speaker];
      const caption = module.media.captions?.[locale];
      const playable = module.media.status === "published" && ownedMediaPath(module.media.src, "video") && ownedMediaPath(caption, "captions");
      const next = pages.find(page => page.id === module.next_action.target_id);
      const side = module.media_side === "right" ? "right" : "left";
      return <section className={`editorial-module${playable ? ` has-video media-on-${side}` : ""}`} key={module.id}>
        {playable && <div className="editorial-module-media">
          <figure>
            <video controls preload="none" playsInline aria-label={`${speaker}: ${module.title[locale]}`}>
              <source src={module.media.src!} type={module.media.src!.endsWith(".webm") ? "video/webm" : "video/mp4"} />
              <track kind="captions" src={caption!} srcLang={locale} label={text.captions} default />
            </video>
            <figcaption>{speaker}{module.speaker !== "pascal" ? ` · ${text.ai}` : ""}</figcaption>
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
