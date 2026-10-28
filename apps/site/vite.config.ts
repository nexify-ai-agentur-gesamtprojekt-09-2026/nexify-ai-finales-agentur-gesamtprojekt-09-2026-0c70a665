import {defineConfig} from "vite";
import react from "@vitejs/plugin-react";
import {publicPwaPlugin} from "./pwa/plugin.mjs";
import {mapPolicy,privateMapPlugin} from "../../tools/observability/private-sourcemaps.mjs";
const maps=mapPolicy(process.env,"vite",process.cwd().endsWith("apps/site")?"../..":process.cwd());
export default defineConfig(({mode})=>({
  optimizeDeps:{entries:["index.html"]},
  plugins:[react(),publicPwaPlugin(mode),privateMapPlugin(maps)], publicDir:"../web/public", resolve:{dedupe:["react","react-dom"]},
  server:{host:"127.0.0.1",port:3004,strictPort:true,proxy:{"/api/agent-runtime-status":{target:"http://127.0.0.1:3005",changeOrigin:true},"/api/agent-chat":{target:"http://127.0.0.1:3005",changeOrigin:true},"/api":{target:"http://127.0.0.1:3003",changeOrigin:true}}},
  preview:{host:"127.0.0.1",port:3004,strictPort:true,proxy:{"/api/agent-runtime-status":{target:"http://127.0.0.1:3005",changeOrigin:true},"/api/agent-chat":{target:"http://127.0.0.1:3005",changeOrigin:true},"/api":{target:"http://127.0.0.1:3003",changeOrigin:true}}},
  define:{"import.meta.env.VITE_RELEASE_SHA":JSON.stringify(maps.release),"import.meta.env.VITE_APP_ENV":JSON.stringify(process.env.VERCEL_ENV||process.env.NEXIFY_APP_ENV||"")},
  build:{sourcemap:maps.enabled?"hidden":false,...(mode==="standalone"?{rolldownOptions:{output:{codeSplitting:false}}}:{})}
}));
