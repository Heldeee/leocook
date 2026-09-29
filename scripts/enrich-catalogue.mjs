import fs from 'node:fs'
import { createHash } from 'node:crypto'
import { recipes } from './recipes.mjs'

const filename = 'public/data/catalogue.json'
const catalogue = JSON.parse(fs.readFileSync(filename, 'utf8'))
const id = key => { const hex = createHash('sha256').update(`kousine:${key}`).digest('hex'); return `${hex.slice(0,8)}-${hex.slice(8,12)}-4${hex.slice(13,16)}-a${hex.slice(17,20)}-${hex.slice(20,32)}` }
function reference(table, name, extra = {}) {
  let row = catalogue[table].find(row => row.name === name || (table === 'units' && row.abbreviation === name))
  if (!row) { row = { id: id(`${table}:${name}`), name, ...extra }; catalogue[table].push(row) }
  return row.id
}
for (const recipe of recipes) {
  const recipeId = id(recipe.slug)
  // Repeat runs add nothing twice. Existing imported or edited recipes remain untouched.
  if (catalogue.recipes.some(row => row.id === recipeId)) continue
  const { slug, ingredients, steps, tags, ...fields } = recipe
  catalogue.recipes.push({ id: recipeId, ...fields, image_url: null, created_at: '2026-09-29T12:00:00.000Z' })
  for (const [name, quantity, unit] of ingredients) {
    const unit_id = reference('units', unit, { abbreviation: unit })
    const ingredient_id = reference('ingredients', name, { default_unit_id: unit_id })
    catalogue.recipe_ingredients.push({ recipe_id: recipeId, ingredient_id, quantity, unit_id })
  }
  for (const name of tags) catalogue.recipe_tags.push({ recipe_id: recipeId, tag_id: reference('tags', name) })
  steps.forEach(([instruction, minutes], index) => catalogue.recipe_steps.push({ id: id(`${slug}:step:${index}`), recipe_id: recipeId, step_number: index + 1, instruction, duration_seconds: minutes == null ? null : minutes * 60 }))
}
fs.writeFileSync(filename, JSON.stringify(catalogue, null, 2) + '\n')
console.log(`${recipes.length} curated recipes; ${catalogue.recipes.length} recipes in the catalogue.`)
