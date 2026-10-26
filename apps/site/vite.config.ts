import {defineConfig} from "vite";
import react from "@vitejs/plugin-react";
export default defineConfig({
  optimizeDeps:{entries:["index.html"]},
  plugins:[react()], publicDir:"../web/public", resolve:{dedupe:["react","react-dom"]},
  server:{host:"127.0.0.1",port:3004,strictPort:true,proxy:{"/api":{target:"http://127.0.0.1:3003",changeOrigin:true}}},
  preview:{host:"127.0.0.1",port:3004,strictPort:true,proxy:{"/api":{target:"http://127.0.0.1:3003",changeOrigin:true}}},
  build:{sourcemap:false}
});
