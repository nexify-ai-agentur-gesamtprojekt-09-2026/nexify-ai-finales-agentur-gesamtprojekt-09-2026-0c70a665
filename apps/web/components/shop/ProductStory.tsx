"use client";
import { HcArrow } from "../HcArrow";
import { SiteLink } from "../Router";
import type { ProductDetail as Detail } from "./api";
import { useShopCopy } from "./ProductCard";
import { STORY, guideKind, type StoryLocale } from "./product-story-copy";

function Check() {
  return <svg className="tk-story-check" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M5 12.5l4.5 4.5L19 7" /></svg>;
}

/** Konzeptabschnitte der TEILEKLAR-Produktseite: Passungskasten, Klartext, Einbau, Zubehör, Rückgabe, Fragen, Werkzeuge. */
export default function ProductStory({ product }: { product: Detail }) {
  const { locale, date } = useShopCopy();
  const c = STORY[(locale as StoryLocale) in STORY ? (locale as StoryLocale) : "de"];
  const guide = c.guides[guideKind(`${product.category_name ?? ""} ${product.name}`)];
  const source = c.sourceBody.replace("{date}", date(product.imported_at));
  return <div className="tk-story" data-testid="product-story">
    <ul className="tk-story-trust" data-testid="story-trust">{c.trust.map(item => <li key={item}><Check />{item}</li>)}</ul>

    <section className="tk-story-fit" aria-labelledby="story-fit-title" data-testid="story-fit">
      <div className="tk-story-fit-head">
        <p className="tk-story-eyebrow">{c.fitEyebrow}</p>
        <h2 id="story-fit-title">{c.fitTitle}</h2>
        <span className="tk-story-badge" data-testid="story-fit-status">{c.fitStatus}</span>
      </div>
      <p className="tk-story-lead">{c.fitLead}</p>
      <dl className="tk-story-facts">
        <div><dt>{c.vehicleLabel}</dt><dd>{c.vehicleNone}</dd></div>
        <div><dt>{c.sourceLabel}</dt><dd>{source}</dd></div>
      </dl>
      <h3>{c.stepsTitle}</h3>
      <ol className="tk-story-steps">{c.steps.map(([title, body], index) => <li key={title}><span className="tk-story-num" aria-hidden="true">{index + 1}</span><div><strong>{title}</strong><p>{body}</p></div></li>)}</ol>
      <div className="tk-actions">
        <SiteLink href="/teileklar/fahrzeug-und-passung" className="hc-text-link" data-testid="story-fit-link">{c.ctaFit}<HcArrow /></SiteLink>
        <SiteLink href="/teileklar/werkstatt" className="hc-text-link" data-testid="story-workshop-link">{c.ctaWorkshop}<HcArrow /></SiteLink>
      </div>
    </section>

    <section className="tk-story-section" aria-labelledby="story-plain-title" data-testid="story-plain">
      <p className="tk-story-eyebrow">{c.plainEyebrow}</p>
      <h2 id="story-plain-title">{c.plainTitle(guide.name)}</h2>
      <p className="tk-story-lead">{guide.plain}</p>
      <div className="tk-story-cols">
        <div><h3>{c.pointsTitle}</h3><ul className="tk-story-list">{guide.points.map(p => <li key={p}><Check />{p}</li>)}</ul></div>
        <p className="tk-story-pitfall" data-testid="story-pitfall"><strong>{c.pitfallLabel}</strong>{guide.pitfall}</p>
      </div>
    </section>

    <section className="tk-story-section" aria-labelledby="story-install-title" data-testid="story-install">
      <p className="tk-story-eyebrow">{c.installEyebrow}</p>
      <h2 id="story-install-title">{c.installTitle}</h2>
      <div className="tk-story-cols">
        <div className="tk-story-card"><h3>{c.installBefore}</h3><ul className="tk-story-list">{c.installBeforeList.map(p => <li key={p}><Check />{p}</li>)}</ul></div>
        <div className="tk-story-card"><h3>{c.installAfter}</h3><ul className="tk-story-list">{c.installAfterList.map(p => <li key={p}><Check />{p}</li>)}</ul></div>
      </div>
      <p className="tk-story-note">{c.installNote}</p>
    </section>

    <section className="tk-story-section" aria-labelledby="story-also-title" data-testid="story-also">
      <p className="tk-story-eyebrow">{c.alsoEyebrow}</p>
      <h2 id="story-also-title">{c.alsoTitle}</h2>
      <p className="tk-story-lead">{c.alsoBody}</p>
      <div className="tk-story-card"><h3>{c.includedTitle}</h3><p>{c.includedBody}</p></div>
    </section>

    <section className="tk-story-section" aria-labelledby="story-ship-title" data-testid="story-ship">
      <p className="tk-story-eyebrow">{c.shipEyebrow}</p>
      <h2 id="story-ship-title">{c.shipTitle}</h2>
      <div className="tk-story-grid">{c.shipCards.map(([title, body]) => <div className="tk-story-card" key={title}><h3>{title}</h3><p>{body}</p></div>)}</div>
      <SiteLink href="/teileklar/rechtliches" className="hc-text-link" data-testid="story-legal-link">{c.legal}<HcArrow /></SiteLink>
    </section>

    <section className="tk-story-section" aria-labelledby="story-faq-title" data-testid="story-faq">
      <p className="tk-story-eyebrow">{c.faqEyebrow}</p>
      <h2 id="story-faq-title">{c.faqTitle}</h2>
      <div className="tk-story-faq">{c.faq.map(([q, a]) => <details key={q}><summary>{q}</summary><p>{a}</p></details>)}</div>
    </section>

    <section className="tk-story-section" aria-labelledby="story-tools-title" data-testid="story-tools">
      <p className="tk-story-eyebrow">{c.toolsEyebrow}</p>
      <h2 id="story-tools-title">{c.toolsTitle}</h2>
      <div className="tk-story-grid">{c.tools.map(([title, body, href]) => <SiteLink href={href} className="tk-story-tool" key={href}><strong>{title}</strong><span>{body}</span><HcArrow /></SiteLink>)}</div>
    </section>
  </div>;
}
