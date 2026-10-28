// Isolated local fixture only. No production identity, membership or backend binding.
import {createRoot} from 'react-dom/client';
import Workspace from '../../../web/components/Workspace';
import WorkspaceStatusPanel from '../../../web/components/WorkspaceStatusPanel';
import '../../../../packages/tokens/tokens.css';
import '../../../web/app/globals.css';
createRoot(document.getElementById('root')!).render(<Workspace pages={[]}><WorkspaceStatusPanel/></Workspace>);
