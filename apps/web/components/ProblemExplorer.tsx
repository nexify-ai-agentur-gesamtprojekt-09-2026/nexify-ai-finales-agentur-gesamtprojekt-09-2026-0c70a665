import interfaceCopy from "../../../config/public-interface-copy.json";
import {Zeichen} from "./Zeichen";
import {useState,type KeyboardEvent} from 'react';
import {ActionButton,ActionLink} from './ActionControl';
import {useUI} from './Workspace';
import './ProblemExplorer.css';

const examples=interfaceCopy.packages;
export const ProblemExplorer=()=>{
 const {locale,chatReady}=useUI();const t=examples[locale];const [selected,setSelected]=useState(0);const item=t.items[selected];
 const key=(event:KeyboardEvent<HTMLButtonElement>,index:number)=>{let next=index;if(event.key==='ArrowRight')next=(index+1)%t.items.length;else if(event.key==='ArrowLeft')next=(index+t.items.length-1)%t.items.length;else if(event.key==='Home')next=0;else if(event.key==='End')next=t.items.length-1;else return;event.preventDefault();setSelected(next);document.getElementById(`problem-tab-${t.items[next].id}`)?.focus();};
 return <div className="problem-explorer" data-testid="problem-explorer" aria-labelledby="problem-explorer-title"><div className="problem-heading"><h3 id="problem-explorer-title" data-testid="problem-explorer-title">{t.title}</h3><p data-testid="problem-explorer-intro">{t.intro}</p></div>
  <div className="problem-tabs" role="tablist" aria-label={t.title}>{t.items.map((entry,i)=><ActionButton key={entry.id} id={`problem-tab-${entry.id}`} variant="secondary" role="tab" aria-selected={selected===i} aria-controls="problem-detail" tabIndex={selected===i?0:-1} data-testid={`problem-tab-${entry.id}`} onClick={()=>setSelected(i)} onKeyDown={event=>key(event,i)}>{entry.title}</ActionButton>)}</div>
  <div id="problem-detail" className="problem-detail" role="tabpanel" aria-labelledby={`problem-tab-${item.id}`} tabIndex={0} data-testid="problem-detail"><div className="problem-before"><span className="problem-label">{t.before}</span><p data-testid="problem-before">{item.before}</p></div><div className="problem-flow"><span className="problem-label">{t.flow}</span><ol data-testid="problem-flow">{item.steps.map((step,i)=><li key={step}><span className="problem-step-number" aria-hidden="true">0{i+1}</span><span>{step}</span></li>)}</ol></div><div className="problem-after"><span className="problem-label">{t.after}</span><p data-testid="problem-result">{item.result}</p></div></div>
  <div className="problem-action"><ActionLink variant="primary" href="/leistungsumfang" data-testid="problem-use-button" onClick={event=>{if(chatReady){event.preventDefault();window.dispatchEvent(new CustomEvent('nexify-project-prefill',{detail:item.prefill}));}}}>{t.cta}<Zeichen name="pfeil" groesse={18}/></ActionLink><p data-testid="problem-scope">{t.note}</p></div>
 </div>;
};
