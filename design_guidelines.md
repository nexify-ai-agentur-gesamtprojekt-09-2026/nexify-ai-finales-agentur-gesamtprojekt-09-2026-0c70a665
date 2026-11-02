{
  "language": "de-DE",
  "brand": {
    "name": "NeXify AI",
    "non_negotiables": {
      "palette_fixed": {
        "canvas": "#080A0F",
        "surfaces": ["#0F131A", "#141A22"],
        "accents": {
          "primary_lime": "#C0EE38",
          "secondary_cyan": "#38BDF8"
        },
        "text": {
          "primary": "#FFFFFF",
          "secondary": "#CBD1D6",
          "muted": "#8B939B"
        }
      },
      "typography_fixed": {
        "display_headings": "Plus Jakarta Sans",
        "body": "Inter",
        "mono_labels": "Geist Mono"
      },
      "radii_fixed": {
        "cards": "18px",
        "buttons_pills": "999px",
        "chips": "14px"
      },
      "style_intent": "Premium, crafted, Apple-level restraint. Mehr Tiefe/Weite/Wölbung, klare Struktur. Keine neue CI erfinden."
    }
  },
  "existing_css_tokens_source": {
    "file": "/app/frontend/src/styles.css",
    "notes": [
      "Tokens sind bereits vorhanden (siehe :root). Nicht ersetzen, sondern erweitern/konsequent anwenden.",
      "Wichtig: Kein transition: all. Nur opacity/transform/background/border-color/box-shadow gezielt."
    ]
  },
  "information_architecture": {
    "homepage_goal": {
      "first_time_visitor_must_understand": [
        "Was ist NeXify? (Premium Agentur + Produktwelt)",
        "Was bringt es mir? (Marke, Systeme/KI, Wachstum – messbar, mit Grenzen)",
        "Was ist der nächste Schritt? (Projektklärung rechts + Projektbriefing/Leistungen)"
      ],
      "primary_conversion": "Projektklärung starten → passende Seite öffnen → Projektbriefing",
      "secondary_conversions": ["Leistungen entdecken", "Produkte vergleichen", "Kontakt"],
      "layout_constraint": "Rechts dauerhaft gedocktes Panel (~26vw). Main Content muss trotzdem großzügig wirken und Wide-Screens füllen."
    },
    "recommended_home_section_order": [
      {
        "id": "hero",
        "purpose": "Sofortige Einordnung + Film als Beweis + klare nächste Schritte.",
        "headline": "Marke. System. Wachstum.",
        "subhead": "NeXify AI verbindet Agenturarbeit und Produktzugänge – damit Ihr Auftritt verständlich wird, Abläufe laufen und Wachstum messbar wird.",
        "key_elements": [
          "Autoplay Brandfilm im Premium-Frame (Pascal + NeX + AIFly ORACLE)",
          "2 Links (Textlinks): ‚Ihr Projekt mit NeXify →‘, ‚Leistungen entdecken‘",
          "Mini-Trust-Bar (ohne Fake-Logos): ‚Keine erfundenen Referenzen. Klare Grenzen. Übergabe der Quellen.‘"
        ],
        "data_testids": {
          "hero_primary_link": "home-hero-primary-link",
          "hero_secondary_link": "home-hero-secondary-link",
          "hero_video": "home-hero-brand-film"
        }
      },
      {
        "id": "clarity_strip",
        "purpose": "In 12 Sekunden erklären, was NeXify liefert – als 3 klare Outcomes.",
        "section_heading": "Was Sie am Ende in der Hand haben",
        "cards": [
          {
            "title": "Ein Auftritt, der erklärt",
            "body": "Positionierung, Seitenstruktur, Texte und ein Anfrageweg, der nachweislich ankommt.",
            "link": "Websites & Marke",
            "to": "/leistungen/websites",
            "data_testid": "home-outcome-card-web"
          },
          {
            "title": "Ein Ablauf, der läuft",
            "body": "Systeme verbunden, Fehlerwege definiert, Freigaben sichtbar – ohne Autopilot-Versprechen.",
            "link": "Automatisierung & KI",
            "to": "/leistungen/automatisierung",
            "data_testid": "home-outcome-card-systems"
          },
          {
            "title": "Wachstum, das messbar ist",
            "body": "Kampagne + Landingpage + Messkette als eine Strecke – mit Zeitraum und Nennern.",
            "link": "Marketing & Wachstum",
            "to": "/leistungen/marketing",
            "data_testid": "home-outcome-card-growth"
          }
        ]
      },
      {
        "id": "service_pillars",
        "purpose": "Die 3 Säulen als Navigations- und Verständnisanker.",
        "section_heading": "Drei Säulen. Ein System.",
        "pillars": [
          {
            "title": "Marke & Web",
            "bullets": ["Positionierung", "Websites/Landingpages", "Texte & Struktur"],
            "cta": "Leistungen ansehen",
            "to": "/leistungen/websites",
            "data_testid": "home-pillar-brand-web"
          },
          {
            "title": "Systeme & KI",
            "bullets": ["Automatisierung", "Integrationen", "KI-Agenten (kontrolliert)"] ,
            "cta": "Ablauf prüfen",
            "to": "/leistungen/automatisierung",
            "data_testid": "home-pillar-systems-ai"
          },
          {
            "title": "Wachstum & Kampagnen",
            "bullets": ["Ads", "SEO", "Messung & Optimierung"],
            "cta": "Kampagne besprechen",
            "to": "/leistungen/marketing",
            "data_testid": "home-pillar-growth"
          }
        ]
      },
      {
        "id": "how_we_work",
        "purpose": "Struktur statt Buzzwords: Ablauf + Abgrenzung (was drin ist/was nicht).",
        "section_heading": "So läuft ein Projekt ab (ohne Überraschungen)",
        "structure": [
          "Kurz-Flow (4–6 Schritte) mit klaren Abnahmepunkten",
          "Nebenbox ‚Grenzen & Klarheit‘ (keine Garantien, keine unbegrenzten Schleifen, keine erfundenen Zahlen)"
        ],
        "primary_link": {"label": "Zusammenarbeit ansehen", "to": "/zusammenarbeit", "data_testid": "home-process-primary-link"}
      },
      {
        "id": "product_world",
        "purpose": "Produktwelt als eigener Pfad: ‚Selbst arbeiten‘ vs ‚Agenturprojekt‘.",
        "section_heading": "Produkte (wenn Sie selbst arbeiten möchten)",
        "layout": "Bento-Grid: 1 großes Produkt (Suite) + 3 kleinere (Agentic, ORACLE, API) + 1 Shop-Kachel (TEILEKLAR).",
        "primary_link": {"label": "Produkte vergleichen", "to": "/produkte", "data_testid": "home-products-compare-link"}
      },
      {
        "id": "teileklar_teaser",
        "purpose": "TEILEKLAR als eigenständige Marke/Shop klar abgrenzen.",
        "section_heading": "TEILEKLAR (Shop)",
        "copy": "Eigenständiger Shop für Teile + Werkstattsuche. Kein Agenturangebot – ein separates Produkt.",
        "cta": {"label": "Zum Shop", "to": "/teileklar", "data_testid": "home-teileklar-cta"}
      },
      {
        "id": "final_cta",
        "purpose": "Letzter, klarer Schritt: Projektbriefing.",
        "section_heading": "Starten wir mit Ihrem Ziel.",
        "cta_primary": {"label": "Projektbriefing öffnen", "to": "/projektbriefing", "data_testid": "home-final-cta-primary"},
        "cta_secondary": {"label": "Kontakt", "to": "/kontakt", "data_testid": "home-final-cta-secondary"}
      }
    ]
  },
  "layout_and_grid": {
    "wide_screen_strategy": {
      "principle": "Weite statt schmaler Center-Column: Content darf bis max 1760px gehen (Token --max).",
      "implementation": [
        "Nutze .wrap (max-width: var(--max); padding-inline: var(--pad)) konsequent.",
        "Bei geöffnetem rechten Panel (body.orac-open padding-right: var(--orac-w)) muss die .wrap weiterhin ‚voll‘ wirken: Section-Heads zweispaltig, Bento-Grids, große Medienflächen.",
        "Vermeide zu kleine max-widths in Main (kein 980px Limit für Home)."
      ]
    },
    "homepage_master_grid": {
      "desktop": "12-Spalten mental, aber umgesetzt via CSS grid: hero-grid (42/56) + großzügige gaps.",
      "with_right_panel": "Hero-Video bleibt groß (max-width ~760px), Copy bleibt lesbar (max 48ch).",
      "mobile": "Alles 1-spaltig; Panel wird overlay (bereits via media queries)."
    }
  },
  "premium_depth_system": {
    "goal": "Mehr Tiefen/Weiten/Wölbungen ohne Kitsch: Licht statt harte Schatten.",
    "surface_recipe": {
      "use_existing": [".glass", "--edge", "--shadow", "--shadow-lg", "--glass"],
      "add_patterns": {
        "curvature": {
          "description": "Subtile Wölbung durch Highlight + inner depth.",
          "css": ".surface-curve{position:relative;border-radius:var(--r-l);background:var(--glass),var(--surface);box-shadow:var(--edge),var(--shadow)}\n.surface-curve::after{content:'';position:absolute;inset:0;border-radius:inherit;pointer-events:none;background:radial-gradient(120% 70% at 50% -20%,rgba(255,255,255,.10),transparent 55%),radial-gradient(120% 70% at 50% 120%,rgba(0,0,0,.35),transparent 55%);mix-blend-mode:normal;opacity:.55}"
        },
        "sheen": {
          "description": "Specular Sheen (Lichtspiel) als diagonaler Glanz, nur auf großen Flächen.",
          "css": ".sheen{position:relative;isolation:isolate}\n.sheen::before{content:'';position:absolute;inset:-1px;border-radius:inherit;pointer-events:none;background:linear-gradient(120deg,rgba(255,255,255,.10) 0%,rgba(255,255,255,0) 28%,rgba(255,255,255,.06) 52%,rgba(255,255,255,0) 72%);mix-blend-mode:screen;opacity:.55}"
        },
        "backlight_glow": {
          "description": "Backlight hinter Key-Objekten (Video-Frame, CTA-Band, Panel-Header).",
          "css": ".backglow{position:relative}\n.backglow::before{content:'';position:absolute;inset:-14%;z-index:-1;filter:blur(34px);background:radial-gradient(50% 50% at 60% 40%,rgba(192,238,56,.12),transparent 68%)}"
        }
      }
    },
    "shadow_rules": [
      "Auf dunklem Canvas lieber mehrere weiche Schatten-Layer (wie --shadow/--shadow-lg) statt 1 harter Drop-Shadow.",
      "Innenkanten (inset highlights) sind Pflicht für ‚Premium‘: 1px Top-Highlight + 1px Bottom-Edge.",
      "Hover: nur translateY(-1/-2px) + leicht mehr shadow; keine wilden Glows."
    ]
  },
  "hero_film_frame_spec": {
    "objective": "Film wirkt wie ein Objekt im Raum (Glass Studio), nicht wie ein flaches Video.",
    "use_existing_classes": [".screen-wrap", ".screen-inner", ".screen-glare", ".film-controls"],
    "improvements": [
      "Frame: 1px Rim (rgba(255,255,255,.12)) + inner vignette (inset shadow) für Tiefe.",
      "Glare: animierbar sehr subtil (opacity 0.45→0.6) bei hover/focus innerhalb des Frames.",
      "Controls: als ‚floating glass pills‘, aber mit klarer Beschriftung (Deutsch) und data-testid.",
      "Progressbar: bleibt 3px, aber mit leichtem Glow (box-shadow: 0 0 10px rgba(192,238,56,.35))."
    ],
    "micro_interactions": {
      "hover": "Video-Frame: transform: translateY(-2px) (nur auf Desktop) + shadow-lg leicht verstärken.",
      "focus": "Bei Tastaturfokus: outline 2px lime + outline-offset 4px.",
      "reduced_motion": "Bei prefers-reduced-motion: keine transform-Animationen."
    },
    "data_testids": {
      "play_pause": "home-hero-film-play-toggle",
      "mute_toggle": "home-hero-film-mute-toggle",
      "scrub_slider": "home-hero-film-scrub-slider"
    }
  },
  "right_docked_panel_project_klaerung": {
    "objective": "Panel ist ‚Ihr Projekt. Unser Einstieg.‘: klar, ruhig, premium. Kein Chat-Feeling, sondern strukturierte Projektklärung.",
    "use_existing_css": [".aifly-panel", ".pk-*"],
    "structure": {
      "header": {
        "title": "Projektklärung",
        "subtitle": "Ihr Projekt. Unser Einstieg.",
        "badge": "OHNE LIVE-KI",
        "contact_line": "Antwort innerhalb von 1–2 Werktagen (wenn möglich)",
        "data_testids": {
          "panel_close": "project-klaerung-panel-close-button",
          "panel_reopen": "project-klaerung-panel-reopen-button"
        }
      },
      "step_model": [
        {
          "step": 1,
          "label": "Fokus wählen",
          "ui": "Chips: Marke & Web / Systeme & KI / Ads & Marketing",
          "data_testid": "project-klaerung-focus-chips"
        },
        {
          "step": 2,
          "label": "Ziel in einem Satz",
          "ui": "Textarea mit Beispiel-Placeholder",
          "placeholder": "Beispiel: ‚Wir brauchen eine Website, die unser Angebot in 30 Sekunden erklärt und Anfragen sauber erfasst.‘",
          "data_testid": "project-klaerung-goal-textarea"
        },
        {
          "step": 3,
          "label": "Einordnung & nächste Schritte",
          "ui": "Lokale Klassifikation + 2–3 empfohlene interne Seiten als Kartenlinks",
          "data_testid": "project-klaerung-recommendations"
        }
      ],
      "copy_rules": [
        "Keine KI-Behauptungen: ‚lokal eingeordnet‘ statt ‚KI analysiert‘.",
        "Immer Grenzen nennen: ‚Empfehlung ist eine Orientierung, kein Angebot.‘",
        "Links sind konkret: ‚Leistung: Websites‘ statt ‚Mehr erfahren‘."
      ]
    },
    "desktop_behavior": {
      "default_open": true,
      "closable": true,
      "space_reservation": "body.orac-open padding-right: var(--orac-w) ist bereits vorhanden; Home-Layout muss damit geplant werden.",
      "panel_width": "--orac-w: clamp(380px,26vw,470px)"
    }
  },
  "components_and_paths": {
    "note": "Projekt nutzt überwiegend CSS-Klassen (kein shadcn/ui Ordner vorhanden). Falls shadcn später ergänzt wird: nur als Ergänzung, nicht als Theme-Wechsel.",
    "existing": {
      "css": [
        "/app/frontend/src/styles.css",
        "/app/frontend/src/shop.css"
      ],
      "content_catalog": "/app/frontend/src/content.js"
    },
    "recommended_new_components_js": [
      {
        "name": "HomeOutcomeCards",
        "path": "/app/frontend/src/components/HomeOutcomeCards.js",
        "purpose": "3 Outcome-Karten (Was Sie am Ende in der Hand haben) mit klaren Links.",
        "data_testid": "home-outcomes"
      },
      {
        "name": "HomePillars",
        "path": "/app/frontend/src/components/HomePillars.js",
        "purpose": "3 Säulen als Navigationsanker.",
        "data_testid": "home-pillars"
      },
      {
        "name": "HomeProductBento",
        "path": "/app/frontend/src/components/HomeProductBento.js",
        "purpose": "Produktwelt als Bento-Grid.",
        "data_testid": "home-products-bento"
      }
    ]
  },
  "micro_interactions_motion": {
    "easing": {
      "standard": "cubic-bezier(.2,.8,.3,1)",
      "soft_spring_like": "cubic-bezier(.175,.885,.32,1.275)"
    },
    "hover_patterns": [
      "Cards: translateY(-2px) + border-color Richtung lime + shadow leicht erhöhen.",
      "Textlinks: gap animieren (wie .hero-link-* bereits), Pfeil minimal nach rechts.",
      "Chips: border-color lime + inner glow sehr subtil (rgba(192,238,56,.12))."
    ],
    "scroll_reveal": {
      "library": "framer-motion (optional)",
      "rule": "Nur opacity + translateY, keine Layout-shifts.",
      "fallback": "Wenn keine Lib: CSS @media(prefers-reduced-motion) respektieren und ohne Reveal ausliefern."
    }
  },
  "accessibility": {
    "focus": "Bereits definiert: :focus-visible outline 2px lime. Beibehalten.",
    "contrast": "Text auf graphite: primär #fff, sekundär #CBD1D6, muted #8B939B. Keine neuen Grautöne einführen.",
    "reduced_motion": "prefers-reduced-motion: reduce ist bereits im CSS. Neue Animationen dort ebenfalls deaktivieren.",
    "hit_targets": "Min. 44px Höhe für Buttons/Chips/Links (Panel-Chips erfüllen das)."
  },
  "image_urls": {
    "note": "Keine externen Stockbilder vorschlagen, da Brandfilm + vorhandene /media/gen Assets genutzt werden. Verwende vorhandene Assets aus content.js.",
    "existing_assets": [
      {
        "category": "home_gallery",
        "description": "Home-Galerie Illustrationen (Marke & Web / Systeme & KI / TEILEKLAR)",
        "urls": ["/media/gen/home-web.webp", "/media/gen/home-systeme.webp", "/media/gen/home-teileklar.webp"]
      }
    ]
  },
  "instructions_to_main_agent": [
    "Homepage neu strukturieren gemäß recommended_home_section_order: Outcome-Strip + Säulen + Ablauf + Produktwelt + TEILEKLAR-Abgrenzung + Final CTA.",
    "Keine neue Palette/Fonts/Radii einführen. Nutze Tokens aus styles.css.",
    "Weite sicherstellen: .wrap überall, keine zusätzlichen max-width Limits auf Home.",
    "Hero-Film-Frame: vorhandene .screen-* Klassen nutzen, nur Premium-Details ergänzen (Rim/Sheen/Backglow).",
    "Projektklärung-Panel: vorhandene .pk-* Struktur beibehalten, aber Copy/Step-Modell klarer machen (Fokus → Ziel → Einordnung).",
    "Alle interaktiven Elemente und kritischen Infos mit data-testid (kebab-case) versehen: Links, Buttons, Chips, Textareas, Close/Reopen, Kartenlinks.",
    "Keine universal transitions. Nur transform/opacity/background/border-color/box-shadow.",
    "Deutsch als UI-Sprache überall."
  ],
  "appendix_general_ui_ux_design_guidelines": "<General UI UX Design Guidelines>  \n    - You must **not** apply universal transition. Eg: `transition: all`. This results in breaking transforms. Always add transitions for specific interactive elements like button, input excluding transforms\n    - You must **not** center align the app container, ie do not add `.App { text-align: center; }` in the css file. This disrupts the human natural reading flow of text\n   - NEVER: use AI assistant Emoji characters like`🤖🧠💭💡🔮🎯📚🎭🎬🎪🎉🎊🎁🎀🎂🍰🎈🎨🎰💰💵💳🏦💎🪙💸🤑📊📈📉💹🔢🏆🥇 etc for icons. Always use **FontAwesome cdn** or **lucid-react** library already installed in the package.json\n\n **GRADIENT RESTRICTION RULE**\nNEVER use dark/saturated gradient combos (e.g., purple/pink) on any UI element.  Prohibited gradients: blue-500 to purple 600, purple 500 to pink-500, green-500 to blue-500, red to pink etc\nNEVER use dark gradients for logo, testimonial, footer etc\nNEVER let gradients cover more than 20% of the viewport.\nNEVER apply gradients to text-heavy content or reading areas.\nNEVER use gradients on small UI elements (<100px width).\nNEVER stack multiple gradient layers in the same viewport.\n\n**ENFORCEMENT RULE:**\n    • Id gradient area exceeds 20% of viewport OR affects readability, **THEN** use solid colors\n\n**How and where to use:**\n   • Section backgrounds (not content backgrounds)\n   • Hero section header content. Eg: dark to light to dark color\n   • Decorative overlays and accent elements only\n   • Hero section with 2-3 mild color\n   • Gradients creation can be done for any angle say horizontal, vertical or diagonal\n\n- For AI chat, voice application, **do not use purple color. Use color like light green, ocean blue, peach orange etc**\n\n</Font Guidelines>\n\n- Every interaction needs micro-animations - hover states, transitions, parallax effects, and entrance animations. Static = dead. \n   \n- Use 2-3x more spacing than feels comfortable. Cramped designs look cheap.\n\n- Subtle grain textures, noise overlays, custom cursors, selection states, and loading animations: separates good from extraordinary.\n   \n- Before generating UI, infer the visual style from the problem statement (palette, contrast, mood, motion) and immediately instantiate it by setting global design tokens (primary, secondary/accent, background, foreground, ring, state colors), rather than relying on any library defaults. Don't make the background dark as a default step, always understand problem first and define colors accordingly\n    Eg: - if it implies playful/energetic, choose a colorful scheme\n           - if it implies monochrome/minimal, choose a black–white/neutral scheme\n\n**Component Reuse:**\n\t- Prioritize using pre-existing components from src/components/ui when applicable\n\t- Create new components that match the style and conventions of existing components when needed\n\t- Examine existing components to understand the project's component patterns before creating new ones\n\n**IMPORTANT**: Do not use HTML based component like dropdown, calendar, toast etc. You **MUST** always use `/app/frontend/src/components/ui/ ` only as a primary components as these are modern and stylish component\n\n**Best Practices:**\n\t- Use Shadcn/UI as the primary component library for consistency and accessibility\n\t- Import path: ./components/[component-name]\n\n**Export Conventions:**\n\t- Components MUST use named exports (export const ComponentName = ...)\n\t- Pages MUST use default exports (export default function PageName() {...})\n\n**Toasts:**\n  - Use `sonner` for toasts\"\n  - Sonner component are located in `/app/src/components/ui/sonner.tsx`\n\nUse 2–4 color gradients, subtle textures/noise overlays, or CSS-based noise to avoid flat visuals.\n</General UI UX Design Guidelines>"
}
