import {browserExceptions} from './observability/exceptions.mjs';
void browserExceptions()?.start({token:process.env.NEXT_PUBLIC_POSTHOG_PROJECT_TOKEN||process.env.NEXT_PUBLIC_POSTHOG_KEY||'',host:process.env.NEXT_PUBLIC_POSTHOG_HOST||'https://eu.i.posthog.com',release:process.env.NEXT_PUBLIC_RELEASE_SHA||'',environment:process.env.NEXT_PUBLIC_APP_ENV||'',surface:'next'});
