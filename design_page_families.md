> **HISTORIE – abgelöst durch docs/konzept/FUEHRENDES-KONZEPT.md (14.11.2026)**

# NeXify AI / TEILEKLAR – Design Guidelines (ADDENDUM: Seitenfamilien-Matrix & Kompositionsregeln)

> **Addendum-Ziel:** Verbindliche Seitenfamilien-Matrix für **alle Public-Seiten-IDs** (laut `apps/site/.generated/public-site.json` + `config/site-map.json`) und klare Kompositionsregeln, **ohne** bestehende Tokens/CI zu verändern.
>
> **Wichtig:** Dieses Addendum ist **append-only** und respektiert bestehende funktionierende APIs/Flows. Keine Behauptungen über Rechtsform/Compliance/Performance ohne Messung.
>
> **Technik-Hinweis:** In der Codebasis existieren Komponenten in `apps/web/components/*.tsx`. Für neue UI-Elemente in React **.js** (nicht .tsx) gilt: keine TypeScript-Typen in Beispielen; `data-testid` ist Pflicht.

{
  "addendum_meta": {
    "scope": "public pages + portals (customer/partner/operator) composition matrix",
    "source_of_truth": {
      "page_registry": [
        "/app/apps/site/.generated/public-site.json",
        "/app/config/site-map.json"
      ],
      "design_tokens": [
        "/app/packages/tokens/tokens.css",
        "/app/packages/design-system/index.css"
      ],
      "existing_public_layout_reference": [
        "/app/apps/web/components/PublicContent.tsx",
        "/app/apps/web/components/PublicContentLayout.css",
        "/app/apps/web/components/PublicExperience.tsx"
      ]
    },
    "brand": {
      "style": "Graphite Champagne Steel mit sparsamem Lime",
      "accent_policy": "Lime nur für Fokus/Links/primäre CTA-Kanten/Status; Champagne/Steel für Materialkanten und ruhige Highlights."
    },
    "language": {
      "tone": "Deutsch Sie (formal), NL/FR/EN ebenfalls formal",
      "locales": ["de", "nl", "fr", "en"]
    },
    "testing": {
      "data_testid_required": true,
      "convention": "kebab-case, role-based (z.B. contact-form-submit-button)"
    }
  },

  "page_families": {
    "F1_home": {
      "intent": "Einstieg, Orientierung, Vertrauen, klare nächste Schritte",
      "composition": [
        "GlobalNavigation",
        "Hero (IdentityHero + 1 Higgsfield Still, keine Videos/Stock)",
        "Value blocks (3er) + Journey/PresenterGuide",
        "Service/Product entry cards",
        "FAQ/Questions band",
        "Footer"
      ],
      "layout_notes": [
        "Hero: 2-Spalten Desktop, Stack Mobile; keine zentrierte Gesamtseite.",
        "Gradients nur als subtile Spotlights (<=20% viewport), keine dunklen saturierten Kombos."
      ]
    },

    "F2_service_hub": {
      "intent": "Leistungshaus/Portfolio erklären, Einstiegspunkte anbieten",
      "composition": [
        "PublicContentLayout: layout-service",
        "Hero mit DomainArtwork family=web/workspace (Higgsfield Still)",
        "SectionNav (wenn >1 Section)",
        "Related grid (max 4)",
        "Next actions footer"
      ],
      "layout_notes": [
        "Service-Hubs nutzen links Reading + optional sticky On-Page Nav.",
        "CTA: 1 primär, 1 sekundär; keine CTA-Flut."
      ]
    },

    "F3_service_detail": {
      "intent": "Ein konkretes Angebot/Projektpaket erklären (Markenstart, KI im Betrieb etc.)",
      "composition": [
        "PublicContentLayout: layout-service",
        "Hero + Purpose",
        "ExplainerModules (falls vorhanden) als Inline-Module",
        "FAQ/Questions",
        "Contact CTA band"
      ],
      "layout_notes": [
        "Inhalt editorial: 60–76ch Lesebreite, klare Zwischenüberschriften.",
        "Keine Tabellenwüsten; stattdessen Karten/Definition Lists."
      ]
    },

    "F4_product_editorial": {
      "intent": "Produkte/Produktbausteine erklären (NeX2fly, NeX & Oracle, API)",
      "composition": [
        "PublicContentLayout: layout-product",
        "Hero + DomainArtwork (workspace/web)",
        "Feature blocks (Bento 2x2) optional",
        "Trust band (Constraints/Scope/What it is NOT)",
        "Next actions"
      ],
      "layout_notes": [
        "Product-Seiten dürfen 'material' wirken: Karten mit --shadow-karte, feine Linien.",
        "Champagne nur als Kante/Outline/Glasreflex, nicht als große Fläche."
      ]
    },

    "F5_article_resource": {
      "intent": "Wissen/Arbeitsweise erklären, Orientierung geben",
      "composition": [
        "PublicContentLayout: layout-article",
        "Hero kompakter",
        "Reading sections",
        "Related links",
        "Questions"
      ],
      "layout_notes": [
        "Mehr Typo-Hierarchie, weniger CTAs.",
        "Optional: Inhaltsverzeichnis (On-Page Nav) ab 3 Sections."
      ]
    },

    "F6_company_contact": {
      "intent": "Unternehmen/Team/Anfrage – Vertrauen + klare Kontaktaufnahme",
      "composition": [
        "PublicContentLayout: layout-company",
        "Hero",
        "ContactRequestForm (wenn Seite contact)",
        "Contact channels",
        "FAQ/Questions"
      ],
      "layout_notes": [
        "Kontaktformular: 1 Spalte Mobile, 2 Spalten ab md; klare Pflichtfelder.",
        "Keine erfundenen Legal-Fakten; wenn unklar, als 'in Prüfung' kennzeichnen."
      ]
    },

    "F7_document_legal": {
      "intent": "Recht/Transparenz – ruhig, lesbar, drucknah",
      "composition": [
        "PublicContentLayout: layout-document",
        "Hero kompakt",
        "Reading sections",
        "Related links (klein)",
        "Next actions (dezent)"
      ],
      "layout_notes": [
        "Keine großen Bilder; wenn DomainArtwork vorhanden, nur kompakt.",
        "Buttons als Outline/ghost (siehe bestehendes CSS layout-document)."
      ]
    },

    "F8_account_status": {
      "intent": "Login/Signup/Status – funktional, minimal, klar",
      "composition": [
        "PublicContentLayout: layout-account",
        "AuthForms/StatusPanel",
        "Support links"
      ],
      "layout_notes": [
        "Keine Marketing-Module; Fokus auf Status/Next step.",
        "Alle Inputs/Buttons mit data-testid."
      ]
    },

    "F9_commerce_shop": {
      "intent": "TEILEKLAR Shop/Checkout/Cart – transaktional, schnell, eindeutig",
      "composition": [
        "PublicContentLayout: layout-commerce",
        "ShopEntry / PublicShopContent (runtime)",
        "Product cards/list",
        "Cart/Checkout steps",
        "PhaseNotice (wo nötig)"
      ],
      "layout_notes": [
        "Commerce: klare Stepper/Progress, keine langen Editorial-Blöcke im Checkout.",
        "Lime als Status/Primary action; keine Gradient-Buttons."
      ]
    },

    "F10_workshop_partner": {
      "intent": "Werkstatt/Partner – Verzeichnis, Anfrage, Termin",
      "composition": [
        "PublicContentLayout: layout-workshop",
        "WorkshopDirectory / PartnerJourney",
        "ContactRequestForm kind=partner",
        "FAQ/Questions"
      ],
      "layout_notes": [
        "Listen/Directory: Filter oben sticky, Ergebnisse als Karten.",
        "Map optional nur wenn bereits vorhanden; sonst keine neue Abhängigkeit."
      ]
    }
  },

  "page_id_to_family_matrix": {
    "nexify_public": {
      "home": "F1_home",
      "services": "F2_service_hub",
      "websites": "F3_service_detail",
      "automation": "F3_service_detail",
      "apps-portals": "F3_service_detail",
      "scope": "F3_service_detail",

      "solutions": "F4_product_editorial",
      "pricing": "F4_product_editorial",
      "nex2fly": "F4_product_editorial",
      "one": "F4_product_editorial",
      "api": "F4_product_editorial",

      "knowledge": "F5_article_resource",
      "knowledge-start": "F5_article_resource",

      "company": "F6_company_contact",
      "contact": "F6_company_contact",

      "imprint": "F7_document_legal",
      "privacy": "F7_document_legal",
      "terms": "F7_document_legal",
      "ai-notice": "F7_document_legal",
      "accessibility": "F7_document_legal",
      "cookies": "F7_document_legal",

      "login": "F8_account_status",
      "signup": "F8_account_status"
    },

    "teileklar_public": {
      "tk-home": "F9_commerce_shop",
      "tk-search": "F9_commerce_shop",
      "tk-categories": "F9_commerce_shop",
      "tk-category": "F9_commerce_shop",
      "tk-product": "F9_commerce_shop",
      "tk-cart": "F9_commerce_shop",
      "tk-checkout": "F9_commerce_shop",
      "tk-fitment": "F9_commerce_shop",
      "tk-vouchers": "F9_commerce_shop",

      "tk-appointments": "F10_workshop_partner",
      "tk-workshop": "F10_workshop_partner",
      "tk-partner": "F10_workshop_partner",

      "tk-legal": "F7_document_legal",

      "tk-shop": "F9_commerce_shop",
      "tk-reifenrechner": "F9_commerce_shop",
      "tk-batterie": "F9_commerce_shop"
    }
  },

  "layout_contracts": {
    "PublicContent_layout_mapping": {
      "service": {
        "css_hook": ".content-layout.layout-service",
        "hero_background": "radial spotlight using --color-semantik-erfolg at <=11% mix (already in PublicContentLayout.css)",
        "domain_artwork_family": "web or workspace"
      },
      "product": {
        "css_hook": ".content-layout.layout-product",
        "hero_background": "radial spotlight using --color-marke-lime at <=10% mix",
        "domain_artwork_family": "workspace or web"
      },
      "commerce": {
        "css_hook": ".content-layout.layout-commerce",
        "hero_background": "solid graphit + lime border",
        "domain_artwork_family": "automotive"
      },
      "workshop": {
        "css_hook": ".content-layout.layout-workshop",
        "hero_background": "radial spotlight using --color-semantik-erfolg",
        "domain_artwork_family": "automotive"
      },
      "document": {
        "css_hook": ".content-layout.layout-document",
        "hero_background": "solid graphit",
        "domain_artwork_family": "none or compact"
      },
      "account": {
        "css_hook": ".content-layout.layout-account",
        "hero_background": "solid graphit",
        "domain_artwork_family": "none"
      },
      "article": {
        "css_hook": ".content-layout.layout-article",
        "hero_background": "graphit-850",
        "domain_artwork_family": "web"
      },
      "company": {
        "css_hook": ".content-layout.layout-company (fallback via layoutFor())",
        "hero_background": "graphit-850",
        "domain_artwork_family": "web"
      }
    },

    "reading_width": {
      "target": "60–76ch",
      "rule": "Paragraphs and long-form content must not exceed 76ch; use existing .content-purpose/.content-section p constraints."
    },

    "cta_rules": {
      "primary_cta_max": 1,
      "secondary_cta_max": 1,
      "cta_placement": ["hero", "footer-next"],
      "copy_tone": "formal, specific, no hype",
      "data_testid_examples": {
        "hero_primary": "page-hero-primary-cta",
        "hero_secondary": "page-hero-secondary-cta",
        "footer_next": "page-next-actions"
      }
    }
  },

  "higgsfield_images": {
    "policy": {
      "no_stock": true,
      "no_video": true,
      "use_only_existing": true,
      "location": "/app/apps/web/public/media/higgsfield"
    },
    "image_urls": [
      {
        "category": "domain_artwork_family_web",
        "description": "Web/Content/Structure still used in DomainArtwork family=web",
        "url": "/media/higgsfield/hf-03-loft-studio.webp"
      },
      {
        "category": "domain_artwork_family_workspace",
        "description": "Workspace/meeting still used in DomainArtwork family=workspace",
        "url": "/media/higgsfield/hf-01-meeting-table.webp"
      },
      {
        "category": "domain_artwork_family_automotive",
        "description": "Automotive/parts still used in DomainArtwork family=automotive",
        "url": "/media/higgsfield/hf-07.webp"
      },
      {
        "category": "gallery_pool",
        "description": "Additional approved Higgsfield stills available for page-specific bands/cards (do not introduce new sources)",
        "urls": [
          "/media/higgsfield/hf-02-lobby-walk.webp",
          "/media/higgsfield/hf-04-studio-desk.webp",
          "/media/higgsfield/hf-05-atrium-walk.webp",
          "/media/higgsfield/hf-06.webp",
          "/media/higgsfield/hf-08.webp",
          "/media/higgsfield/hf-09.webp",
          "/media/higgsfield/hf-10.webp",
          "/media/higgsfield/hf-11.webp",
          "/media/higgsfield/hf-12.webp",
          "/media/higgsfield/hf-13.webp",
          "/media/higgsfield/hf-14.webp",
          "/media/higgsfield/hf-15.webp",
          "/media/higgsfield/hf-16.webp",
          "/media/higgsfield/hf-17-cutout.webp"
        ]
      }
    ]
  },

  "component_path": {
    "existing_public_shell": {
      "PublicExperience": "/app/apps/web/components/PublicExperience.tsx",
      "PublicContent": "/app/apps/web/components/PublicContent.tsx",
      "PublicContentLayoutCSS": "/app/apps/web/components/PublicContentLayout.css",
      "DomainArtwork": "/app/apps/web/components/DomainArtwork.tsx",
      "PageQuestions": "/app/apps/web/components/PageQuestions.tsx",
      "ContactRequestForm": "/app/apps/web/components/ContactRequestForm.tsx",
      "Shop": "/app/apps/web/components/shop/*"
    },
    "design_tokens": {
      "tokens_css": "/app/packages/tokens/tokens.css",
      "design_system_entry": "/app/packages/design-system/index.css"
    },
    "shadcn_primary_components_to_use_when_building_new_js_pages": [
      "(project-local) /app/frontend/src/components/ui/* (if present in this repo path; otherwise use existing apps/web components)",
      "button",
      "input",
      "textarea",
      "select",
      "dialog",
      "sheet",
      "tabs",
      "accordion",
      "card",
      "badge",
      "separator",
      "breadcrumb",
      "pagination",
      "form",
      "calendar (if needed)"
    ]
  },

  "instructions_to_main_agent": [
    "Append-only: Dieses Addendum ergänzt die bestehenden Design Guidelines; nichts entfernen.",
    "Seitenfamilien strikt nach page_id_to_family_matrix anwenden. Wenn eine Seite bereits gut aussieht: nur minimal anpassen (Spacing/Typo/CTA-Regeln), nicht neu bauen.",
    "Keine neuen Farben/Hexwerte: ausschließlich Tokens aus /app/packages/tokens/tokens.css.",
    "Higgsfield: ausschließlich vorhandene Dateien unter /media/higgsfield verwenden; keine Stock/Video-Integration.",
    "Für neue React-Komponenten in .js: keine TS-Typen; aber data-testid auf allen interaktiven Elementen (Buttons, Links, Inputs, Stepper, Filter, Cart actions).",
    "SEO/FAQ: Jede Public-Seite bekommt (wo sinnvoll) eine FAQ/Questions-Sektion; keine erfundenen Rechts-/Unternehmensfakten.",
    "Gradients: nur subtile Spotlights/Material-Reflexe (<=20% viewport), keine dunklen saturierten Gradient-Kombos; keine Gradient-Textflächen.",
    "Portale (Kunden/Partner/Operator): visuell an 'workspace' family anlehnen (Graphit + Champagne edge + Lime focus), aber Informationsdichte höher (Tabs, Tables, Filters)."
  ]
}

---

<General UI UX Design Guidelines>  
    - You must **not** apply universal transition. Eg: `transition: all`. This results in breaking transforms. Always add transitions for specific interactive elements like button, input excluding transforms
    - You must **not** center align the app container, ie do not add `.App { text-align: center; }` in the css file. This disrupts the human natural reading flow of text
   - NEVER: use AI assistant Emoji characters like`🤖🧠💭💡🔮🎯📚🎭🎬🎪🎉🎊🎁🎀🎂🍰🎈🎨🎰💰💵💳🏦💎🪙💸🤑📊📈📉💹🔢🏆🥇 etc for icons. Always use **FontAwesome cdn** or **lucid-react** library already installed in the package.json

 **GRADIENT RESTRICTION RULE**
NEVER use dark/saturated gradient combos (e.g., purple/pink) on any UI element.  Prohibited gradients: blue-500 to purple 600, purple 500 to pink-500, green-500 to blue-500, red to pink etc
NEVER use dark gradients for logo, testimonial, footer etc
NEVER let gradients cover more than 20% of the viewport.
NEVER apply gradients to text-heavy content or reading areas.
NEVER use gradients on small UI elements (<100px width).
NEVER stack multiple gradient layers in the same viewport.

**ENFORCEMENT RULE:**
    • Id gradient area exceeds 20% of viewport OR affects readability, **THEN** use solid colors

**How and where to use:**
   • Section backgrounds (not content backgrounds)
   • Hero section header content. Eg: dark to light to dark color
   • Decorative overlays and accent elements only
   • Hero section with 2-3 mild color
   • Gradients creation can be done for any angle say horizontal, vertical or diagonal

- For AI chat, voice application, **do not use purple color. Use color like light green, ocean blue, peach orange etc**

</Font Guidelines>

- Every interaction needs micro-animations - hover states, transitions, parallax effects, and entrance animations. Static = dead. 
   
- Use 2-3x more spacing than feels comfortable. Cramped designs look cheap.

- Subtle grain textures, noise overlays, custom cursors, selection states, and loading animations: separates good from extraordinary.
   
- Before generating UI, infer the visual style from the problem statement (palette, contrast, mood, motion) and immediately instantiate it by setting global design tokens (primary, secondary/accent, background, foreground, ring, state colors), rather than relying on any library defaults. Don't make the background dark as a default step, always understand problem first and define colors accordingly
    Eg: - if it implies playful/energetic, choose a colorful scheme
           - if it implies monochrome/minimal, choose a black–white/neutral scheme

**Component Reuse:**
	- Prioritize using pre-existing components from src/components/ui when applicable
	- Create new components that match the style and conventions of existing components when needed
	- Examine existing components to understand the project's component patterns before creating new ones

**IMPORTANT**: Do not use HTML based component like dropdown, calendar, toast etc. You **MUST** always use `/app/frontend/src/components/ui/ ` only as a primary components as these are modern and stylish component

**Best Practices:**
	- Use Shadcn/UI as the primary component library for consistency and accessibility
	- Import path: ./components/[component-name]

**Export Conventions:**
	- Components MUST use named exports (export const ComponentName = ...)
	- Pages MUST use default exports (export default function PageName() {...})

**Toasts:**
  - Use `sonner` for toasts"
  - Sonner component are located in `/app/src/components/ui/sonner.tsx`

Use 2–4 color gradients, subtle textures/noise overlays, or CSS-based noise to avoid flat visuals.
</General UI UX Design Guidelines>
