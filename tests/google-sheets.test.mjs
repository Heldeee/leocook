import assert from 'node:assert/strict'
import fs from 'node:fs'
import vm from 'node:vm'
import { test } from 'node:test'

const source = fs.readFileSync('google-apps-script/Code.gs', 'utf8')
const original = JSON.parse(fs.readFileSync('public/data/catalogue.json', 'utf8'))
const context = vm.createContext({ console })
vm.runInContext(source, context)
const plain = value => JSON.parse(JSON.stringify(value))
const rows = () => plain(context.catalogueToRows_(original))

test('Apps Script round-trips all existing recipe IDs, ingredients and instructions', () => {
  const data = plain(context.buildCatalogue_(rows()))
  assert.equal(data.recipes.length, original.recipes.length)
  assert.deepEqual(data.recipes.map(recipe => recipe.id), original.recipes.map(recipe => recipe.id))
  assert.equal(data.recipe_ingredients.length, original.recipe_ingredients.length)
  assert.deepEqual(data.recipe_steps.map(step => step.instruction), original.recipe_steps.map(step => step.instruction))
  assert.equal(data.recipes.find(recipe => recipe.category === 'compotes').cook_minutes, null)
})
test('only published recipes are exposed, including no ingredients/tags/steps from drafts', () => {
  const tabs = rows()
  const hidden = tabs.Recettes[0].id
  tabs.Recettes[0].status = 'draft'
  const data = plain(context.buildCatalogue_(tabs))
  assert.ok(!data.recipes.some(recipe => recipe.id === hidden))
  for (const key of ['recipe_ingredients', 'recipe_steps', 'recipe_tags']) assert.ok(!data[key].some(row => row.recipe_id === hidden))
})
test('numbers accept French decimals, unknown times stay null, and invalid values fail', () => {
  const tabs = rows()
  tabs.Ingredients[0].quantity = '1,5'
  assert.equal(context.buildCatalogue_(tabs).recipe_ingredients[0].quantity, 1.5)
  for (const bad of ['-2', '150 g', 'Infinity', '']) {
    tabs.Ingredients[0].quantity = bad
    assert.throws(() => context.buildCatalogue_(tabs), /Nombre/)
  }
})
test('incomplete published recipe, duplicate IDs and unordered step sequence are rejected', () => {
  let tabs = rows()
  tabs.Ingredients = tabs.Ingredients.filter(row => row.recipe_id !== tabs.Recettes[0].id)
  assert.throws(() => context.buildCatalogue_(tabs), /ingrédients et des étapes/)
  tabs = rows(); tabs.Recettes.push(tabs.Recettes[0])
  assert.throws(() => context.buildCatalogue_(tabs), /dupliqué/)
  tabs = rows(); tabs.Etapes[0].step_number = 9
  assert.throws(() => context.buildCatalogue_(tabs), /se suivre/)
})
test('extra columns are not exposed and missing headers are detected', () => {
  const tabs = rows(); tabs.Recettes[0].private_notes = 'not for the app'
  assert.ok(!JSON.stringify(context.buildCatalogue_(tabs)).includes('not for the app'))
  const spreadsheet = { getSheetByName: () => ({ getDataRange: () => ({ getValues: () => [['id', 'name'], ['x', 'test']] }) }) }
  assert.throws(() => context.readRows_(spreadsheet, 'Recettes'), /En-têtes/)
})
test('initializer refuses a nonempty tab before fetching or writing', () => {
  const guarded = vm.createContext({ SpreadsheetApp: { getActiveSpreadsheet: () => ({ getSheetByName: () => ({ getLastRow: () => 1 }) }) } })
  vm.runInContext(source, guarded)
  assert.throws(() => guarded.initialiserKousine(), /contient des données/)
})
test('public endpoint has no write handler, arbitrary spreadsheet selector or raw error disclosure', () => {
  assert.equal(context.doPost, undefined)
  const outputContext = vm.createContext({ console: { error() {} }, PropertiesService: { getScriptProperties: () => ({ getProperty: () => '' }) }, ContentService: { MimeType: { JSON: 'json' }, createTextOutput: value => ({ value, setMimeType() { return this } }) } })
  vm.runInContext(source, outputContext)
  const output = JSON.parse(outputContext.doGet({ parameter: { spreadsheetId: 'arbitrary' } }).value)
  assert.ok(output.error)
  assert.ok(!JSON.stringify(output).includes('KOU_SPREADSHEET_ID'))
})
