import { createServer } from "node:http"
import { readFile, realpath, stat } from "node:fs/promises"
import path from "node:path"
import { fileURLToPath } from "node:url"

const root = path.dirname(fileURLToPath(import.meta.url))
const realRoot = await realpath(root)
const port = Number(process.env.PORT || 3000)
const host = process.env.HOST || "127.0.0.1"

const routes = new Map([
  ["/", "apps-index.html"],
  ["/index.html", "apps-index.html"],
  ["/tokens.css", "packages/tokens/tokens.css"],
  ["/prototypen/", "preview-prototypes.html"],
  ["/prototypen/index.html", "preview-prototypes.html"],
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
  ".txt": "text/plain; charset=utf-8",
}

const publicFiles = new Set([
  "apps-index.html",
  "preview-prototypes.html",
  "packages/tokens/tokens.css",
  "packages/ui/index.html",
  "packages/ui/components.css",
])

function publicPath(relative) {
  const segments = relative.split(path.sep)
  if (segments.some(segment => segment.startsWith("."))) return false
  return publicFiles.has(relative) || (
    segments[0] === "prototypen" &&
    Object.hasOwn(contentTypes, path.extname(relative).toLowerCase())
  )
}

async function safePath(decoded) {
  if (!decoded.startsWith("/") || decoded.includes("\\") || decoded.includes("\0")) return null
  if (decoded.split("/").some(segment => segment.startsWith("."))) return null
  const relative = routes.get(decoded) || decoded.slice(1)
  if (!publicPath(relative)) return null
  const actual = await realpath(path.resolve(root, relative))
  const actualRelative = path.relative(realRoot, actual)
  // Check the resolved target too: a link inside a public tree must not expose
  // private repository files or files outside this checkout.
  if (path.isAbsolute(actualRelative) || !publicPath(actualRelative)) return null
  return actual
}

const server = createServer(async (request, response) => {
  try {
    if (!['GET', 'HEAD'].includes(request.method || 'GET')) {
      response.writeHead(405, { Allow: 'GET, HEAD' })
      response.end('Method not allowed')
      return
    }
    const requestTarget = request.url || "/"
    const decoded = decodeURIComponent(requestTarget.split("?")[0])
    if (decoded === "/prototypen") {
      const queryAt = requestTarget.indexOf("?")
      response.writeHead(308, { Location: "/prototypen/" + (queryAt < 0 ? "" : requestTarget.slice(queryAt)) })
      response.end()
      return
    }
    const filePath = await safePath(decoded)
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

server.listen(port, host, () => {
  const address = server.address()
  console.log(`[preview] Static server listening on http://localhost:${address.port} (bound to ${address.address})`)
})
