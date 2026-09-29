import assert from 'node:assert/strict'
import fs from 'node:fs'
import { test, beforeEach } from 'node:test'
import { parseBackup } from '../scripts/import-backup.mjs'
import { recipes as curatedRecipes } from '../scripts/recipes.mjs'
import { CATEGORIES, formatQuantity, recipeMinutes, secondsRemaining, clockLabel } from '../src/lib/recipePresentation.js'

const original = JSON.parse(fs.readFileSync('public/data/catalogue.json', 'utf8'))
const legacy = { ...original, recipes: original.recipes.map(({ id, name, servings, image_url, created_at }) => ({ id, name, servings, image_url, created_at })) }
let stored
let counter = 0
async function service() {
  const source = fs.readFileSync('src/lib/catalogue.js', 'utf8').replaceAll('import.meta.env.BASE_URL', "'/'")
  return import(`data:text/javascript;base64,${Buffer.from(source + `\n// ${counter++}`).toString('base64')}`)
}
beforeEach(() => {
  stored = new Map()
  globalThis.localStorage = { getItem: key => stored.get(key) ?? null, setItem: (key, value) => stored.set(key, value), removeItem: key => stored.delete(key) }
  globalThis.fetch = async () => ({ ok: true, json: async () => structuredClone(original) })
})
const preview = unit => ({ name: 'Crêpes à la vanille', servings: 3, ingredients: [{ ingredientName: 'Farine spéciale', quantity: 125, unitId: unit }], tags: [{ name: 'Dessert maison' }], steps: [{ instruction: 'Mélanger\nPuis cuire.', duration_seconds: 60 }] })

test('backup import preserves catalogue and excludes personal/auth data', () => {
  const copyValue = value => value == null ? '\\N' : String(value).replaceAll('\\', '\\\\').replaceAll('\n', '\\n').replaceAll('\t', '\\t')
  const sql = Object.entries(legacy).filter(([, rows]) => Array.isArray(rows)).map(([table, rows]) => {
    const extra = table === 'recipes' ? { author_id: 'private-author', family_id: 'private-family', private: 't' } : {}
    const columns = Object.keys({ ...rows[0], ...extra })
    return `COPY public.${table} (${columns.join(', ')}) FROM stdin;\n${rows.map(row => columns.map(column => copyValue(({ ...row, ...extra })[column])).join('\t')).join('\n')}\n\\.\n`
  }).join('\n') + '\nCOPY auth.users (email, encrypted_password) FROM stdin;\nprivate@example.invalid\tsecret-hash\n\\.\n'
  assert.deepEqual(parseBackup(sql), legacy)
  assert.ok(!/author_id|family_id|encrypted_password|email|auth\./.test(JSON.stringify(original)))
})
test('COPY parser decodes escaped tab/newline/backslash and fails on incomplete dumps', () => {
  const dump = ['recipes', 'ingredients', 'units', 'tags', 'recipe_ingredients', 'recipe_steps', 'recipe_tags'].map(name => `COPY public.${name} (id, name) FROM stdin;\n${name === 'ingredients' ? 'abc\tcrème\\tvanille\\ncuire\\\\fin\n' : ''}\\.\n`).join('\n')
  assert.equal(parseBackup(dump).ingredients[0].name, 'crème\tvanille\ncuire\\fin')
  assert.throws(() => parseBackup(''), /Missing COPY/)
})
test('recipe create/edit persists across reload, joins dictionaries and replaces steps atomically', async () => {
  let api = await service()
  const unit = original.units[0].id
  const id = await api.saveRecipe(preview(unit))
  assert.equal((await api.listRecipes('CREPES VANILLE')).length, 1)
  api = await service()
  const recipe = await api.getRecipe(id)
  assert.equal(recipe.ingredients[0].ingredients.name, 'Farine spéciale')
  assert.equal(recipe.ingredients[0].units.id, unit)
  assert.equal(recipe.tags[0].name, 'Dessert maison')
  await api.saveRecipe({ ...preview(unit), id, name: 'Crêpes modifiées', steps: [{ instruction: 'Servir.', duration_seconds: null }] }, true)
  assert.equal((await api.getRecipe(id)).steps.length, 1)
  const before = api.exportCatalogue()
  await assert.rejects(api.saveRecipe({ ...preview('missing-unit'), id }, true), /Relation ingrédient/)
  assert.equal(api.exportCatalogue(), before)
  await assert.rejects(api.deleteReference('units', unit), /utilisée/)
})
test('storage failure does not replace the in-memory catalogue', async () => {
  const api = await service()
  await api.loadCatalogue()
  localStorage.setItem = () => { throw new Error('Quota exceeded') }
  await assert.rejects(api.saveRecipe(preview(original.units[0].id)), /Quota/)
  assert.equal((await api.listRecipes()).length, original.recipes.length)
  assert.equal(api.hasDraft(), false)
})
test('favorites and history remain local and stay out of the exported catalogue', async () => {
  const api = await service()
  const id = original.recipes[0].id
  assert.equal(api.toggleFavorite(id), true)
  api.recordView(id); api.recordView(id)
  assert.equal((await api.personalRecipes(true)).length, 1)
  assert.equal((await api.personalRecipes())[0].recipes.id, id)
  assert.equal(api.toggleFavorite(id), false)
  assert.ok(!api.exportCatalogue().includes('favorites'))
})
test('publication uses UTF-8 and GitHub SHA, clears draft, never stores credential', async () => {
  const api = await service()
  await api.saveRecipe(preview(original.units[0].id))
  let written
  globalThis.fetch = async (url, options) => {
    assert.equal(options.headers.Authorization, 'Bearer test-secret')
    if (options.method === 'PUT') { written = JSON.parse(options.body); return { ok: true, json: async () => ({ commit: { html_url: 'https://github.com/test/repo/commit/abc' } }) } }
    return { ok: true, json: async () => ({ sha: 'base-sha', content: Buffer.from(JSON.stringify(original)).toString('base64') }) }
  }
  assert.match(await api.publishCatalogue({ token: 'test-secret', repository: 'test/repo', branch: 'main' }), /commit\/abc/)
  assert.equal(written.sha, 'base-sha')
  assert.equal(written.branch, 'main')
  assert.ok(Buffer.from(written.content, 'base64').toString().includes('Crêpes à la vanille'))
  assert.equal(api.hasDraft(), false)
  assert.ok(![...stored.values()].join('').includes('test-secret'))
})
test('stale draft cannot overwrite changes even after a new deployment and reload', async () => {
  let api = await service()
  await api.saveRecipe(preview(original.units[0].id))
  const changed = structuredClone(original)
  changed.recipes[0].name = 'Modifiée ailleurs'
  globalThis.fetch = async () => ({ ok: true, json: async () => changed })
  api = await service()
  await api.loadCatalogue()
  let writes = 0
  globalThis.fetch = async (url, options) => {
    if (options.method === 'PUT') writes++
    return { ok: true, json: async () => ({ sha: 'new-sha', content: Buffer.from(JSON.stringify(changed)).toString('base64') }) }
  }
  await assert.rejects(api.publishCatalogue({ token: 'secret', repository: 'test/repo', branch: 'main' }), /a changé/)
  assert.equal(writes, 0)
  assert.equal(api.hasDraft(), true)
})
test('failed GitHub commit preserves the draft', async () => {
  const api = await service()
  await api.saveRecipe(preview(original.units[0].id))
  globalThis.fetch = async (url, options) => options.method === 'PUT' ? { ok: false, status: 409 } : { ok: true, json: async () => ({ sha: 'base', content: Buffer.from(JSON.stringify(original)).toString('base64') }) }
  await assert.rejects(api.publishCatalogue({ token: 'secret', repository: 'test/repo', branch: 'main' }), /409/)
  assert.equal(api.hasDraft(), true)
})

test('30 complete recipes cover all five requested categories without broken relations', async () => {
  const api = await service()
  api.validateCatalogue(original)
  assert.equal(curatedRecipes.length, 30)
  assert.equal(new Set(original.recipes.map(recipe => recipe.id)).size, original.recipes.length)
  for (const category of CATEGORIES) assert.equal(original.recipes.filter(recipe => recipe.category === category.id).length, 6)
  for (const recipe of original.recipes.filter(recipe => recipe.category)) {
    assert.ok(recipe.description.length > 20)
    assert.ok(original.recipe_ingredients.some(row => row.recipe_id === recipe.id))
    assert.ok(original.recipe_steps.filter(row => row.recipe_id === recipe.id).length >= 4)
  }
})
test('search finds accents, ligatures, ingredient names and combines words', async () => {
  const api = await service()
  assert.equal((await api.listRecipes('pates thon'))[0].name, 'Salade de pâtes au thon et maïs')
  assert.ok((await api.listRecipes('oeuf')).some(recipe => recipe.name === 'Moelleux au chocolat'))
  assert.ok((await api.listRecipes('poudre amande')).some(recipe => recipe.name === 'Financiers aux amandes'))
})
test('presentation scales quantities and does not invent an appliance cycle duration', () => {
  assert.equal(formatQuantity(125, 1.25), '156,25')
  assert.equal(formatQuantity(2, .25), '0,5')
  assert.equal(recipeMinutes({ prep_minutes: 10, cook_minutes: null, recipe_steps: [{ duration_seconds: 1800 }] }), null)
  assert.equal(recipeMinutes({ prep_minutes: 10, cook_minutes: 25 }), 35)
})
test('deadline timer handles background delay without interval drift or negative time', () => {
  assert.equal(secondsRemaining(60_000, 0), 60)
  assert.equal(secondsRemaining(60_000, 35_999), 25)
  assert.equal(secondsRemaining(60_000, 70_000), 0)
  assert.equal(clockLabel(62), '01:02')
})
