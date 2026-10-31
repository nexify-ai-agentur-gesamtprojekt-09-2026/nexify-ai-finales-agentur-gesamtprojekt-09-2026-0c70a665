import type {AuthEnvironment} from './policy';
// Legacy Clerk prop mapping (DECISIONS D-007): kept for inventories, no SDK is loaded.
export type PublicProviderProps=Record<string,unknown>&{
 __internal_clerkJSUrl?:string;__internal_clerkJSVersion?:string;__internal_clerkUIUrl?:string;__internal_clerkUIVersion?:string;
};
const truth=(v:string|undefined)=>v?.toLowerCase()==='true'||(v?.toLowerCase()!=='false'&&parseInt(v||'',10)>0);
// Preserve the public server-resolved defaults from pinned @clerk/nextjs7.9.20
// mergeNextClerkPropsWithEnv and @clerk/shared4.41.1 (MIT). No secret fields pass.
export function publicProviderProps(env:AuthEnvironment):PublicProviderProps{
 const publishableKey=env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY||'',domain=env.NEXT_PUBLIC_CLERK_DOMAIN||'';
 let proxyUrl=env.NEXT_PUBLIC_CLERK_PROXY_URL||'';
 let host=env.VERCEL_PROJECT_PRODUCTION_URL||'';try{host=host.startsWith('http://')||host.startsWith('https://')?new URL(host).hostname:host.split('/')[0];}catch{host='';}
 if(!proxyUrl&&!domain&&publishableKey.startsWith('pk_live_')&&!truth(env.CLERK_DISABLE_AUTO_PROXY)&&env.VERCEL_TARGET_ENV==='production'&&host.endsWith('.vercel.app'))proxyUrl='/__clerk';
 return {publishableKey,domain,proxyUrl,isSatellite:truth(env.NEXT_PUBLIC_CLERK_IS_SATELLITE),signInUrl:'/anmelden',signUpUrl:'/registrieren',
  signInForceRedirectUrl:env.NEXT_PUBLIC_CLERK_SIGN_IN_FORCE_REDIRECT_URL||'',signUpForceRedirectUrl:env.NEXT_PUBLIC_CLERK_SIGN_UP_FORCE_REDIRECT_URL||'',
  signInFallbackRedirectUrl:env.NEXT_PUBLIC_CLERK_SIGN_IN_FALLBACK_REDIRECT_URL||'',signUpFallbackRedirectUrl:env.NEXT_PUBLIC_CLERK_SIGN_UP_FALLBACK_REDIRECT_URL||'',
  newSubscriptionRedirectUrl:env.NEXT_PUBLIC_CLERK_CHECKOUT_CONTINUE_URL||'',
  __internal_clerkJSUrl:env.NEXT_PUBLIC_CLERK_JS_URL||undefined,__internal_clerkJSVersion:env.NEXT_PUBLIC_CLERK_JS_VERSION||undefined,
  __internal_clerkUIUrl:env.NEXT_PUBLIC_CLERK_UI_URL||undefined,__internal_clerkUIVersion:env.NEXT_PUBLIC_CLERK_UI_VERSION||undefined,
  prefetchUI:env.NEXT_PUBLIC_CLERK_PREFETCH_UI==='false'?false:undefined,
  telemetry:{disabled:truth(env.NEXT_PUBLIC_CLERK_TELEMETRY_DISABLED),debug:truth(env.NEXT_PUBLIC_CLERK_TELEMETRY_DEBUG)},
  unsafe_disableDevelopmentModeConsoleWarning:truth(env.NEXT_PUBLIC_CLERK_UNSAFE_DISABLE_DEVELOPMENT_MODE_CONSOLE_WARNING)};
}
