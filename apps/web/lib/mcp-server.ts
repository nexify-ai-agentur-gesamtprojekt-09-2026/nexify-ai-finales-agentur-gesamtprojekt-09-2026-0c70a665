// NeXify AI FACTORY MCP-Server (Entwurf, Schalter standardmaessig AUS).
// Zustandsloser Streamable-HTTP-Endpunkt (MCP 2026-07-28, mit Rueckwaertskompatibilitaet zu
// initialize-basierten Clients 2025-03-26 bis 2025-11-25, ohne Mcp-Session-Id).
// Nur LESENDE Werkzeuge ueber die bereits oeffentliche Shop-/Werkstatt-API (GET).
// Zugang: Schalter NEXIFY_MCP + Kopf-Schluessel MCP_ACCESS_TOKEN. Kein selbstgebautes OAuth.
// Keine Geheimnisse im Code; Secrets nur aus der Umgebung, nie in Logs oder Antworten.

export const MCP_SERVER_NAME = "nexify-mcp";
export const MCP_SERVER_VERSION = "0.1.0";
export const MCP_MODERN_VERSION = "2026-07-28";
export const MCP_SUPPORTED_VERSIONS = ["2026-07-28", "2025-11-25", "2025-06-18", "2025-03-26"];
const LEGACY_DEFAULT_VERSION = "2025-11-25";
export const MAX_BODY_BYTES = 32 * 1024;
export const MAX_UPSTREAM_BYTES = 512 * 1024;
export const MAX_RESULT_CHARS = 24000;
export const RATE_LIMIT_PER_MINUTE = 60;
const MIN_TOKEN_LENGTH = 24;
const UPSTREAM_TIMEOUT_MS = 8000;

type Env = Record<string, string | undefined>;
type Json = null | boolean | number | string | Json[] | { [key: string]: Json };
type Id = string | number | null;
type FetchLike = (input: string, init?: RequestInit) => Promise<Response>;
export type McpDeps = { env?: Env; fetch?: FetchLike; now?: () => number };

const HEADERS_BASE = {
  "Cache-Control": "no-store",
  "X-Content-Type-Options": "nosniff",
  "Content-Type": "application/json; charset=utf-8",
};

function reply(status: number, body: unknown, extra: Record<string, string> = {}): Response {
  return new Response(body === undefined ? null : JSON.stringify(body), { status, headers: { ...HEADERS_BASE, ...extra } });
}
const rpcError = (id: Id, code: number, message: string, data?: Json) => ({ jsonrpc: "2.0", id, error: data === undefined ? { code, message } : { code, message, data } });
const rpcResult = (id: Id, result: unknown) => ({ jsonrpc: "2.0", id, result });

export function mcpEnabled(env: Env): boolean {
  const value = (env.NEXIFY_MCP || "").trim().toLowerCase();
  return value === "1" || value === "true";
}

// Konstante Vergleichszeit ueber SHA-256-Digests (Web Crypto, laeuft in Node und Workers).
async function digest(value: string): Promise<Uint8Array> {
  return new Uint8Array(await crypto.subtle.digest("SHA-256", new TextEncoder().encode(value)));
}
async function tokenMatches(given: string, expected: string): Promise<boolean> {
  const [a, b] = await Promise.all([digest(given), digest(expected)]);
  let diff = a.length ^ b.length;
  for (let i = 0; i < a.length; i += 1) diff |= a[i] ^ b[i];
  return diff === 0;
}
function presentedToken(request: Request): string {
  const authorization = request.headers.get("authorization") || "";
  const match = /^Bearer\s+(\S{1,512})$/i.exec(authorization.trim());
  if (match) return match[1];
  return (request.headers.get("x-nexify-mcp-key") || "").trim().slice(0, 512);
}

// Einfache Ratenbegrenzung je Instanz (Best Effort; verteilte Begrenzung gehoert an die Kante).
const windows = new Map<string, number[]>();
export function resetRateLimit(): void { windows.clear(); }
function rateLimited(now: number): boolean {
  const recent = (windows.get("global") || []).filter(t => now - t < 60000);
  if (recent.length >= RATE_LIMIT_PER_MINUTE) { windows.set("global", recent); return true; }
  recent.push(now);
  windows.set("global", recent);
  return false;
}

// ---------- Werkzeuge ----------
type Validated<T> = { ok: true; value: T } | { ok: false; message: string };
type Tool = {
  name: string;
  title: string;
  description: string;
  inputSchema: Json;
  run: (args: Record<string, unknown>, ctx: { base: string; fetch: FetchLike }) => Promise<Json>;
  parse: (args: Record<string, unknown>) => Validated<Record<string, unknown>>;
};

const CONTROL = /[\u0000-\u001f\u007f]/;
function onlyKeys(args: Record<string, unknown>, allowed: string[]): string | null {
  for (const key of Object.keys(args)) if (!allowed.includes(key)) return "Unbekanntes Argument: " + key.slice(0, 40);
  return null;
}
function text(value: unknown, field: string, min: number, max: number): Validated<string> {
  if (typeof value !== "string") return { ok: false, message: field + " muss Text sein" };
  const trimmed = value.trim();
  if (CONTROL.test(trimmed)) return { ok: false, message: field + " enthaelt Steuerzeichen" };
  if (trimmed.length < min || trimmed.length > max) return { ok: false, message: field + " muss " + min + " bis " + max + " Zeichen lang sein" };
  return { ok: true, value: trimmed };
}
function integer(value: unknown, field: string, min: number, max: number): Validated<number> {
  if (typeof value !== "number" || !Number.isSafeInteger(value) || value < min || value > max) return { ok: false, message: field + " muss eine ganze Zahl von " + min + " bis " + max + " sein" };
  return { ok: true, value };
}

function clip(value: unknown, max: number): string | null {
  return typeof value === "string" ? value.replace(CONTROL, " ").slice(0, max) : null;
}
function num(value: unknown): number | null { return typeof value === "number" && Number.isFinite(value) ? value : null; }

async function upstream(ctx: { base: string; fetch: FetchLike }, path: string, params: URLSearchParams): Promise<unknown> {
  const query = params.toString();
  const response = await ctx.fetch(ctx.base + path + (query ? "?" + query : ""), {
    method: "GET",
    headers: { Accept: "application/json" },
    redirect: "manual",
    cache: "no-store",
    signal: AbortSignal.timeout(UPSTREAM_TIMEOUT_MS),
  });
  if (!response.ok) throw new Error("upstream_status");
  if (!/^application\/(?:[\w.-]+\+)?json(?:\s*;|$)/i.test(response.headers.get("content-type") || "")) throw new Error("upstream_format");
  const declared = Number(response.headers.get("content-length") || 0);
  if (declared > MAX_UPSTREAM_BYTES) throw new Error("upstream_size");
  const raw = await response.text();
  if (raw.length > MAX_UPSTREAM_BYTES) throw new Error("upstream_size");
  try { return JSON.parse(raw); } catch { throw new Error("upstream_format"); }
}
const record = (value: unknown): Record<string, unknown> => (value && typeof value === "object" && !Array.isArray(value) ? (value as Record<string, unknown>) : {});

const TOOLS: Tool[] = [
  {
    name: "nexify_katalog_suche",
    title: "Katalogsuche",
    description: "Sucht im oeffentlichen TEILEKLAR-Katalog nach Produkten (nur lesend). Preise erscheinen nur, wenn sie freigegeben sind.",
    inputSchema: {
      type: "object", additionalProperties: false,
      properties: {
        q: { type: "string", maxLength: 120, description: "Suchbegriff (optional)" },
        kategorie: { type: "integer", minimum: 1, description: "Kategorie-ID (optional)" },
        nur_verfuegbar: { type: "boolean", description: "Nur lieferbare Artikel (Standard false)" },
        nur_mit_freigegebenem_preis: { type: "boolean", description: "Nur Artikel mit freigegebenem Preis (Standard false)" },
        seite: { type: "integer", minimum: 1, maximum: 50, description: "Seite (Standard 1)" },
        seitengroesse: { type: "integer", minimum: 1, maximum: 20, description: "Treffer je Seite (Standard 10)" },
      },
    },
    parse(args) {
      const bad = onlyKeys(args, ["q", "kategorie", "nur_verfuegbar", "nur_mit_freigegebenem_preis", "seite", "seitengroesse"]);
      if (bad) return { ok: false, message: bad };
      const out: Record<string, unknown> = { q: "", nur_verfuegbar: false, nur_mit_freigegebenem_preis: false, seite: 1, seitengroesse: 10 };
      if (args.q !== undefined) { const r = text(args.q, "q", 0, 120); if (!r.ok) return r; out.q = r.value; }
      if (args.kategorie !== undefined) { const r = integer(args.kategorie, "kategorie", 1, 1000000000); if (!r.ok) return r; out.kategorie = r.value; }
      for (const flag of ["nur_verfuegbar", "nur_mit_freigegebenem_preis"]) {
        if (args[flag] !== undefined) { if (typeof args[flag] !== "boolean") return { ok: false, message: flag + " muss true oder false sein" }; out[flag] = args[flag]; }
      }
      if (args.seite !== undefined) { const r = integer(args.seite, "seite", 1, 50); if (!r.ok) return r; out.seite = r.value; }
      if (args.seitengroesse !== undefined) { const r = integer(args.seitengroesse, "seitengroesse", 1, 20); if (!r.ok) return r; out.seitengroesse = r.value; }
      return { ok: true, value: out };
    },
    async run(args, ctx) {
      const params = new URLSearchParams({ q: String(args.q), page: String(args.seite), page_size: String(args.seitengroesse), in_stock: String(args.nur_verfuegbar) });
      if (args.kategorie !== undefined) params.set("category", String(args.kategorie));
      const data = record(await upstream(ctx, "/api/shop/products", params));
      if (!Array.isArray(data.items)) throw new Error("upstream_format");
      let items = data.items.slice(0, Number(args.seitengroesse)).map(record).map(item => {
        const released = item.price_status === "released" && num(item.price_cents) !== null;
        return {
          id: clip(item.id, 80), name: clip(item.name, 200), sku: clip(item.sku, 80), ean: clip(item.ean, 20),
          preis_cent: released ? num(item.price_cents) : null, preis_freigegeben: released, waehrung: clip(item.currency, 3),
          verfuegbar: typeof item.in_stock === "boolean" ? item.in_stock : null, bestand_status: clip(item.stock_status, 20),
          kategorie_id: num(item.category_id),
        };
      });
      if (args.nur_mit_freigegebenem_preis === true) items = items.filter(item => item.preis_freigegeben);
      return { gesamt: num(data.total), seite: num(data.page), seiten: num(data.pages), treffer: items };
    },
  },
  {
    name: "nexify_werkstatt_suche",
    title: "Werkstattsuche",
    description: "Sucht Werkstaetten im oeffentlichen Werkstattverzeichnis nach PLZ oder Ort (nur lesend).",
    inputSchema: {
      type: "object", additionalProperties: false, required: ["q"],
      properties: {
        q: { type: "string", minLength: 2, maxLength: 80, description: "PLZ oder Ort" },
        umkreis_km: { type: "integer", enum: [10, 25, 50, 100], description: "Umkreis in km (Standard 25)" },
      },
    },
    parse(args) {
      const bad = onlyKeys(args, ["q", "umkreis_km"]);
      if (bad) return { ok: false, message: bad };
      const q = text(args.q, "q", 2, 80);
      if (!q.ok) return q;
      let radius = 25;
      if (args.umkreis_km !== undefined) {
        if (![10, 25, 50, 100].includes(args.umkreis_km as number)) return { ok: false, message: "umkreis_km muss 10, 25, 50 oder 100 sein" };
        radius = args.umkreis_km as number;
      }
      return { ok: true, value: { q: q.value, umkreis_km: radius } };
    },
    async run(args, ctx) {
      const data = record(await upstream(ctx, "/api/workshops/search", new URLSearchParams({ q: String(args.q), radius: String(args.umkreis_km) })));
      if (!Array.isArray(data.results)) throw new Error("upstream_format");
      const shape = (value: unknown) => {
        const w = record(value);
        return { id: clip(w.id, 80), name: clip(w.name, 200), art: clip(w.kind_label, 80), strasse: clip(w.street, 120), plz: clip(w.zip, 12), ort: clip(w.city, 80),
          region: clip(w.region, 80), telefon: clip(w.tel, 40), web: clip(w.web, 200), zeiten: clip(w.hours, 200), entfernung_km: num(w.distance_km) };
      };
      return { gesamt: num(data.total), umkreis_km: Number(args.umkreis_km), treffer: data.results.slice(0, 20).map(shape), ohne_ortung: Array.isArray(data.unlocated) ? data.unlocated.length : 0 };
    },
  },
  {
    name: "nexify_status",
    title: "Shop-Status",
    description: "Liefert den oeffentlichen Katalogstatus des Shops (Produktanzahl, letzter Import, Teilbestand). Nur lesend.",
    inputSchema: { type: "object", additionalProperties: false, properties: {} },
    parse(args) { const bad = onlyKeys(args, []); return bad ? { ok: false, message: bad } : { ok: true, value: {} }; },
    async run(_args, ctx) {
      const data = record(await upstream(ctx, "/api/shop/status", new URLSearchParams()));
      return { produkte: num(data.products), letzter_import: clip(data.last_import_at, 40), teilbestand: typeof data.partial === "boolean" ? data.partial : null };
    },
  },
];
export const MCP_TOOL_NAMES = TOOLS.map(tool => tool.name);

const toolDescriptor = (tool: Tool) => ({
  name: tool.name, title: tool.title, description: tool.description, inputSchema: tool.inputSchema,
  annotations: { readOnlyHint: true, destructiveHint: false, idempotentHint: true, openWorldHint: true },
});

function shopBase(env: Env): string | null {
  const raw = (env.SHOP_API_BASE_URL || "").trim();
  if (!raw) return null;
  try {
    const url = new URL(raw);
    const loopback = ["127.0.0.1", "localhost", "[::1]"].includes(url.hostname);
    if (url.username || url.password || url.search || url.hash) return null;
    if (url.protocol !== "https:" && !(url.protocol === "http:" && loopback)) return null;
    return url.origin + url.pathname.replace(/\/$/, "");
  } catch { return null; }
}

function toolResult(payload: Json, isError = false) {
  let rendered = JSON.stringify(payload);
  let truncated = false;
  if (rendered.length > MAX_RESULT_CHARS) { rendered = rendered.slice(0, MAX_RESULT_CHARS); truncated = true; }
  const result: Record<string, unknown> = { content: [{ type: "text", text: rendered }], isError };
  if (!truncated) result.structuredContent = payload;
  return result;
}

function decodeName(value: string): string | null {
  const m = /^=\?base64\?([A-Za-z0-9+/=]*)\?=$/.exec(value);
  if (!m) return value;
  try { const bin = atob(m[1]); return new TextDecoder("utf-8", { fatal: true }).decode(Uint8Array.from(bin, c => c.charCodeAt(0))); } catch { return null; }
}

// ---------- Endpunkt ----------
export async function handleMcpRequest(request: Request, deps: McpDeps = {}): Promise<Response> {
  const env = deps.env || (process.env as Env);
  const now = (deps.now || Date.now)();
  const fetchImpl: FetchLike = deps.fetch || ((input, init) => fetch(input, init));

  if (!mcpEnabled(env)) return reply(503, { error: "mcp_disabled" });
  const expected = (env.MCP_ACCESS_TOKEN || "").trim();
  if (expected.length < MIN_TOKEN_LENGTH) return reply(503, { error: "mcp_not_configured" });
  if (request.method !== "POST") return reply(405, { error: "method_not_allowed" }, { Allow: "POST" });

  // Browser-Ursprung ist hier nie vorgesehen (DNS-Rebinding-Schutz): nur ausdruecklich erlaubte Origins.
  const origin = request.headers.get("origin");
  if (origin !== null) {
    const allowed = (env.MCP_ALLOWED_ORIGINS || "").split(",").map(v => v.trim()).filter(Boolean);
    if (!allowed.includes(origin)) return reply(403, rpcError(null, -32600, "Origin nicht erlaubt"));
  }
  const given = presentedToken(request);
  if (!given || !(await tokenMatches(given, expected))) return reply(401, { error: "unauthorized" }, { "WWW-Authenticate": 'Bearer realm="nexify-mcp"' });
  if (rateLimited(now)) return reply(429, rpcError(null, -32000, "Zu viele Anfragen"), { "Retry-After": "60" });

  const type = (request.headers.get("content-type") || "").toLowerCase();
  if (!type.startsWith("application/json")) return reply(415, rpcError(null, -32600, "Content-Type application/json erforderlich"));
  if (Number(request.headers.get("content-length") || 0) > MAX_BODY_BYTES) return reply(413, rpcError(null, -32600, "Anfrage zu gross"));
  const raw = await request.text();
  if (raw.length > MAX_BODY_BYTES) return reply(413, rpcError(null, -32600, "Anfrage zu gross"));
  let body: unknown;
  try { body = JSON.parse(raw); } catch { return reply(400, rpcError(null, -32700, "Ungueltiges JSON")); }
  if (!body || typeof body !== "object" || Array.isArray(body)) return reply(400, rpcError(null, -32600, "Einzelne JSON-RPC-Nachricht erforderlich"));
  const message = body as Record<string, unknown>;
  const hasId = Object.prototype.hasOwnProperty.call(message, "id");
  const id = message.id;
  if (hasId && !(typeof id === "string" || (typeof id === "number" && Number.isFinite(id)))) return reply(400, rpcError(null, -32600, "Ungueltige id"));
  if (message.jsonrpc !== "2.0" || typeof message.method !== "string" || message.method.length > 100) return reply(400, rpcError(hasId ? (id as Id) : null, -32600, "Ungueltige JSON-RPC-Anfrage"));
  const method = message.method;
  const paramsRaw = message.params;
  if (paramsRaw !== undefined && (!paramsRaw || typeof paramsRaw !== "object" || Array.isArray(paramsRaw))) return reply(400, rpcError(hasId ? (id as Id) : null, -32602, "params muss ein Objekt sein"));
  const params = (paramsRaw || {}) as Record<string, unknown>;

  // Protokollversion (Kopf). Fehlt sie, gilt die aelteste Fassung (2025-03-26).
  const headerVersion = request.headers.get("mcp-protocol-version");
  const version = headerVersion === null ? "2025-03-26" : headerVersion.trim();
  if (!MCP_SUPPORTED_VERSIONS.includes(version)) {
    return reply(400, rpcError(hasId ? (id as Id) : null, -32022, "Unsupported protocol version", { supported: MCP_SUPPORTED_VERSIONS, requested: version.slice(0, 40) }));
  }
  const modern = version === MCP_MODERN_VERSION;
  if (modern) {
    const meta = record(params._meta);
    const metaVersion = meta["io.modelcontextprotocol/protocolVersion"];
    const methodHeader = request.headers.get("mcp-method");
    let mismatch = methodHeader !== method || (metaVersion !== undefined && metaVersion !== version);
    if (method === "tools/call" && !mismatch) {
      const nameHeader = request.headers.get("mcp-name");
      mismatch = nameHeader === null || decodeName(nameHeader) !== params.name;
    }
    if (mismatch) return reply(400, rpcError(hasId ? (id as Id) : null, -32020, "Header mismatch"));
  }

  if (!hasId) return new Response(null, { status: 202, headers: { "Cache-Control": "no-store" } });
  const rid = id as Id;
  const ok = (result: unknown) => reply(200, rpcResult(rid, result));
  const fail = (code: number, text: string) => reply(200, rpcError(rid, code, text));

  switch (method) {
    case "initialize": {
      const asked = typeof params.protocolVersion === "string" ? params.protocolVersion : "";
      const negotiated = MCP_SUPPORTED_VERSIONS.includes(asked) && asked !== MCP_MODERN_VERSION ? asked : LEGACY_DEFAULT_VERSION;
      return ok({ protocolVersion: negotiated, capabilities: { tools: { listChanged: false } }, serverInfo: { name: MCP_SERVER_NAME, version: MCP_SERVER_VERSION },
        instructions: "Nur lesende Werkzeuge ueber die oeffentliche Shop- und Werkstatt-API der NeXify AI FACTORY." });
    }
    case "ping": return ok({});
    case "server/discover":
      return ok({ resultType: "complete", supportedVersions: MCP_SUPPORTED_VERSIONS, capabilities: { tools: { listChanged: false } },
        _meta: { "io.modelcontextprotocol/serverInfo": { name: MCP_SERVER_NAME, version: MCP_SERVER_VERSION } },
        instructions: "Nur lesende Werkzeuge ueber die oeffentliche Shop- und Werkstatt-API der NeXify AI FACTORY.", ttlMs: 60000, cacheScope: "public" });
    case "tools/list": return ok({ tools: TOOLS.map(toolDescriptor) });
    case "tools/call": {
      const tool = TOOLS.find(t => t.name === params.name);
      if (!tool) return fail(-32602, "Unbekanntes Werkzeug");
      const rawArgs = params.arguments === undefined ? {} : params.arguments;
      if (!rawArgs || typeof rawArgs !== "object" || Array.isArray(rawArgs)) return fail(-32602, "arguments muss ein Objekt sein");
      const parsed = tool.parse(rawArgs as Record<string, unknown>);
      if (!parsed.ok) return fail(-32602, parsed.message);
      const base = shopBase(env);
      if (!base) return ok(toolResult({ fehler: "upstream_not_configured", hinweis: "Die Shop-API ist nicht konfiguriert." }, true));
      try {
        return ok(toolResult(await tool.run(parsed.value, { base, fetch: fetchImpl })));
      } catch {
        // Keine internen Fehlertexte weitergeben.
        return ok(toolResult({ fehler: "upstream_unavailable", hinweis: "Die Shop-API ist derzeit nicht erreichbar oder lieferte keine gueltige Antwort." }, true));
      }
    }
    default:
      return reply(modern ? 404 : 200, rpcError(rid, -32601, "Methode nicht gefunden"));
  }
}

// ---------- Discovery ----------
export function protectedResourceDocument(origin: string): Record<string, unknown> {
  return {
    resource: origin + "/mcp",
    bearer_methods_supported: ["header"],
    resource_name: "NeXify AI FACTORY MCP (nur lesend)",
    // Bewusst KEIN authorization_servers: es gibt keinen OAuth-Autorisierungsserver.
    nexify_auth: { verfahren: "schalter-und-kopf-schluessel", oauth: false, kopf: "Authorization: Bearer <MCP_ACCESS_TOKEN> oder X-Nexify-MCP-Key" },
  };
}
export function discoveryOrigin(request: Request, env: Env): string {
  const configured = (env.MCP_PUBLIC_ORIGIN || "").trim();
  try { if (configured) { const u = new URL(configured); if (u.protocol === "https:") return u.origin; } } catch { /* fallthrough */ }
  return "https://mcp.nexifyai.cloud";
}
