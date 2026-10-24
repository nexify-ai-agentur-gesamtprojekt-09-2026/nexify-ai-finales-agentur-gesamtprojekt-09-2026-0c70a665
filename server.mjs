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
}

function safePath(urlPath) {
  const decoded = decodeURIComponent(urlPath.split("?")[0])
  const relative = routes.get(decoded) || decoded.replace(/^\//, "")
  const absolute = path.resolve(root, relative)
  return absolute.startsWith(root + path.sep) || absolute === root ? absolute : null
}

const server = createServer(async (request, response) => {
  try {
    const filePath = safePath(request.url || "/")
    if (!filePath) {
      response.writeHead(403)
      response.end("Forbidden")
      return
    }
    const fileStats = await stat(filePath)
    if (!fileStats.isFile()) throw new Error("Not a file")
    const body = await readFile(filePath)
    response.writeHead(200, {
      "Content-Type": contentTypes[path.extname(filePath)] || "application/octet-stream",
      "Cache-Control": "no-cache",
      "X-Content-Type-Options": "nosniff",
      "Referrer-Policy": "strict-origin-when-cross-origin",
      "Permissions-Policy": "camera=(), microphone=(), geolocation=(), payment=()",
    })
    response.end(body)
  } catch {
    response.writeHead(404, { "Content-Type": "text/plain; charset=utf-8" })
    response.end("Not found")
  }
})

server.listen(port, "0.0.0.0", () => {
  console.log(`[preview] Static server listening on http://localhost:${port}`)
})
