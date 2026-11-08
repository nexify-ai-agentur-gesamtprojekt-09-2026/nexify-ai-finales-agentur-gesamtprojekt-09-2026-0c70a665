{
  "design_home_master_meta": {
    "scope": "Polish the existing homepage and define it as the ONLY visual master for all subsequent layouts. No new theme, no new palette, no new fonts. Germany-first. No videos. Use only approved real product photos + Higgsfield brand stills already in repo.",
    "source_of_truth": {
      "home_component": "/app/apps/web/components/HomeContent.tsx",
      "home_css": "/app/apps/web/components/HomeConcept.css",
      "hero_component": "/app/apps/web/components/IdentityHero.tsx",
      "hero_css": "/app/apps/web/components/IdentityHero.css",
      "storefront_css": "/app/apps/web/components/shop/Storefront.css",
      "global_tokens": [
        "/app/packages/tokens/tokens.css",
        "/app/apps/web/app/masterplan-tokens.css",
        "/app/apps/web/app/globals.css"
      ]
    },
    "non_negotiables": {
      "homepage_is_master": true,
      "no_new_tokens": true,
      "no_new_fonts": true,
      "no_new_color_hex": true,
      "no_video": true,
      "images_policy": {
        "brand_images": "ONLY /media/higgsfield/* already present",
        "shop_images": "ONLY real product photos (existing commerce pipeline)",
        "no_stock": true
      },
      "testing": {
        "data_testid_required": true,
        "convention": "kebab-case, role-based"
      },
      "implementation_note": "This document is guidance only. Do not implement changes here; main agent will apply minimal diffs in existing CSS/TSX."
    }
  },

  "existing_tokens_to_preserve_and_use": {
    "layout": {
      "page_padding": "var(--layout-page-padding)",
      "home_wide_padding": "var(--layout-home-wide-padding)",
      "content_max": "var(--layout-content-max)",
      "home_wide_max": "var(--layout-home-wide-max)",
      "hero_min_height": "var(--layout-hero-min)",
      "target_min": "var(--target-min)",
      "media_max": "var(--layout-media-max)",
      "film_max": "var(--layout-film-max)"
    },
    "type": {
      "hero_size": "var(--type-hero-size)",
      "hero_mobile": "var(--type-hero-mobile)",
      "section_size": "var(--type-section-size)",
      "body_size": "var(--type-body-size)",
      "small_size": "var(--type-small-size)",
      "hero_leading": "var(--type-hero-leading)",
      "body_leading": "var(--type-body-leading)",
      "display_tracking": "var(--type-display-tracking)",
      "home_detail": "var(--type-home-detail)",
      "home_reading": "var(--type-home-reading)"
    },
    "radius": {
      "atelier": "var(--radius-atelier)",
      "home_media": "var(--radius-home-media)",
      "card": "var(--radius-karte)",
      "button": "var(--radius-button)",
      "pill": "var(--radius-pille)"
    },
    "color": {
      "champagne": "var(--color-atelier-champagne)",
      "graphite_canvas": "var(--color-graphit-900)",
      "surface": "var(--color-graphit-850)",
      "elevated": "var(--color-graphit-700)",
      "text_primary": "var(--color-text-primaer)",
      "text_secondary": "var(--color-text-sekundaer)",
      "text_muted": "var(--color-text-gedaempft)",
      "lime": "var(--color-marke-lime)",
      "focus_ring": "var(--focus-ring)"
    },
    "material": {
      "home_media_rim": "var(--gradient-home-media-rim)",
      "atelier_glass": "var(--gradient-atelier-glass)",
      "atelier_stage": "var(--gradient-atelier-stage)",
      "atelier_heading": "var(--gradient-atelier-heading)",
      "shadow_home_media": "var(--shadow-home-media)",
      "shadow_atelier": "var(--shadow-atelier)",
      "shadow_atelier_polish": "var(--shadow-atelier-polish)",
      "shadow_atelier_depth": "var(--shadow-atelier-depth)",
      "motion_feedback": "var(--motion-feedback)"
    }
  },

  "homepage_polish_targets": {
    "P0_hero_headline_linebreak_fix": {
      "problem": "German hero line 'Ein zusammenhängender' breaks awkwardly into too many lines on some widths.",
      "constraints": [
        "Do NOT change the headline copy.",
        "Do NOT change fonts or introduce new tokens.",
        "Preserve hero image proportions (16/9) and overall left-copy/right-media composition."
      ],
      "recommended_css_changes": [
        {
          "file": "/app/apps/web/components/IdentityHero.css",
          "selector": ".identity-copy h1",
          "change": "Replace overflow-wrap:anywhere with overflow-wrap:normal; add word-break:normal; keep hyphens:auto; keep text-wrap:balance.",
          "why": "overflow-wrap:anywhere allows breaking inside words, which is especially ugly for German compounds and can create 4–5 line fragmentation. hyphens:auto already handles long words when lang=de is set."
        },
        {
          "file": "/app/apps/web/components/IdentityHero.css",
          "selector": ".identity-copy h1",
          "change": "Tighten measure slightly: max-width from 16ch -> 18ch (desktop) AND keep mobile max-width 20ch as-is.",
          "why": "A slightly wider measure reduces forced wraps for the middle line without changing the overall hierarchy."
        },
        {
          "file": "/app/apps/web/components/IdentityHero.tsx",
          "selector": "<h1> spans",
          "change": "Add inline wrapper spans with class hooks for the 2nd line only (e.g. className=\"identity-title-line identity-title-line-2\") so CSS can apply white-space:nowrap at safe breakpoints.",
          "why": "We need a tightly scoped control to keep 'Ein zusammenhängender' together on mid/large widths, while still allowing wrap on very small screens."
        },
        {
          "file": "/app/apps/web/components/IdentityHero.css",
          "selector": ".identity-title-line-2",
          "change": "Use a container query: @container identity-hero (min-width: 520px) { .identity-title-line-2 { white-space: nowrap; } }",
          "why": "Prevents the 2nd line from splitting into multiple lines on typical phone landscape/tablet widths, but still allows wrap below 520px."
        }
      ],
      "required_global_prereq": {
        "file": "/app/apps/web/app/layout.tsx (or root HTML template)",
        "change": "Ensure <html lang=\"de\"> for German locale routes (or set lang dynamically per locale).",
        "why": "CSS hyphens:auto only works correctly with a proper language dictionary."
      },
      "acceptance_checks": [
        "At widths 360–430px: headline may wrap, but must not break inside words.",
        "At widths 520–1200px: 'Ein zusammenhängender' stays on one line.",
        "At widths >=1400px: headline remains max ~3 lines and does not look sparse."
      ]
    },

    "P0_reading_hierarchy_and_hyphenation": {
      "goal": "Make long German paragraphs read smoother without changing the visual identity.",
      "recommended_css_changes": [
        {
          "file": "/app/apps/web/components/HomeConcept.css",
          "selector": ".home-concept",
          "change": "Add: hyphens:auto; overflow-wrap:normal; word-break:normal;",
          "why": "HomeConcept already uses text-wrap:pretty for paragraphs; adding hyphenation improves rag and prevents overflow for German compounds."
        },
        {
          "file": "/app/apps/web/components/HomeConcept.css",
          "selector": ".home-concept p",
          "change": "Keep max-width:65ch but ensure text-wrap:pretty stays (already present). Optionally add: hanging-punctuation:first last; (safe progressive enhancement).",
          "why": "Improves editorial rhythm; does not change palette or layout."
        }
      ],
      "notes": [
        "Do NOT justify text; keep text-align:start (default) to avoid rivers.",
        "Apply hyphenation only to reading surfaces (p, li), not to nav labels or buttons."
      ]
    },

    "P1_consistent_gutters_between_home_and_storefront": {
      "problem": "Storefront uses its own --tk-gutter which can diverge from homepage padding rhythm; user wants a clear Schaufenster feel and unity.",
      "rule": "Do not replace Storefront layout; only align gutter logic to homepage tokens.",
      "recommended_css_changes": [
        {
          "file": "/app/apps/web/components/shop/Storefront.css",
          "selector": ".site-teileklar",
          "change": "Set --tk-gutter to reuse homepage padding tokens: --tk-gutter: var(--layout-page-padding); and add a wide override: @media(min-width:1400px){ .site-teileklar{ --tk-gutter: var(--layout-home-wide-padding); } }",
          "why": "This makes commerce pages inherit the same left/right rhythm as the homepage, especially on wide displays where Home uses --layout-home-wide-padding."
        }
      ],
      "acceptance_checks": [
        "Header, nav, and storefront page content align with homepage container edges at common breakpoints.",
        "No horizontal scroll introduced on 320px devices.",
        "Commerce still feels denser than editorial home, but not like a different site."
      ]
    },

    "P1_interaction_consistency": {
      "goal": "Keep micro-interactions consistent with homepage (subtle translate/scale, champagne arrows, lime focus ring).",
      "rules": [
        "Never use transition: all.",
        "Prefer transition on transform, box-shadow, border-color only.",
        "Hover lift should be <= 2px (already used in Storefront cards)."
      ],
      "recommended_alignment": [
        {
          "file": "/app/apps/web/components/shop/Storefront.css",
          "selector": ".site-teileklar .tk-card",
          "change": "Expand transition to include border-color and box-shadow (not all): transition: transform 180ms ease, border-color 180ms ease, box-shadow 180ms ease;",
          "why": "Matches HomeConcept where cards shift via shadow polish; keeps motion consistent and premium."
        }
      ]
    }
  },

  "homepage_as_layout_master_rules_for_inner_pages": {
    "principle": "Every inner page must feel like it is a direct descendant of the homepage: same container rhythm, same typography hierarchy, same material edges (champagne rim only on non-hero images), same CTA language.",
    "layout_primitives_to_reuse": {
      "container": {
        "name": "hc-container rhythm",
        "definition": "max-width: var(--layout-content-max); padding-inline: var(--layout-page-padding); margin-inline:auto;",
        "wide_override": "@container home (min-width:1400px) use padding-inline: var(--layout-home-wide-padding)"
      },
      "section_spacing": {
        "definition": "Use padding-block var(--space-7) to var(--space-8) for major sections; avoid random one-off values.",
        "note": "HomeConcept uses --space-7/8 heavily; mirror that cadence."
      },
      "cards": {
        "definition": "Use var(--gradient-atelier-glass) + var(--shadow-atelier) for premium panels; fallback to var(--color-atelier-surface) when reduced transparency.",
        "radius": "var(--radius-atelier) for editorial cards; var(--radius-karte) for dense commerce cards."
      }
    },
    "typography_rules": {
      "headings": {
        "h1": "Hero only. Use var(--type-hero-size) and text-wrap:balance.",
        "h2": "Section headings: font: 500 var(--type-section-size)/1.15 var(--font-display); max-width ~20–26ch.",
        "h3": "Card headings: var(--type-card-size) with balance; keep max-width ~20–22ch where possible."
      },
      "body": {
        "measure": "Default max-width 60–65ch for paragraphs; 48–52ch for lead paragraphs.",
        "hyphenation": "hyphens:auto for German reading text; avoid overflow-wrap:anywhere on editorial headings.",
        "wrapping": "Use text-wrap:pretty for paragraphs; text-wrap:balance for headings only."
      }
    },
    "cta_rules": {
      "primary": "One primary action per section max. Primary uses lime or champagne depending on context (homepage finish uses champagne).",
      "secondary": "Secondary is quiet/underline; never compete with primary.",
      "data_testid_examples": [
        "home-finish-primary-cta",
        "home-gallery-card-link",
        "storefront-search-submit-button",
        "product-card-add-to-cart-button"
      ]
    }
  },

  "image_urls": {
    "homepage_hero": [
      {
        "category": "hero",
        "description": "IdentityHero editorial still (must remain 16/9, no champagne rim per policy comment in CSS)",
        "url": "/media/higgsfield/hf-02-lobby-walk.webp"
      }
    ],
    "homepage_gallery_cards": [
      {
        "category": "gallery",
        "description": "Gallery card 1",
        "url": "/media/higgsfield/hf-04-studio-desk.webp"
      },
      {
        "category": "gallery",
        "description": "Gallery card 2",
        "url": "/media/higgsfield/hf-07.webp"
      },
      {
        "category": "gallery",
        "description": "Gallery card 3",
        "url": "/media/higgsfield/hf-08.webp"
      }
    ],
    "homepage_product_story": [
      {
        "category": "product",
        "description": "Product story still 1",
        "url": "/media/higgsfield/hf-06.webp"
      },
      {
        "category": "product",
        "description": "Product story still 2",
        "url": "/media/higgsfield/hf-09.webp"
      },
      {
        "category": "product",
        "description": "Product story still 3",
        "url": "/media/higgsfield/hf-03-loft-studio.webp"
      },
      {
        "category": "product",
        "description": "Product story still 4",
        "url": "/media/higgsfield/hf-05-atrium-walk.webp"
      }
    ],
    "homepage_finish_cast": [
      {
        "category": "finish",
        "description": "Cutout trio used in finish section",
        "url": "/media/higgsfield/hf-17-cutout.webp"
      }
    ]
  },

  "component_path": {
    "homepage": {
      "HomeContent": "/app/apps/web/components/HomeContent.tsx",
      "HomeConceptCSS": "/app/apps/web/components/HomeConcept.css",
      "IdentityHero": "/app/apps/web/components/IdentityHero.tsx",
      "IdentityHeroCSS": "/app/apps/web/components/IdentityHero.css"
    },
    "commerce": {
      "StorefrontCSS": "/app/apps/web/components/shop/Storefront.css",
      "Storefront": "/app/apps/web/components/shop/Storefront.tsx",
      "ProductCard": "/app/apps/web/components/shop/ProductCard.tsx"
    },
    "public_shell": {
      "PublicContent": "/app/apps/web/components/PublicContent.tsx",
      "PublicContentLayoutCSS": "/app/apps/web/components/PublicContentLayout.css"
    }
  },

  "instructions_to_main_agent": [
    "Do NOT create a new homepage. Only polish existing IdentityHero/HomeConcept CSS and align Storefront gutters to homepage tokens.",
    "Fix the German hero headline fragmentation by removing overflow-wrap:anywhere and controlling the 2nd line with a container-query nowrap hook.",
    "Ensure hyphenation works by setting correct lang attribute for German routes; keep hyphens:auto on reading text.",
    "Unify gutters: Storefront --tk-gutter should reuse --layout-page-padding and switch to --layout-home-wide-padding on wide screens.",
    "Keep hero image proportions and composition unchanged; no new media sources.",
    "All interactive elements must keep/receive data-testid (already present on hero and home cards; ensure commerce controls also comply).",
    "No new tokens, no new colors, no new fonts. Use existing variables only."
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
