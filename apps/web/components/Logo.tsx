/* NeXify-Logo – die eine Stelle fuer Figur, Wortmarke und Claim.
   Figur: ein Dateipfad (LOGO_FIGUR), feste 1:1-Box. Die Datei ist aus dem gelieferten Bild freigestellt
   (scripts/logo-freistellen.py); kommt die hochaufgeloeste Vorlage, wird nur diese Datei getauscht.
   Wortmarke und Claim sind echter Text in der Hausschrift; das X traegt das Signal-Lime, der Claim den Nebentext-Ton.
   Gestaltung: AtelierSystem.css, Abschnitt "Logo". */
export const LOGO_FIGUR='/brand/nexify-figur.png';
export const LOGO_CLAIM='Chat it. Automate it.';
/* Voller Name des Assistenten (Arbeitsfassung des Inhabers, 14.11.2026). Immer vollstaendig; zweizeilig gesetzt:
   Zeile 1 traegt den Eigennamen, Zeile 2 die Herkunft. */
export const ORACLE_NAME=['AIFly ORACLE','with NeXify AI Intelligence by NeXify'] as const;
export const ORACLE_NAME_VOLL=ORACLE_NAME.join(' ');

export function OracleName({as:Tag='p',className}:{as?:'p'|'h2'|'span';className?:string}){
  return <Tag className={['nx-oracle-name',className].filter(Boolean).join(' ')}><strong>{ORACLE_NAME[0]}</strong> <span className="panel-identity-subtitle">{ORACLE_NAME[1]}</span></Tag>;
}

type LogoProps={
  /** voll = Figur + Wortmarke + Claim · ohne-claim = Figur + Wortmarke · figur = nur die Figur */
  variante?:'voll'|'ohne-claim'|'figur';
  /** s = Fuss/kompakt · m = Kopfleiste · l = Buehne (Hinweise, Blaetter) */
  groesse?:'s'|'m'|'l';
  /** Wortmarke eines Bereichs (z. B. TEILEKLAR); ohne Angabe „NeXify AI" mit X im Signal-Lime */
  wort?:React.ReactNode;
  claim?:string;
  className?:string;
};

export function Logo({variante='voll',groesse='m',wort,claim=LOGO_CLAIM,className}:LogoProps){
  return <span className={['nx-logo',className].filter(Boolean).join(' ')} data-variante={variante} data-groesse={groesse}>
    <span className="nx-logo-figur" aria-hidden="true">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={LOGO_FIGUR} alt="" width={512} height={512} decoding="async" draggable={false}/>
    </span>
    {variante!=='figur'&&<span className="nx-logo-wort">
      <span className="nx-logo-name">{wort??<>Ne<span className="nx-logo-x">X</span>ify AI</>}</span>
      {variante==='voll'&&<span className="nx-logo-claim">{claim}</span>}
    </span>}
  </span>;
}
