/** One shared, consent-gated exception sink. Sentry remains server-side only. */
import {browserExceptions,captureBoundaryException} from '../../web/observability/exceptions.mjs';
export function startSiteObservability(){return browserExceptions()?.start({
 token:import.meta.env.VITE_POSTHOG_PROJECT_TOKEN||import.meta.env.VITE_POSTHOG_KEY||'',
 host:import.meta.env.VITE_POSTHOG_HOST||'https://eu.i.posthog.com',
 release:import.meta.env.VITE_RELEASE_SHA||'',environment:import.meta.env.VITE_APP_ENV||'',surface:'vite'
});}
export const captureClientError=captureBoundaryException;
