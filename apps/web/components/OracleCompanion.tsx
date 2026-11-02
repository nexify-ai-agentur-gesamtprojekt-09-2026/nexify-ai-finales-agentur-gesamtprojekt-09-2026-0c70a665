import artwork from '../../../config/presenter-artwork.json';
import "./OracleCompanion.css";

/** Decorative original beside an already named chat control/heading.
 * Activity reflects actual local request state, never provider availability. */
export default function OracleCompanion({working=false}:{working?:boolean}){
 return <span className="aifly-symbol oracle-companion" data-state={working?"working":"idle"} aria-hidden="true"><img src={artwork.images.aifly.src} alt="" width="34" height="34" decoding="async"/></span>;
}
