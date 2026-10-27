// Development-only test entry, never imported by the production application.
// No approved production asset or real video/audio decoding is claimed here.
import {useState} from "react";
import {createRoot} from "react-dom/client";
import PresenterVideo,{type PublicVideo} from "../../../web/components/PresenterVideo";
import ExplainerSections,{type ExplainerModule} from "../../../web/components/ExplainerSections";
import "../../../../packages/tokens/tokens.css";
import "../../../web/app/globals.css";
function Fixture(){
  const [locale,setLocale]=useState<PublicVideo["locale"]>("de");
  const [visible,setVisible]=useState(true);
  const [invalid,setInvalid]=useState(false);
  const [moduleMode,setModuleMode]=useState(false);
  const asset:PublicVideo={id:"CONTROLLER_TEST_ONLY",version:1,locale,src:invalid?"https://invalid.example/never-fetch.webm":"/media/test-only/controller.webm",mime:"video/webm",captionsSrc:`/media/test-only/${locale}.vtt`,title:"Synthetic controller fixture",transcript:"Synthetic transcript <script>never executed</script>",width:640,height:480,durationSeconds:1};
  const tr=(value:string)=>({de:value,nl:value,fr:value});
  const modules:ExplainerModule[]=["first","second"].map(id=>({id,speaker:"aifly",title:tr(id+" contextual chapter"),body:tr("Isolated copy, not a production script."),outcome:tr("Read the appropriate context."),media_side:"left",media:{status:"asset_pending",src:null,captions:null},next_action:{type:"route",target_id:"missing",label:tr("Next")},source_refs:[]}));
  const routeFilm={...asset,locale:"de" as const,id:"ROUTE_TEST",title:"Route context film"};
  const moduleFilm={...asset,locale:"de" as const,id:"MODULE_TEST",title:"Second module film"};
  return <main style={{maxWidth:800,margin:"0 auto"}}><h1>Controller test only — no generated or approved film</h1>
    <label>Locale<select value={locale} onChange={event=>setLocale(event.target.value as PublicVideo["locale"])}><option>de</option><option>nl</option><option>fr</option></select></label>
    <button type="button" id="unmount" onClick={()=>setVisible(value=>!value)}>Mount / unmount</button>
    <button type="button" id="invalid" onClick={()=>setInvalid(value=>!value)}>Invalid source</button>
    <button type="button" id="module-mode" onClick={()=>setModuleMode(true)}>Module binding test</button>
    {moduleMode?<ExplainerSections modules={modules} pages={[]} video={routeFilm} moduleVideos={{first:{nl:{...moduleFilm,locale:"nl"}},second:{de:moduleFilm},foreign:{de:{...moduleFilm,id:"UNBOUND_TEST"}}}}/>:visible?<><PresenterVideo video={asset} locale={locale} hero/><PresenterVideo video={{...asset,id:"SECOND_CONTROLLER_TEST"}} locale={locale}/></>:null}
  </main>;
}
createRoot(document.getElementById("root")!).render(<Fixture/>);
