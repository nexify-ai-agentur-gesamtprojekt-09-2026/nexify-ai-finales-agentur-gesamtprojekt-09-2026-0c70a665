import {LOGO_FIGUR} from './Logo';
import "./OracleCompanion.css";

/** Decorative original beside an already named chat control/heading.
 * Activity reflects actual local request state, never provider availability. */
export default function OracleCompanion({working=false}:{working?:boolean}){
 return <span className="aifly-symbol oracle-companion" data-state={working?"working":"idle"} aria-hidden="true"><img src={LOGO_FIGUR} alt="" width="34" height="34" decoding="async"/></span>;
}
