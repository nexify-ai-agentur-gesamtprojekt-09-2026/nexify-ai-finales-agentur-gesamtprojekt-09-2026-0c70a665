import { createServer } from "node:http"
import { readFile, stat } from "node:fs/promises"
import path from "node:path"
import { fileURLToPath } from "node:url"

const root = path.dirname(fileURLToPath(import.meta.url))
const port = Number(process.env.PORT || 3000)

const routes = new Map([
  ["/", "apps-index.html"],
  ["/index.html", "apps-index.html"],
  ["/tokens.css", "packages/tokens/tokens.css"],
  ["/prototypen", "prototypen/index.html"],
  ["/prototypen/", "prototypen/index.html"],
])

const contentTypes = {
  ".html": "text/html; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".svg": "image/svg+xml",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".webp": "image/webp",
  ".webmanifest": "application/manifest+json; charset=utf-8",
  ".xml": "application/xml; charset=utf-8",
  ".woff2": "font/woff2",
}

function safePath(urlPath) {
  const decoded = decodeURIComponent(urlPath.split("?")[0])
  const relative = routes.get(decoded) || decoded.replace(/^\//, "")
  const absolute = path.resolve(root, relative)
  return absolute.startsWith(root + path.sep) || absolute === root ? absolute : null
}

const server = createServer(async (request, response) => {
  try {
    if (!['GET', 'HEAD'].includes(request.method || 'GET')) {
      response.writeHead(405, { Allow: 'GET, HEAD' })
      response.end('Method not allowed')
      return
    }
    const filePath = safePath(request.url || "/")
    if (!filePath) {
      response.writeHead(403)
      response.end("Forbidden")
      return
    }
    const fileStats = await stat(filePath)
    if (!fileStats.isFile()) throw new Error("Not a file")
    const body = await readFile(filePath)
    const headers = {
      "Content-Type": contentTypes[path.extname(filePath)] || "application/octet-stream",
      "Cache-Control": "no-cache",
      "X-Content-Type-Options": "nosniff",
      "Referrer-Policy": "strict-origin-when-cross-origin",
      "Permissions-Policy": "camera=(), microphone=(), geolocation=(), payment=()",
      "Content-Security-Policy-Report-Only": "default-src 'self'; img-src 'self' data:; font-src 'self'; style-src 'self' 'unsafe-inline'; script-src 'self' 'unsafe-inline'; connect-src 'self'; object-src 'none'; base-uri 'self'; form-action 'self'",
    }
    if (process.env.NODE_ENV === 'production') headers['Strict-Transport-Security'] = 'max-age=63072000'
    response.writeHead(200, headers)
    if (request.method !== 'HEAD') response.end(body)
    else response.end()
  } catch {
    response.writeHead(404, { "Content-Type": "text/plain; charset=utf-8" })
    response.end("Not found")
  }
})

server.listen(port, "0.0.0.0", () => {
  console.log(`[preview] Static server listening on http://localhost:${port}`)
})
