const DRAFT_KEY = 'leocook.catalogue-draft.v1'
const PERSONAL_KEY = 'leocook.personal.v1'
const TABLES = ['recipes', 'ingredients', 'units', 'tags', 'recipe_ingredients', 'recipe_steps', 'recipe_tags']
let published
let draft
let draftBase
let loading
const listeners = new Set()
const clone = value => structuredClone(value)
const notify = () => listeners.forEach(listener => listener())

export function validateCatalogue(value) {
  if (value?.version !== 1 || TABLES.some(table => !Array.isArray(value[table]))) throw new Error('Format de catalogue invalide.')
  for (const table of ['recipes', 'ingredients', 'units', 'tags', 'recipe_steps']) {
    const ids = new Set()
    for (const row of value[table]) {
      if (!row.id || ids.has(row.id)) throw new Error(`Identifiant absent ou dupliqué : ${table}.`)
      ids.add(row.id)
    }
  }
  const has = (table, id) => value[table].some(row => row.id === id)
  for (const recipe of value.recipes) {
    if (!recipe.name?.trim() || !Number.isInteger(recipe.servings) || recipe.servings < 1) throw new Error('Nom ou portions invalides.')
    if (recipe.image_url && !/^(https?:\/\/|data:image\/(jpeg|png|webp|gif);base64,|images\/)/.test(recipe.image_url)) throw new Error('Adresse de photo invalide.')
    if (recipe.category != null && !['airfryer','compotes','plats','patisseries','salades'].includes(recipe.category)) throw new Error('Catégorie invalide.')
    for (const key of ['prep_minutes', 'cook_minutes']) {
      if (recipe[key] != null && (!Number.isFinite(recipe[key]) || recipe[key] < 0)) throw new Error('Durée invalide.')
    }
  }
  for (const row of value.recipe_ingredients) {
    if (!has('recipes', row.recipe_id) || !has('ingredients', row.ingredient_id) || !has('units', row.unit_id) || !Number.isFinite(row.quantity) || row.quantity < 0) throw new Error('Relation ingrédient invalide.')
  }
  for (const row of value.recipe_tags) {
    if (!has('recipes', row.recipe_id) || !has('tags', row.tag_id)) throw new Error('Relation tag invalide.')
  }
  for (const row of value.recipe_steps) {
    if (!has('recipes', row.recipe_id) || !row.instruction?.trim() || !Number.isInteger(row.step_number) || row.step_number < 1 || (row.duration_seconds != null && (!Number.isFinite(row.duration_seconds) || row.duration_seconds < 0))) throw new Error('Étape invalide.')
  }
  return value
}

export async function loadCatalogue() {
  if (!loading) loading = (async () => {
    const response = await fetch(`${import.meta.env.BASE_URL}data/catalogue.json`)
    if (!response.ok) throw new Error('Impossible de charger le catalogue.')
    published = validateCatalogue(await response.json())
    const saved = localStorage.getItem(DRAFT_KEY)
    if (saved) {
      const stored = JSON.parse(saved)
      draft = validateCatalogue(stored.catalogue)
      draftBase = validateCatalogue(stored.base)
    }
    return published
  })().catch(error => { loading = undefined; throw error })
  return loading
}

export const subscribeCatalogue = listener => { listeners.add(listener); return () => listeners.delete(listener) }
export const hasDraft = () => !!draft
export const exportCatalogue = () => JSON.stringify(draft ?? published, null, 2) + '\n'
export function discardDraft() { localStorage.removeItem(DRAFT_KEY); draft = undefined; draftBase = undefined; notify() }

async function current() { await loadCatalogue(); return draft ?? published }
function persist(value) {
  validateCatalogue(value)
  // Persist before changing in-memory data: storage failures must not claim success.
  const base = draftBase ?? published
  localStorage.setItem(DRAFT_KEY, JSON.stringify({ base, catalogue: value }))
  draftBase = base
  draft = value
  notify()
}

export async function referenceData() {
  const data = await current()
  const alphabetical = rows => clone(rows).sort((a, b) => a.name.localeCompare(b.name, 'fr'))
  return { units: alphabetical(data.units), ingredients: alphabetical(data.ingredients), tags: alphabetical(data.tags) }
}
const searchable = value => String(value).normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/œ/g, 'oe').toLocaleLowerCase('fr')
export async function listRecipes(keyword = '', tagId = null) {
  const data = await current()
  return data.recipes.map(recipe => {
    const tags = data.recipe_tags.filter(row => row.recipe_id === recipe.id).map(row => data.tags.find(tag => tag.id === row.tag_id))
    const ingredients = data.recipe_ingredients.filter(row => row.recipe_id === recipe.id).map(row => data.ingredients.find(ingredient => ingredient.id === row.ingredient_id)?.name ?? '')
    return { ...recipe, tags, search_text: searchable([recipe.name, recipe.description ?? '', ...tags.map(tag => tag.name), ...ingredients].join(' ')), recipe_steps: data.recipe_steps.filter(row => row.recipe_id === recipe.id) }
  }).filter(recipe => searchable(keyword.trim()).split(/\s+/).every(word => recipe.search_text.includes(word)) && (!tagId || recipe.tags.some(tag => tag.id === tagId)))
    .sort((a, b) => (b.created_at ?? '').localeCompare(a.created_at ?? ''))
}
export async function getRecipe(id) {
  const data = await current()
  const recipe = data.recipes.find(row => row.id === id)
  if (!recipe) throw new Error('Recette introuvable.')
  return clone({ ...recipe,
    ingredients: data.recipe_ingredients.filter(row => row.recipe_id === id).map(row => ({ ...row, ingredients: data.ingredients.find(ingredient => ingredient.id === row.ingredient_id), units: data.units.find(unit => unit.id === row.unit_id) })),
    tags: data.recipe_tags.filter(row => row.recipe_id === id).map(row => data.tags.find(tag => tag.id === row.tag_id)),
    steps: data.recipe_steps.filter(row => row.recipe_id === id).sort((a, b) => a.step_number - b.step_number),
  })
}

async function readPhoto(file) {
  if (!['image/jpeg', 'image/png', 'image/webp', 'image/gif'].includes(file.type)) throw new Error('Utilise une photo JPEG, PNG, WebP ou GIF.')
  if (file.size > 750_000) throw new Error('La photo doit faire moins de 750 Ko. Réduis sa taille avant de l’ajouter.')
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(reader.result)
    reader.onerror = () => reject(new Error('Impossible de lire la photo.'))
    reader.readAsDataURL(file)
  })
}

export async function saveRecipe(preview, editMode = false) {
  const next = clone(await current())
  const id = editMode ? preview.id : crypto.randomUUID()
  const previous = next.recipes.find(recipe => recipe.id === id)
  if (editMode && !previous) throw new Error('Recette introuvable.')
  const image = preview.imageFile ? await readPhoto(preview.imageFile) : (previous?.image_url ?? (preview.imageUrl?.startsWith('blob:') ? null : preview.imageUrl) ?? null)
  next.recipes = next.recipes.filter(recipe => recipe.id !== id)
  next.recipes.push({ ...previous, id, name: preview.name.trim(), servings: Number(preview.servings), image_url: image, created_at: previous?.created_at ?? new Date().toISOString(), category: preview.category || undefined, description: preview.description?.trim() ?? previous?.description ?? '', notes: preview.notes?.trim() ?? previous?.notes ?? '', prep_minutes: preview.prep_minutes ?? previous?.prep_minutes, cook_minutes: preview.cook_minutes === null ? null : (preview.cook_minutes ?? previous?.cook_minutes) })
  for (const table of ['recipe_ingredients', 'recipe_tags', 'recipe_steps']) next[table] = next[table].filter(row => row.recipe_id !== id)
  for (const row of preview.ingredients) {
    const name = row.ingredientName.trim()
    let ingredient = next.ingredients.find(existing => existing.name.toLocaleLowerCase('fr') === name.toLocaleLowerCase('fr'))
    if (!ingredient) { ingredient = { id: crypto.randomUUID(), name, default_unit_id: row.unitId }; next.ingredients.push(ingredient) }
    if (next.recipe_ingredients.some(existing => existing.recipe_id === id && existing.ingredient_id === ingredient.id)) throw new Error('Un ingrédient apparaît plusieurs fois dans la recette.')
    next.recipe_ingredients.push({ recipe_id: id, ingredient_id: ingredient.id, quantity: Number(row.quantity), unit_id: row.unitId })
  }
  const tags = new Set()
  for (const row of preview.tags) {
    const name = row.name.trim()
    let tag = next.tags.find(existing => existing.name.toLocaleLowerCase('fr') === name.toLocaleLowerCase('fr'))
    if (!tag) { tag = { id: crypto.randomUUID(), name }; next.tags.push(tag) }
    tags.add(tag.id)
  }
  next.recipe_tags.push(...[...tags].map(tag_id => ({ recipe_id: id, tag_id })))
  next.recipe_steps.push(...preview.steps.filter(step => step.instruction.trim()).map((step, index) => ({ id: crypto.randomUUID(), recipe_id: id, step_number: index + 1, instruction: step.instruction.trim(), duration_seconds: step.duration_seconds ?? null })))
  persist(next)
  return id
}

export async function addReference(table, row) {
  if (!['ingredients', 'units'].includes(table)) throw new Error('Dictionnaire invalide.')
  const next = clone(await current())
  if (next[table].some(existing => existing.name.toLocaleLowerCase('fr') === row.name.toLocaleLowerCase('fr') || (table === 'units' && existing.abbreviation === row.abbreviation))) throw new Error('Cette entrée existe déjà.')
  next[table].push({ ...row, id: crypto.randomUUID() })
  persist(next)
}
export async function deleteReference(table, id) {
  if (!['ingredients', 'units'].includes(table)) throw new Error('Dictionnaire invalide.')
  const next = clone(await current())
  if (next.recipe_ingredients.some(row => row[table === 'units' ? 'unit_id' : 'ingredient_id'] === id) || (table === 'units' && next.ingredients.some(row => row.default_unit_id === id))) throw new Error('Cette entrée est utilisée par une recette ou un ingrédient.')
  next[table] = next[table].filter(row => row.id !== id)
  persist(next)
}

function personal() { return JSON.parse(localStorage.getItem(PERSONAL_KEY) ?? '{"favorites":[],"history":[]}') }
export function isFavorite(id) { return personal().favorites.includes(id) }
export function toggleFavorite(id) {
  const data = personal()
  data.favorites = data.favorites.includes(id) ? data.favorites.filter(value => value !== id) : [...data.favorites, id]
  localStorage.setItem(PERSONAL_KEY, JSON.stringify(data))
  return data.favorites.includes(id)
}
export function recordView(id) {
  const data = personal()
  data.history = [{ recipe_id: id, viewed_at: new Date().toISOString() }, ...data.history.filter(row => row.recipe_id !== id)].slice(0, 50)
  localStorage.setItem(PERSONAL_KEY, JSON.stringify(data))
}
export async function personalRecipes(history = false) {
  const data = await current()
  const saved = personal()
  return (history ? saved.history : saved.favorites.map(recipe_id => ({ recipe_id }))).map(row => ({ ...row, recipes: data.recipes.find(recipe => recipe.id === row.recipe_id) })).filter(row => row.recipes)
}

export async function publishCatalogue({ token, repository, branch }) {
  await loadCatalogue()
  if (!draft) throw new Error('Aucun brouillon à publier.')
  if (!/^[\w.-]+\/[\w.-]+$/.test(repository) || !branch.trim() || !token.trim()) throw new Error('Renseigne le dépôt, la branche et ton token GitHub.')
  const snapshot = clone(draft)
  const endpoint = `https://api.github.com/repos/${repository}/contents/public/data/catalogue.json`
  const headers = { Accept: 'application/vnd.github+json', Authorization: `Bearer ${token.trim()}` }
  const response = await fetch(`${endpoint}?ref=${encodeURIComponent(branch.trim())}`, { headers, cache: 'no-store' })
  if (!response.ok) throw new Error(`Lecture GitHub impossible (${response.status}). Vérifie le dépôt, la branche et les permissions du token.`)
  const remote = await response.json()
  if (!remote.content || !remote.sha) throw new Error('Le fichier GitHub est trop volumineux ou inaccessible. Utilise l’export JSON.')
  const decode = content => new TextDecoder().decode(Uint8Array.from(atob(content.replace(/\s/g, '')), char => char.charCodeAt(0)))
  const base = validateCatalogue(JSON.parse(decode(remote.content)))
  if (JSON.stringify(base) !== JSON.stringify(draftBase)) throw new Error('Le catalogue GitHub a changé. Exporte ton brouillon pour le conserver, puis abandonne-le et recharge le site après le déploiement avant de reprendre tes modifications.')
  const json = JSON.stringify(snapshot, null, 2) + '\n'
  const bytes = new TextEncoder().encode(json)
  if (bytes.length > 900_000) throw new Error('Le catalogue dépasse 900 Ko. Utilise des photos plus petites ou l’export JSON.')
  let binary = ''
  for (const byte of bytes) binary += String.fromCharCode(byte)
  const result = await fetch(endpoint, { method: 'PUT', headers: { ...headers, 'Content-Type': 'application/json' }, body: JSON.stringify({ message: 'Update recipe catalogue', content: btoa(binary), sha: remote.sha, branch: branch.trim() }) })
  if (!result.ok) throw new Error(`Publication refusée (${result.status}). Ton brouillon est conservé. Vérifie les permissions et les protections de branche.`)
  const commit = await result.json()
  published = snapshot
  // Keep edits made while the request was in flight.
  if (JSON.stringify(draft) === JSON.stringify(snapshot)) discardDraft()
  else {
    draftBase = snapshot
    localStorage.setItem(DRAFT_KEY, JSON.stringify({ base: snapshot, catalogue: draft }))
  }
  return commit.commit?.html_url
}
