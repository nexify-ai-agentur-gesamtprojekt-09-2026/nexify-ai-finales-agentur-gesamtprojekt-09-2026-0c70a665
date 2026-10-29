// Local provider double only: no identity, cookies, credentials or account calls.
import {createRoot} from 'react-dom/client';
import {useState} from 'react';
import LocaleAwareClerk from '../../../web/components/LocaleAwareClerk';
function Child(){const[count,setCount]=useState(0);return <button onClick={()=>setCount(count+1)}>Child state {count}</button>;}
createRoot(document.getElementById('root')!).render(<LocaleAwareClerk providerProps={{publishableKey:"pk_test_synthetic_server_public",signInUrl:"/anmelden",signUpUrl:"/registrieren"}}><Child/></LocaleAwareClerk>);
