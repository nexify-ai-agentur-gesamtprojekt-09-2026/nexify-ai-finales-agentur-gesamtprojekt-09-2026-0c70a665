import { defineCloudflareConfig } from "@opennextjs/cloudflare";

// Cloudflare Workers adapter for apps/web. No incremental cache configured:
// the app renders dynamically behind proxy.ts, so there is nothing to revalidate.
export default defineCloudflareConfig({});
