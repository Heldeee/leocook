import fs from 'node:fs'
import path from 'node:path'
import zlib from 'node:zlib'
import { fileURLToPath } from 'node:url'

// Read only the recipe catalogue. Auth, users and storage metadata stay private.
export function parseBackup(sql) {
  const tables = {}
  const names = ['recipes', 'ingredients', 'units', 'tags', 'recipe_ingredients', 'recipe_steps', 'recipe_tags']
  const numeric = new Set(['servings', 'quantity', 'step_number', 'duration_seconds'])
  for (const name of names) {
    const match = sql.match(new RegExp(`^COPY public\\.${name} \\(([^)]+)\\) FROM stdin;\\r?\\n([\\s\\S]*?)^\\\\\\.\\r?$`, 'm'))
    if (!match) throw new Error(`Missing COPY section: public.${name}`)
    const columns = match[1].split(', ')
    tables[name] = match[2].split(/\r?\n/).filter(Boolean).map(line => {
      const values = line.split('\t')
      if (values.length !== columns.length) throw new Error(`Invalid row in ${name}`)
      return Object.fromEntries(columns.map((column, index) => {
        let value = values[index]
        if (value === '\\N') value = null
        else if (numeric.has(column)) value = Number(value)
        else value = value.replace(/\\([0-7]{1,3}|x[0-9a-fA-F]{1,2}|.)/g, (_, escaped) => {
          if (/^[0-7]+$/.test(escaped)) return String.fromCharCode(parseInt(escaped, 8))
          if (escaped.startsWith('x')) return String.fromCharCode(parseInt(escaped.slice(1), 16))
          return ({ n: '\n', r: '\r', t: '\t', b: '\b', f: '\f', v: '\v', '\\': '\\' })[escaped] ?? escaped
        })
        return [column, value]
      }))
    })
  }
  // These recipes will be a public catalogue; no personal identifiers are shipped.
  tables.recipes = tables.recipes.map(({ id, name, servings, image_url, created_at }) => ({ id, name, servings, image_url, created_at }))
  return { version: 1, ...tables }
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const input = process.argv[2]
  const output = process.argv[3] ?? 'public/data/catalogue.json'
  if (!input) throw new Error('Usage: node scripts/import-backup.mjs backup/file.backup.gz [output.json]')
  if (fs.existsSync(output)) throw new Error(`${output} exists. Choose a new output path to preserve the current catalogue.`)
  const buffer = fs.readFileSync(input)
  const catalogue = parseBackup((input.endsWith('.gz') ? zlib.gunzipSync(buffer) : buffer).toString('utf8'))
  fs.mkdirSync(path.dirname(output), { recursive: true })
  fs.writeFileSync(output, JSON.stringify(catalogue, null, 2) + '\n')
  console.log(JSON.stringify(Object.fromEntries(Object.entries(catalogue).filter(([, rows]) => Array.isArray(rows)).map(([name, rows]) => [name, rows.length]))))
  console.log(`External recipe images: ${catalogue.recipes.filter(recipe => recipe.image_url?.startsWith('http')).length}. Database backups do not include image binaries.`)
}
