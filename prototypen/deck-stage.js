// <deck-stage width="1920" height="1080"> · Foliensteuerung für die Präsentationen
// (Investoren-PowerPoint, Partner-PowerPoint Werkstatt). Jede <section> im Element ist eine Folie.
// Tastatur: ←/→, Bild↑/↓, Leertaste, Pos1/Ende. Adresse #3 öffnet Folie 3. Druck: alle Folien je Seite.
(function () {
  if (typeof customElements === "undefined" || customElements.get("deck-stage")) return;

  const DRUCK_ID = "deck-stage-druck";
  function druckStil(w, h) {
    if (document.getElementById(DRUCK_ID)) return;
    const s = document.createElement("style");
    s.id = DRUCK_ID;
    s.textContent = "@page{size:" + w + "px " + h + "px;margin:0}" +
      "@media print{deck-stage{position:static!important;height:auto!important}" +
      "deck-stage>section{display:var(--deck-display,flex)!important;position:relative!important;inset:auto!important;transform:none!important;break-after:page;page-break-after:always}}";
    document.head.appendChild(s);
  }

  class DeckStage extends HTMLElement {
    constructor() {
      super();
      this.index = 0;
      const root = this.attachShadow({ mode: "open" });
      root.innerHTML =
        "<style>" +
        ":host{position:fixed;inset:0;display:block;background:#1B1E1D;overflow:hidden;font-family:Geist,Helvetica,Arial,sans-serif}" +
        ".buehne{position:absolute;left:50%;top:50%;transform-origin:0 0;box-shadow:0 28px 56px -32px rgba(0,0,0,.85)}" +
        ".leiste{position:absolute;left:50%;bottom:16px;transform:translateX(-50%);display:flex;align-items:center;gap:8px;padding:4px;border-radius:999px;background:rgba(36,40,38,.92);border:1px solid #363A38}" +
        "button{min-width:44px;min-height:44px;border:0;border-radius:999px;background:transparent;color:#E3E6E3;font:600 18px/1 Geist,Helvetica,Arial,sans-serif;cursor:pointer}" +
        "button:hover{color:#D7FA50}button:focus-visible{outline:2px solid #D7FA50;outline-offset:2px}button:disabled{opacity:.4;cursor:default}" +
        ".stand{min-width:120px;text-align:center;color:#E3E6E3;font:500 13px/1.2 'Geist Mono',monospace}" +
        "@media print{:host{position:static;background:none}.buehne{position:static;transform:none!important;box-shadow:none}.leiste{display:none}}" +
        "</style>" +
        "<div class=\"buehne\" part=\"stage\"><slot></slot></div>" +
        "<nav class=\"leiste\" aria-label=\"Foliensteuerung\">" +
        "<button type=\"button\" data-schritt=\"-1\" aria-label=\"Vorherige Folie\">‹</button>" +
        "<span class=\"stand\" aria-live=\"polite\"></span>" +
        "<button type=\"button\" data-schritt=\"1\" aria-label=\"Nächste Folie\">›</button>" +
        "</nav>";
      this.buehne = root.querySelector(".buehne");
      this.stand = root.querySelector(".stand");
      this.zurueck = root.querySelector("[data-schritt=\"-1\"]");
      this.weiter = root.querySelector("[data-schritt=\"1\"]");
      root.querySelectorAll("button").forEach((b) => b.addEventListener("click", () => this.gehe(this.index + Number(b.dataset.schritt))));
      this._taste = (e) => this.taste(e);
      this._groesse = () => this.skaliere();
      this._hash = () => this.ausHash();
    }

    get breite() { return Number(this.getAttribute("width")) || 1920; }
    get hoehe() { return Number(this.getAttribute("height")) || 1080; }
    get folien() { return Array.from(this.children).filter((c) => c.tagName === "SECTION"); }

    connectedCallback() {
      druckStil(this.breite, this.hoehe);
      this.setAttribute("role", "region");
      this.setAttribute("aria-roledescription", "Präsentation");
      if (!this.hasAttribute("aria-label")) this.setAttribute("aria-label", document.title || "Präsentation");
      this.buehne.style.width = this.breite + "px";
      this.buehne.style.height = this.hoehe + "px";
      window.addEventListener("keydown", this._taste);
      window.addEventListener("resize", this._groesse);
      window.addEventListener("hashchange", this._hash);
      this._beobachter = new MutationObserver(() => this.zeige());
      this._beobachter.observe(this, { childList: true });
      this.ausHash();
      this.skaliere();
    }

    disconnectedCallback() {
      window.removeEventListener("keydown", this._taste);
      window.removeEventListener("resize", this._groesse);
      window.removeEventListener("hashchange", this._hash);
      if (this._beobachter) this._beobachter.disconnect();
    }

    skaliere() {
      const f = Math.min(window.innerWidth / this.breite, window.innerHeight / this.hoehe);
      this.buehne.style.transform = "scale(" + f + ") translate(-50%,-50%)";
    }

    ausHash() {
      const n = parseInt((location.hash || "").slice(1), 10);
      this.index = Number.isFinite(n) ? n - 1 : this.index;
      this.zeige();
    }

    gehe(i) {
      const max = this.folien.length - 1;
      this.index = Math.max(0, Math.min(max, i));
      this.zeige();
      try { history.replaceState(null, "", "#" + (this.index + 1)); } catch (e) { /* file:// oder Sandbox */ }
    }

    zeige() {
      const f = this.folien;
      if (!f.length) return;
      this.index = Math.max(0, Math.min(f.length - 1, this.index));
      f.forEach((s, i) => {
        if (s.dataset.deckDisplay === undefined) s.dataset.deckDisplay = s.style.display || "block";
        s.style.setProperty("--deck-display", s.dataset.deckDisplay);
        s.style.position = "absolute";
        s.style.inset = "0";
        s.style.width = this.breite + "px";
        s.style.height = this.hoehe + "px";
        s.style.overflow = "hidden";
        s.style.display = i === this.index ? s.dataset.deckDisplay : "none";
        s.setAttribute("aria-roledescription", "Folie");
        s.setAttribute("aria-label", (i + 1) + " von " + f.length + (s.dataset.label ? ": " + s.dataset.label : ""));
      });
      const aktiv = f[this.index];
      this.stand.textContent = (this.index + 1) + " / " + f.length + (aktiv.dataset.label ? " · " + aktiv.dataset.label : "");
      this.zurueck.disabled = this.index === 0;
      this.weiter.disabled = this.index === f.length - 1;
    }

    taste(e) {
      if (e.defaultPrevented || e.altKey || e.ctrlKey || e.metaKey) return;
      const ziel = e.target && e.target.closest ? e.target.closest("input,textarea,select,[contenteditable]") : null;
      if (ziel) return;
      const k = e.key;
      if (k === "ArrowRight" || k === "PageDown" || (k === " " && !e.shiftKey)) this.gehe(this.index + 1);
      else if (k === "ArrowLeft" || k === "PageUp" || (k === " " && e.shiftKey)) this.gehe(this.index - 1);
      else if (k === "Home") this.gehe(0);
      else if (k === "End") this.gehe(this.folien.length - 1);
      else return;
      e.preventDefault();
    }
  }

  customElements.define("deck-stage", DeckStage);
})();
