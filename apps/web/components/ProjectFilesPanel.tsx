"use client";
import {useEffect, useId, useRef, useState} from 'react';
import {FILE_ACCEPT, FILE_LIMITS, inspectFiles, preparationManifest, validProjectLabel, type PreparedFile} from '../lib/project-files';
import type {Locale} from '../lib/i18n';
import './ProjectFilesPanel.css';

const copy = {
  de: {title:'Unterlagen vorbereiten', intro:'Wähle Bilder, ein Pflichtenheft oder Spezifikationen für dein Projekt. Die Prüfung erfolgt auf diesem Gerät. Es wird nichts hochgeladen oder an den Chat gesendet.', project:'Projektbezeichnung', purpose:'Verwendungszweck', choices:['Briefing','Pflichtenheft / Spezifikation','Bildmaterial'], pick:'Dateien auswählen', formats:'PDF, PNG, JPG, WebP, UTF-8-Text, Markdown oder JSON. Bis zu 10 Dateien, 10 MiB je Datei und 25 MiB insgesamt.', working:'Dateien werden lokal geprüft …', ready:'Lokal vorbereitet · noch nicht übertragen', conflict:'Gleicher Name, anderer Inhalt: Fassung prüfen', version:'Als zusätzliche Fassung behalten', remove:'Entfernen', clear:'Auswahl verwerfen', export:'Dateiliste mit Prüfsummen herunterladen', note:'Die Dateiliste enthält Namen und Prüfsummen, keine Dateiinhalte. Originaldateien bleiben auf deinem Gerät. Eine Projektberechtigung oder sichere Serverübernahme ist damit nicht bestätigt.', failed:'Die Auswahl konnte nicht geprüft werden. Prüfe Dateianzahl, Größe und Format.', rejected:'Nicht übernommen', reasons:{format_or_name:'Name oder Format nicht unterstützt',media_type:'Dateityp passt nicht zur Endung',content_format:'Inhalt passt nicht zum Format',duplicate:'Identischer Inhalt bereits ausgewählt'}, hash:'SHA-256', cancel:'Prüfung abbrechen'},
  nl: {title:'Documenten voorbereiden',intro:'Kies afbeeldingen, een briefing of specificaties voor je project. De controle gebeurt op dit apparaat. Er wordt niets geüpload of naar de chat gestuurd.',project:'Projectnaam',purpose:'Doel',choices:['Briefing','Eisen / specificatie','Afbeeldingen'],pick:'Bestanden kiezen',formats:'PDF, PNG, JPG, WebP, UTF-8-tekst, Markdown of JSON. Maximaal 10 bestanden, 10 MiB per bestand en 25 MiB totaal.',working:'Bestanden worden lokaal gecontroleerd …',ready:'Lokaal voorbereid · nog niet overgedragen',conflict:'Dezelfde naam, andere inhoud: controleer de versie',version:'Als extra versie bewaren',remove:'Verwijderen',clear:'Selectie wissen',export:'Bestandslijst met controlesommen downloaden',note:'De lijst bevat namen en controlesommen, geen bestandsinhoud. Originelen blijven op je apparaat. Dit bevestigt geen projectrechten of veilige serveropslag.',failed:'Controle niet gelukt. Controleer aantal, grootte en formaat.',rejected:'Niet opgenomen',reasons:{format_or_name:'Naam of formaat niet ondersteund',media_type:'Bestandstype past niet bij extensie',content_format:'Inhoud past niet bij formaat',duplicate:'Identieke inhoud al geselecteerd'},hash:'SHA-256',cancel:'Controle annuleren'},
  fr: {title:'Préparer les documents',intro:'Choisis des images, un cahier des charges ou des spécifications pour ton projet. La vérification se fait sur cet appareil. Aucun envoi au serveur ou au chat.',project:'Nom du projet',purpose:'Utilisation',choices:['Brief','Cahier des charges / spécification','Images'],pick:'Choisir des fichiers',formats:'PDF, PNG, JPG, WebP, texte UTF-8, Markdown ou JSON. Maximum 10 fichiers, 10 Mio par fichier et 25 Mio au total.',working:'Vérification locale des fichiers …',ready:'Préparé localement · pas encore transféré',conflict:'Même nom, contenu différent : vérifier la version',version:'Conserver comme version supplémentaire',remove:'Retirer',clear:'Effacer la sélection',export:'Télécharger la liste et les empreintes',note:'La liste contient les noms et empreintes, aucun contenu. Les originaux restent sur ton appareil. Cela ne confirme ni les droits du projet ni le stockage serveur.',failed:'Vérification impossible. Vérifie le nombre, la taille et le format.',rejected:'Non retenu',reasons:{format_or_name:'Nom ou format non pris en charge',media_type:'Type incompatible avec extension',content_format:'Contenu incompatible avec format',duplicate:'Contenu identique déjà sélectionné'},hash:'SHA-256',cancel:'Annuler la vérification'},
  en: {title:'Prepare project files',intro:'Choose images, requirements or specifications for your project. Checks run on this device. Nothing is uploaded or sent to chat.',project:'Project label',purpose:'Purpose',choices:['Briefing','Requirements / specification','Images'],pick:'Choose files',formats:'PDF, PNG, JPG, WebP, UTF-8 text, Markdown or JSON. Up to 10 files, 10 MiB each and 25 MiB in total.',working:'Checking files locally …',ready:'Prepared locally · not transferred',conflict:'Same name, different content: review version',version:'Keep as an additional version',remove:'Remove',clear:'Discard selection',export:'Download file list with checksums',note:'The list contains names and checksums, no file contents. Originals remain on your device. This confirms neither project authorization nor secure server storage.',failed:'Could not check the selection. Check file count, size and format.',rejected:'Not included',reasons:{format_or_name:'Unsupported name or format',media_type:'Media type does not match extension',content_format:'Content does not match format',duplicate:'Identical content already selected'},hash:'SHA-256',cancel:'Cancel checks'},
} as const;

export default function ProjectFilesPanel({locale='de'}:{locale?:Locale}) {
  const t=copy[locale], id=useId(), input=useRef<HTMLInputElement>(null), controller=useRef<AbortController|null>(null);
  const [project,setProject]=useState(''), [purpose,setPurpose]=useState('briefing'), [files,setFiles]=useState<PreparedFile[]>([]);
  const [rejected,setRejected]=useState<{name:string;reason:string}[]>([]), [busy,setBusy]=useState(false), [failed,setFailed]=useState(false);
  useEffect(()=>()=>controller.current?.abort(),[]);
  function cancel(){controller.current?.abort();controller.current=null;setBusy(false);if(input.current)input.current.value='';}
  function clear(){cancel();setFiles([]);setRejected([]);setFailed(false);}
  async function choose(selection:File[]) {
    cancel();const run=new AbortController();controller.current=run;setBusy(true);setFailed(false);setRejected([]);
    try {const result=await inspectFiles(selection,files,run.signal);if(controller.current===run){setFiles(previous=>[...previous,...result.files]);setRejected(result.rejected);}}
    catch(error){if(controller.current===run&&!(error instanceof DOMException&&error.name==='AbortError'))setFailed(true);}
    finally{if(controller.current===run){controller.current=null;setBusy(false);if(input.current)input.current.value='';}}
  }
  function download(){
    const manifest=preparationManifest(project,purpose,files);
    const url=URL.createObjectURL(new Blob([JSON.stringify(manifest,null,2)+'\n'],{type:'application/json'}));
    const link=document.createElement('a');link.href=url;link.download='nexify-projekt-dateiliste.json';document.body.append(link);link.click();link.remove();setTimeout(()=>URL.revokeObjectURL(url),1000);
  }
  return <details className="project-files" data-testid="project-files"><summary>{t.title}</summary><div className="project-files-body">
    <p>{t.intro}</p>
    <label htmlFor={`${id}-project`}>{t.project}</label><input id={`${id}-project`} value={project} maxLength={120} onChange={event=>setProject(event.target.value)} autoComplete="off"/>
    <label htmlFor={`${id}-purpose`}>{t.purpose}</label><select id={`${id}-purpose`} value={purpose} onChange={event=>setPurpose(event.target.value)}>{['briefing','specification','images'].map((value,index)=><option key={value} value={value}>{t.choices[index]}</option>)}</select>
    <label htmlFor={`${id}-files`}>{t.pick}</label><input ref={input} id={`${id}-files`} type="file" accept={FILE_ACCEPT} multiple disabled={busy||files.length>=FILE_LIMITS.count} aria-describedby={`${id}-formats`} onChange={event=>void choose(Array.from(event.target.files??[]))}/>
    <p id={`${id}-formats`}>{t.formats}</p>
    <p role="status">{busy?t.working:files.length?t.ready:''}</p>{busy&&<button type="button" onClick={cancel}>{t.cancel}</button>}
    {failed&&<p role="alert">{t.failed}</p>}
    {rejected.length>0&&<div role="status"><p>{t.rejected}</p><ul>{rejected.map((row,index)=><li key={index}>{row.name}: {t.reasons[row.reason as keyof typeof t.reasons]}</li>)}</ul></div>}
    <ul className="project-files-list">{files.map((file,index)=><li key={file.sha256}><strong>{file.name}</strong><span>{new Intl.NumberFormat(locale).format(file.bytes)} B</span><details><summary>{t.hash}</summary><code>{file.sha256}</code></details>
      {file.state==='version_conflict'&&<><p>{t.conflict}</p><button type="button" disabled={busy} onClick={()=>setFiles(rows=>rows.map((row,i)=>i===index?{...row,state:'prepared'}:row))}>{t.version}</button></>}
      <button type="button" disabled={busy} aria-label={`${t.remove}: ${file.name}`} onClick={()=>setFiles(rows=>rows.filter((_,i)=>i!==index))}>{t.remove}</button></li>)}</ul>
    {files.length>0&&<><button type="button" disabled={busy||!validProjectLabel(project)||files.some(file=>file.state!=='prepared')} onClick={download}>{t.export}</button><button type="button" onClick={clear}>{t.clear}</button></>}
    <p>{t.note}</p>
  </div></details>;
}
