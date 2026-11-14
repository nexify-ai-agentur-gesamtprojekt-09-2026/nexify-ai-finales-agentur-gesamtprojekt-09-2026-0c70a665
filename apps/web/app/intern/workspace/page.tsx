import {cookies} from 'next/headers';
import WorkspaceStatusPanel from '../../../components/WorkspaceStatusPanel';
import MailWorkspacePanel from '../../../components/MailWorkspacePanel';
import ProjectFilesPanel from '../../../components/ProjectFilesPanel';
import {PortalWorkspace} from '../../../components/PortalWorkspace';
import {internalWorkspaceSurfacesOn} from '../../../auth/internal-workspace';
// Die Seite verhält sich wie die übrigen geschützten Seiten (app/[...slug]/page.tsx): dieselbe Hülle „Geschützter Bereich“,
// derselbe Titel. apps/web kann keine Sitzung prüfen (Lücke G19); die drei Arbeitsflächen werden deshalb nur ausgeliefert,
// wenn der Schalter aus auth/internal-workspace.ts an ist (Standard aus, in der Vercel-Produktion wirkungslos).
// Der Schalter wird je Aufruf gelesen, nicht beim Build.
export const dynamic='force-dynamic';
export const metadata={title:'Geschützter Bereich',robots:{index:false,follow:false}};
type Props={searchParams:Promise<{ansicht?:string}>};
export default async function InternalWorkspace({searchParams}:Props){
 if(internalWorkspaceSurfacesOn(process.env))return <><WorkspaceStatusPanel/><MailWorkspacePanel/><ProjectFilesPanel/></>;
 // Wie bei den anderen Seiten ist das Cookie kein Nachweis einer Sitzung: Es entscheidet nur, ob die Hülle die
 // Schnittstelle /api/auth/me überhaupt fragt. Daten und Rollen prüft allein der Dienst dahinter.
 return <PortalWorkspace sessionPresent={(await cookies()).has('tk_session')} path="/intern/workspace" view={(await searchParams).ansicht||'overview'}/>;
}
