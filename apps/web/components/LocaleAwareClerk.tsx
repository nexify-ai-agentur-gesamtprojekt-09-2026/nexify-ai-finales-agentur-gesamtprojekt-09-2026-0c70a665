import type {ReactNode} from 'react';
// Clerk removed (DECISIONS D-007): passthrough kept only so evidence inventories resolve; never mounted.
export default function LocaleAwareClerk({children}:{children:ReactNode;providerProps?:unknown}){
 return <>{children}</>;
}
