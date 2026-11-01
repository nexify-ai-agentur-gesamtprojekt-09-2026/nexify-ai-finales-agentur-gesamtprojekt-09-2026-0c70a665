"use client";
import {useState} from "react";
import {SiteLink} from "./Router";
import type {Locale} from "./../lib/i18n";

type Shop = {id: string; name: string; city: string; region?: string; street?: string; zip?: string; tel?: string; web?: string; kind?: string; verified?: boolean};

const LOCALE_PACK: Record<Locale, string> = {de: "de-DE", nl: "nl-NL", fr: "fr-BE", en: "de-DE"};

const copy = {
  de: {title: "Einbau in einer Werkstatt", intro: "Geben Sie Ihre Postleitzahl ein – wir zeigen Werkstätten in der Nähe für den Einbau. Das Verzeichnis nennt keine geprüften Vertragspartner; Herkunft und Nutzungsrechte sind nicht belegt.", plz: "Postleitzahl", find: "Werkstätten suchen", forPart: "Für Teil", loading: "Verzeichnis wird geladen …", error: "Das Verzeichnis ist derzeit nicht verbunden. Bitte später erneut versuchen.", empty: "Keine Werkstatt zu dieser Postleitzahl im geladenen Verzeichnis gefunden.", results: "Werkstätten in der Nähe", kind: "Art", tel: "Telefon", appointment: "Termin anfragen", allWorkshops: "Alle Werkstätten ansehen", verified: "Eintrag „verified“ – nicht als Vertragspartner bestätigt"},
  nl: {title: "Montage in een werkplaats", intro: "Voer uw postcode in – wij tonen werkplaatsen in de buurt voor de montage. De lijst noemt geen geverifieerde contractpartners; herkomst en gebruiksrechten zijn niet bewezen.", plz: "Postcode", find: "Werkplaatsen zoeken", forPart: "Voor onderdeel", loading: "Lijst wordt geladen …", error: "De lijst is momenteel niet verbonden. Probeer later opnieuw.", empty: "Geen werkplaats voor deze postcode in de geladen lijst.", results: "Werkplaatsen in de buurt", kind: "Soort", tel: "Telefoon", appointment: "Afspraak aanvragen", allWorkshops: "Alle werkplaatsen bekijken", verified: "Vermelding „verified“ – niet als partner bevestigd"},
  fr: {title: "Montage en atelier", intro: "Saisissez votre code postal – nous affichons des ateliers à proximité pour le montage. L’annuaire ne nomme pas de partenaires vérifiés ; l’origine et les droits d’usage ne sont pas prouvés.", plz: "Code postal", find: "Rechercher des ateliers", forPart: "Pour la pièce", loading: "Chargement de l’annuaire …", error: "L’annuaire n’est pas connecté pour le moment. Réessayez plus tard.", empty: "Aucun atelier pour ce code postal dans l’annuaire chargé.", results: "Ateliers à proximité", kind: "Type", tel: "Téléphone", appointment: "Demander un rendez-vous", allWorkshops: "Voir tous les ateliers", verified: "Entrée « verified » – non confirmée comme partenaire"},
  en: {title: "Installation at a workshop", intro: "Enter your postal code – we show nearby workshops for installation. The directory lists no verified contractual partners; provenance and usage rights are not proven.", plz: "Postal code", find: "Search workshops", forPart: "For part", loading: "Loading the directory …", error: "The directory is not connected right now. Please try again later.", empty: "No workshop for this postal code in the loaded directory.", results: "Nearby workshops", kind: "Type", tel: "Phone", appointment: "Request appointment", allWorkshops: "View all workshops", verified: "“verified” record – not confirmed as partner"},
};

export default function ShopWorkshopFinder({locale, partName, terminePath, workshopPath}: {locale: Locale; partName?: string; terminePath: string; workshopPath: string}) {
  const t = copy[locale];
  const [plz, setPlz] = useState("");
  const [state, setState] = useState<"idle" | "loading" | "error" | "done">("idle");
  const [shops, setShops] = useState<Shop[]>([]);

  const search = async (event: React.FormEvent) => {
    event.preventDefault();
    const query = plz.trim();
    if (!query) return;
    setState("loading");
    try {
      const response = await fetch("/teileklar/workshops.json", {cache: "no-store"});
      if (!response.ok) throw new Error("directory");
      const data = await response.json();
      const pack = data[LOCALE_PACK[locale]] || data["de-DE"];
      const all: Shop[] = Array.isArray(pack?.shops) ? pack.shops : [];
      const hits = all
        .filter(shop => (shop.zip && shop.zip.startsWith(query)) || (shop.city && shop.city.toLowerCase().includes(query.toLowerCase())))
        .slice(0, 8);
      setShops(hits);
      setState("done");
    } catch {
      setState("error");
    }
  };

  return (
    <div className="tk-ws" data-testid="shop-workshop-finder">
      <p className="tk-subhead">{t.title}</p>
      <p className="tk-note">{t.intro}</p>
      {partName && <p className="tk-note" data-testid="shop-workshop-part">{t.forPart}: <strong>{partName}</strong></p>}
      <form className="tk-fieldrow" onSubmit={search} aria-label={t.title}>
        <div className="tk-field">
          <label htmlFor="ws-plz">{t.plz}</label>
          <input id="ws-plz" data-testid="shop-workshop-plz" inputMode="numeric" autoComplete="postal-code" maxLength={5} value={plz} onChange={event => setPlz(event.target.value.replace(/[^0-9]/g, ""))} placeholder="10115" />
        </div>
        <div className="tk-field" style={{justifyContent: "flex-end"}}>
          <button type="submit" className="tk-submit" data-testid="shop-workshop-search" disabled={!plz.trim() || state === "loading"}>{t.find}</button>
        </div>
      </form>
      <div aria-live="polite">
        {state === "loading" && <p className="tk-note" role="status" data-testid="shop-workshop-state">{t.loading}</p>}
        {state === "error" && <p className="tk-note" role="alert" data-testid="shop-workshop-state">{t.error}</p>}
        {state === "done" && shops.length === 0 && <p className="tk-note" role="status" data-testid="shop-workshop-empty">{t.empty}</p>}
        {state === "done" && shops.length > 0 && (
          <>
            <p className="tk-subhead">{t.results}</p>
            <ul className="tk-wslist" data-testid="shop-workshop-results">
              {shops.map(shop => (
                <li key={shop.id} className="tk-wsitem" data-testid={"shop-workshop-" + shop.id}>
                  <strong>{shop.name}</strong>
                  <span className="tk-note">{[shop.street, shop.zip, shop.city].filter(Boolean).join(", ")}</span>
                  {shop.kind && <span className="tk-note">{t.kind}: {shop.kind}</span>}
                  {shop.tel && <span className="tk-note">{t.tel}: <a href={"tel:" + shop.tel}>{shop.tel}</a></span>}
                  {shop.verified && <span className="tk-note" title={t.verified}>{t.verified}</span>}
                  <SiteLink className="tk-link" href={terminePath}>{t.appointment}<span aria-hidden="true">→</span></SiteLink>
                </li>
              ))}
            </ul>
          </>
        )}
      </div>
      <div className="tk-actions">
        <SiteLink className="tk-link" href={workshopPath} data-testid="shop-workshop-all">{t.allWorkshops}<span aria-hidden="true">→</span></SiteLink>
      </div>
    </div>
  );
}
