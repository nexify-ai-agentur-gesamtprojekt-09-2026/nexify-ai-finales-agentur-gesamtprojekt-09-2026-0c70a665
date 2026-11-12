// Verified against the 17-image contact sheet on 2026-11-08.
// Filenames are historical labels, not descriptions. These are brand scenes,
// never screenshots, client references, product photographs or proof of work.
export const brandImages={
 welcome:{src:'/media/higgsfield/hf-01-meeting-table-1920.webp',alt:'Markeninszenierung: Pascal geht mit NeX und AIFly ORACLE an einer Wand mit gerahmten Entwürfen entlang'},
 home:{src:'/media/higgsfield/hf-02-lobby-walk-1920.webp',alt:'Markeninszenierung: Pascal zeigt Papierlayouts und ein Modell auf einem Ateliertisch, begleitet von NeX und AIFly ORACLE'},
 atelier:{src:'/media/higgsfield/hf-03-loft-studio-1920.webp',alt:'Markeninszenierung: Pascal mit Layouttafeln, Modellen, NeX und AIFly ORACLE im Atelier'},
 company:{src:'/media/higgsfield/hf-04-studio-desk-1920.webp',alt:'Markeninszenierung: Pascal geht mit NeX und AIFly ORACLE durch eine offene Büroumgebung'},
 contact:{src:'/media/higgsfield/hf-05-atrium-walk-1920.webp',alt:'Markeninszenierung: Pascal hört einer Person am Besprechungstisch zu; NeX und AIFly ORACLE begleiten das Gespräch'},
 scope:{src:'/media/higgsfield/hf-06-1920.webp',alt:'Markeninszenierung: Pascal erläutert Unterlagen am Besprechungstisch, begleitet von NeX und AIFly ORACLE'},
 automation:{src:'/media/higgsfield/hf-07-1920.webp',alt:'Markeninszenierung: Pascal bespricht Unterlagen mit einem Mitarbeiter an einer Fertigungsanlage; NeX und AIFly ORACLE sind dabei'},
 logistics:{src:'/media/higgsfield/hf-08-1920.webp',alt:'Markeninszenierung: Pascal und eine Mitarbeiterin im Gespräch an einer Förderanlage mit Kartons; begleitet von NeX und AIFly ORACLE'},
 entrance:{src:'/media/higgsfield/hf-09-1920.webp',alt:'Markeninszenierung: Pascal, NeX und AIFly ORACLE im Eingangsbereich eines Gebäudes'},
 planning:{src:'/media/higgsfield/hf-10-1920.webp',alt:'Markeninszenierung: Pascal bespricht ein Dokument mit einer Gesprächspartnerin im Empfangsbereich'},
 workspace:{src:'/media/higgsfield/hf-11-1920.webp',alt:'Markeninszenierung: Pascal und eine Gesprächspartnerin schauen gemeinsam auf ein Tablet; NeX und AIFly ORACLE begleiten sie'},
 production:{src:'/media/higgsfield/hf-12-1920.webp',alt:'Markeninszenierung: Pascal im Gespräch mit einer Person in Hygienekleidung an einer Produktionsanlage'},
 process:{src:'/media/higgsfield/hf-13-1920.webp',alt:'Markeninszenierung: Pascal und eine Mitarbeiterin betrachten gemeinsam Unterlagen in einer Fertigungshalle'},
 design:{src:'/media/higgsfield/hf-14-1920.webp',alt:'Markeninszenierung: Pascal bespricht gedruckte Entwürfe und Materialmuster mit einem Gesprächspartner am Tisch'},
 marketing:{src:'/media/higgsfield/hf-15-1920.webp',alt:'Markeninszenierung: Pascal bespricht ein gedrucktes Layout mit einer Gesprächspartnerin im Atelier'},
 integration:{src:'/media/higgsfield/hf-16-1920.webp',alt:'Markeninszenierung: Pascal und ein Gesprächspartner betrachten Pläne und ein technisches Modell auf einem Arbeitstisch'},
 finish:{src:'/media/higgsfield/hf-17-cutout-1920.webp',alt:'Markeninszenierung: Pascal mit NeX und AIFly ORACLE, freigestellte Markenfiguren'}
} as const;

// Responsive Fassungen: 800/1280/1920 px liegen neben der Vollfassung.
// Der Browser laedt nur die Groesse, die das Layout braucht (sizes an der <img>-Stelle).
export function srcSetFor(src: string): string | undefined {
  if (!src.endsWith('-1920.webp')) return undefined; // auch der Freisteller hf-17-cutout hat 800/1280/1920 (Alpha, siehe tests/test_media_cutout_alpha.py)
  const base = src.slice(0, -'-1920.webp'.length);
  return [800, 1280, 1920].map(w => `${base}-${w}.webp ${w}w`).join(', ');
}

export type BrandImage=typeof brandImages[keyof typeof brandImages];
// Page mapping verified visually against every still (contact sheet, 2026-11-08):
//  home          hf-02  Pascal presents paper website layouts, a model and a tablet at the Factory table
//  services      hf-03  atelier desk with layouts, model and app tablet: all disciplines in one place
//  websites      hf-14  printed designs and material samples with a client: brand appearance
//  automation    hf-07  machine hall, process document handed to a worker
//  apps-portals  hf-11  shared tablet with an application: digital workspace
//  scope         hf-05  Pascal listens to a client at the table with plans: the goal comes first
//  pricing       hf-06  document explained with pen in hand: calculated and traceable
//  solutions     hf-15  printed campaign layout in the atelier: growth and campaigns
//  knowledge     hf-01  walk along the wall of framed work: the way of working behind it
//  knowledge-start hf-10 briefing document handed over at the reception desk
//  company       hf-04  walk through the open Factory office with the team
//  contact       hf-09  Pascal approaches with an open hand at the entrance
//  nex2fly       hf-11  tablet workspace (own working environment)
//  one           hf-12  AI in day-to-day operations on a production line
//  api           hf-16  plans and technical model with a developer: integration
//  aifly-oracle  hf-01  walk along the wall of framed work: the companion who accompanies and puts things in order
//  nex-agentic   hf-07  machine hall, process document handed to a worker: the executing side
//  skills-mcp    hf-16  plans and technical model: connecting tools and systems
//  portals       hf-09  open hand at the entrance: the right way in per audience
//  tk-home       hf-08  conveyor with parts boxes: parts logistics
//  tk-fitment    hf-16  technical plans and model: exact specification before buying
//  tk-appointments hf-10 appointment at the reception desk
//  tk-vouchers   hf-06  conditions explained on paper
//  tk-partner    hf-07  work order handed to a workshop employee
//  tk-workshop   hf-13  workshop employee with clipboard in the parts hall
const pageKeys:Record<string,keyof typeof brandImages>={home:'home',services:'atelier',websites:'design',automation:'automation','apps-portals':'workspace',scope:'contact',pricing:'scope',solutions:'marketing',knowledge:'welcome','knowledge-start':'planning',company:'company',contact:'entrance',nex2fly:'workspace',one:'production',api:'integration','aifly-oracle':'welcome','nex-agentic':'automation','skills-mcp':'integration',portals:'entrance','tk-home':'logistics','tk-fitment':'integration','tk-appointments':'planning','tk-vouchers':'scope','tk-partner':'automation','tk-workshop':'process'};
export function pageImage(pageId:string):BrandImage|undefined{return pageKeys[pageId]?brandImages[pageKeys[pageId]]:undefined;}
export function imageAlt(image:BrandImage,locale:string){return locale==='de'?image.alt:({nl:'Merkillustratie met Pascal, NeX en AIFly ORACLE – geen productfoto of klantreferentie.',fr:'Illustration de marque avec Pascal, NeX et AIFly ORACLE – ni photo produit ni référence client.',en:'Brand illustration with Pascal, NeX and AIFly ORACLE, not a product photo or client reference.'}[locale]||image.alt);}
