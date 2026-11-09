// Isolated local fixture only. No production identity, membership or backend binding.
import {createRoot} from 'react-dom/client';
import type {Locale} from '../../../web/lib/i18n';
import Workspace from '../../../web/components/Workspace';
import WorkspaceStatusPanel from '../../../web/components/WorkspaceStatusPanel';
import '../../../../packages/tokens/tokens.css';
import '../../../web/app/globals.css';
// The language is URL-driven in the product (apps/web/proxy.ts → layout.tsx → <Workspace initialLocale>); the fixture mirrors that with `?lang=`.
const requested=new URLSearchParams(location.search).get('lang');
const initialLocale:Locale=requested==='nl'?'nl':'de';
createRoot(document.getElementById('root')!).render(<Workspace pages={[]} initialLocale={initialLocale}><WorkspaceStatusPanel/></Workspace>);
