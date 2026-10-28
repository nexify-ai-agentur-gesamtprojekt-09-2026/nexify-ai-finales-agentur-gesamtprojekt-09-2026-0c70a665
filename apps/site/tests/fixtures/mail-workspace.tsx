// Isolated synthetic fixture; not an identity or mailbox binding for production.
import {createRoot} from 'react-dom/client';
import Workspace from '../../../web/components/Workspace';
import MailWorkspacePanel from '../../../web/components/MailWorkspacePanel';
import '../../../../packages/tokens/tokens.css';
import '../../../web/app/globals.css';
createRoot(document.getElementById('root')!).render(<Workspace pages={[]}><MailWorkspacePanel/></Workspace>);
