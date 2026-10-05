import { readFileSync } from 'node:fs'
import { statfsSync } from 'node:fs'
import os from 'node:os'
import { Pool } from 'pg'

export type Service = {
  name: string
  url: string
  ok: boolean
  status: number | null
  ms: number
}

export type Kennzahl = {
  name: string
  wert: number
  einheit: string | null
  quelle: string
  zeitpunkt: string
}

export type Cockpit = {
  erzeugt: string
  dienste: Service[]
  system: {
    last1: number
    last5: number
    last15: number
    speicherFreiGb: number
    speicherGesamtGb: number
    plattenFreiGb: number
    plattenGesamtGb: number
    hostUptimeStunden: number
    prozessUptimeStunden: number
    cpus: number
  }
  kennzahlen: Kennzahl[]
}

const DIENSTE = [
  { name: 'Enterprise / Gateway', url: 'http://127.0.0.1:3002/api/dsh/jwks' },
  { name: 'DSH Harness', url: 'http://127.0.0.1:3085/' },
  { name: '9Router', url: 'http://127.0.0.1:20128/v1/models' },
]

async function messen(service: (typeof DIENSTE)[number]): Promise<Service> {
  const start = performance.now()
  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), 2500)
  try {
    const res = await fetch(service.url, { signal: controller.signal, cache: 'no-store' })
    // 401 heisst erreichbar und Auth aktiv - fuer die Lage ist das "ok".
    const ok = res.status < 500
    return { ...service, ok, status: res.status, ms: Math.round(performance.now() - start) }
  } catch {
    return { ...service, ok: false, status: null, ms: Math.round(performance.now() - start) }
  } finally {
    clearTimeout(timer)
  }
}

function pgConfig() {
  const path = process.env.MYADMIN_PG_ENV ?? '/etc/myadmin/pg.env'
  let raw: string
  try {
    raw = readFileSync(path, 'utf8')
  } catch {
    return null
  }
  const env = Object.fromEntries(
    raw
      .split('\n')
      .filter((line) => line.includes('='))
      .map((line) => [line.slice(0, line.indexOf('=')), line.slice(line.indexOf('=') + 1)]),
  )
  return {
    host: env.MYADMIN_PG_HOST ?? '127.0.0.1',
    port: Number(env.MYADMIN_PG_PORT ?? 5599),
    database: env.MYADMIN_PG_DB ?? 'myadmin',
    user: 'myadmin_app',
    password: env.MYADMIN_APP_PASSWORD,
  }
}

let pool: Pool | null = null

async function kennzahlen(tenant: string): Promise<Kennzahl[]> {
  const config = pgConfig()
  if (!config) return []
  pool ??= new Pool({ ...config, max: 2, connectionTimeoutMillis: 2000, statement_timeout: 2000 })
  let client
  try {
    client = await pool.connect()
    await client.query('select set_config($1, $2, false)', ['myadmin.tenant', tenant])
    const { rows } = await client.query(
      `select name, wert, einheit, quelle, zeitpunkt
         from myadmin.kennzahl
        order by zeitpunkt desc
        limit 20`,
    )
    return rows.map((r) => ({
      name: r.name,
      wert: Number(r.wert),
      einheit: r.einheit,
      quelle: r.quelle,
      zeitpunkt: new Date(r.zeitpunkt).toISOString(),
    }))
  } catch {
    return []
  } finally {
    client?.release()
  }
}

export async function cockpit(tenant = 'nexify'): Promise<Cockpit> {
  const [dienste, kz] = await Promise.all([Promise.all(DIENSTE.map(messen)), kennzahlen(tenant)])
  const fs = statfsSync('/')
  const gb = (bytes: number) => Math.round((bytes / 1024 ** 3) * 10) / 10
  const [last1, last5, last15] = os.loadavg()
  return {
    erzeugt: new Date().toISOString(),
    dienste,
    system: {
      last1,
      last5,
      last15,
      speicherFreiGb: gb(os.freemem()),
      speicherGesamtGb: gb(os.totalmem()),
      plattenFreiGb: gb(fs.bavail * fs.bsize),
      plattenGesamtGb: gb(fs.blocks * fs.bsize),
      hostUptimeStunden: Math.round(os.uptime() / 3600),
      prozessUptimeStunden: Math.round(process.uptime() / 3600),
      cpus: os.cpus().length,
    },
    kennzahlen: kz,
  }
}
