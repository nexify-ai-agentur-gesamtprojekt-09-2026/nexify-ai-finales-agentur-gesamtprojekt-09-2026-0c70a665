#!/usr/bin/env node
// Erzeugt CSS-Variablen und ein flaches JSON aus config/design-tokens.json.
// Einzige Token-Quelle bleibt die JSON-Datei; hier wird nur abgeleitet.
import { readFileSync, writeFileSync, mkdirSync, existsSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const here = dirname(fileURLToPath(import.meta.url))
const root = resolve(here, '../../..')
const source = resolve(root, 'config/design-tokens.json')
const outDir = resolve(here, '../dist')

const kebab = (s) => s.replace(/([a-z0-9])([A-Z])/g, '$1-$2').toLowerCase()

// `type` beschreibt Groessen als Prosa und `motion.regel` ist eine Regel,
// kein CSS-Wert - beide sind absichtlich keine Variablen.
const skip = (path) => path[0] === 'type' || path.join('.') === 'motion.regel'

const flat = {}
const walk = (node, path) => {
  for (const [key, value] of Object.entries(node)) {
    if (key.startsWith('$')) continue
    const next = [...path, key]
    if (skip(next)) continue
    if (value && typeof value === 'object' && '$value' in value) {
      flat[next.join('.')] = value.$value
    } else if (value && typeof value === 'object') {
      walk(value, next)
    } else if (typeof value === 'string' || typeof value === 'number') {
      flat[next.join('.')] = value
    }
  }
}

walk(JSON.parse(readFileSync(source, 'utf8')), [])

const css = [
  '/* generiert aus config/design-tokens.json - nicht von Hand editieren */',
  ':root {',
  ...Object.entries(flat).map(([name, value]) => `  --nx-${name.split('.').map(kebab).join('-')}: ${value};`),
  '}',
  '',
].join('\n')

mkdirSync(outDir, { recursive: true })
writeFileSync(resolve(outDir, 'tokens.css'), css)
writeFileSync(resolve(outDir, 'tokens.json'), JSON.stringify(flat, null, 2) + '\n')

// Next.js darf nur innerhalb seines Projektordners importieren, daher liegt
// im App-Ordner eine erzeugte Kopie derselben Quelle.
const appDir = resolve(root, 'apps/web/app')
if (existsSync(appDir)) writeFileSync(resolve(appDir, 'tokens.generated.css'), css)

console.log(`tokens: ${Object.keys(flat).length} Variablen -> packages/tokens/dist`)
