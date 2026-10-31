import legal from "../../../../config/teileklar-legal.json";
import "./shop.css";

type Doc = { title: string; intro: string; sections: [string, string][] };
const DOCS = legal.documents as unknown as Record<"agb" | "widerruf", Doc>;

export default function TeileklarLegal() {
  return <div className="tk-legal" data-testid="teileklar-legal">
    {(["agb", "widerruf"] as const).map(key => <section key={key} id={key} className="tk-legal-doc" aria-labelledby={key + "-title"} data-testid={"legal-" + key}>
      <h2 id={key + "-title"}>{key === "agb" ? "Allgemeine Geschäftsbedingungen" : "Widerrufsbelehrung"}</h2>
      <p className="tk-meta">{DOCS[key].intro}</p>
      {DOCS[key].sections.map(([title, body]) => <div key={title} id={title === "Muster-Widerrufsformular" ? "widerrufsformular" : undefined} className="tk-legal-section">
        <h3>{title}</h3>{body.split("\n").map(line => <p key={line}>{line}</p>)}
      </div>)}
    </section>)}
  </div>;
}
