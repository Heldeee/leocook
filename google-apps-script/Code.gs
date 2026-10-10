// Kousine — paste this entire file into Extensions > Apps Script in your Sheet.
// Only doGet is public. There is deliberately no public write endpoint.
const KOU_SOURCE = 'https://heldeee.github.io/leocook/data/catalogue.json';
const KOU_HEADERS = {
  Recettes: ['id', 'name', 'category', 'servings', 'description', 'notes', 'prep_minutes', 'cook_minutes', 'image_url', 'tags', 'status', 'created_at'],
  Ingredients: ['recipe_id', 'ingredient', 'quantity', 'unit'],
  Etapes: ['recipe_id', 'step_number', 'instruction', 'duration_seconds'],
};

function onOpen() {
  SpreadsheetApp.getUi().createMenu('Kousine')
    .addItem('Initialiser et importer les recettes', 'initialiserKousine')
    .addItem('Vérifier les recettes publiées', 'verifierKousine')
    .addToUi();
}

function initialiserKousine() {
  const spreadsheet = SpreadsheetApp.getActiveSpreadsheet();
  if (!spreadsheet) throw new Error('Ouvre ce script depuis Extensions > Apps Script dans ton tableur.');
  // Refuse any existing rows, including headers: never overwrite a user's Sheet.
  Object.keys(KOU_HEADERS).forEach(name => {
    const existing = spreadsheet.getSheetByName(name);
    if (existing && existing.getLastRow() > 0) throw new Error('L’onglet ' + name + ' existe déjà et contient des données. Rien n’a été remplacé.');
  });
  const response = UrlFetchApp.fetch(KOU_SOURCE, { muteHttpExceptions: true });
  if (response.getResponseCode() !== 200) throw new Error('Import impossible. Le site Kousine doit être accessible.');
  const catalogue = JSON.parse(response.getContentText());
  const rows = catalogueToRows_(catalogue);
  buildCatalogue_(rows); // Validate before creating any tab.
  Object.keys(KOU_HEADERS).forEach(name => {
    const sheet = spreadsheet.getSheetByName(name) || spreadsheet.insertSheet(name);
    const headers = KOU_HEADERS[name];
    const values = [headers].concat(rows[name].map(row => headers.map(key => safeCell_(row[key]))));
    // Plain text prevents formula interpretation and preserves IDs and decimal dots.
    sheet.getRange(1, 1, values.length, headers.length).setNumberFormat('@').setValues(values);
    sheet.setFrozenRows(1);
    sheet.getRange(1, 1, 1, headers.length).setFontWeight('bold').setBackground('#E4EBDA');
    sheet.getDataRange().setWrap(true);
    sheet.setColumnWidths(1, headers.length, 150);
    if (values.length > 1) sheet.getDataRange().createFilter();
  });
  const recipes = spreadsheet.getSheetByName('Recettes');
  recipes.getRange(2, 11, Math.max(rows.Recettes.length, 1), 1).setDataValidation(
    SpreadsheetApp.newDataValidation().requireValueInList(['draft', 'published'], true).setAllowInvalid(false).build()
  );
  SpreadsheetApp.flush();
  PropertiesService.getScriptProperties().setProperty('KOU_SPREADSHEET_ID', spreadsheet.getId());
  spreadsheet.toast(rows.Recettes.length + ' recettes importées. Garde ce fichier privé.', 'Kousine', 8);
}

function safeCell_(value) {
  const text = value == null ? '' : String(value);
  // Escaping applies only to spreadsheet formulas, not the public JSON.
  return /^[=+@]/.test(text) ? "'" + text : text;
}

function catalogueToRows_(catalogue) {
  if (catalogue.version !== 1 || ['recipes','ingredients','units','tags','recipe_ingredients','recipe_steps','recipe_tags'].some(key => !Array.isArray(catalogue[key]))) throw new Error('Catalogue d’import invalide.');
  const find = (table, id) => {
    const row = catalogue[table].find(item => item.id === id);
    if (!row) throw new Error('Référence absente dans ' + table);
    return row;
  };
  return {
    Recettes: catalogue.recipes.map(recipe => ({
      id: recipe.id, name: recipe.name, category: recipe.category || '', servings: recipe.servings,
      description: recipe.description || '', notes: recipe.notes || '', prep_minutes: recipe.prep_minutes,
      cook_minutes: recipe.cook_minutes, image_url: recipe.image_url || '',
      tags: catalogue.recipe_tags.filter(row => row.recipe_id === recipe.id).map(row => find('tags', row.tag_id).name).join(' | '),
      status: 'published', created_at: recipe.created_at || '',
    })),
    Ingredients: catalogue.recipe_ingredients.map(row => ({ recipe_id: row.recipe_id, ingredient: find('ingredients', row.ingredient_id).name, quantity: row.quantity, unit: find('units', row.unit_id).abbreviation })),
    Etapes: catalogue.recipe_steps.map(row => ({ recipe_id: row.recipe_id, step_number: row.step_number, instruction: row.instruction, duration_seconds: row.duration_seconds })),
  };
}

function readRows_(spreadsheet, name) {
  const sheet = spreadsheet.getSheetByName(name);
  if (!sheet) throw new Error('Onglet absent : ' + name);
  const values = sheet.getDataRange().getValues();
  const headers = values.shift().map(value => String(value).trim());
  if (new Set(headers).size !== headers.length || KOU_HEADERS[name].some(key => !headers.includes(key))) throw new Error('En-têtes invalides dans ' + name);
  return values.filter(row => row.some(value => value !== '')).map(row => Object.fromEntries(headers.map((key, index) => [key, row[index]])));
}

function buildCatalogue_(tabs) {
  const text = value => value == null ? '' : String(value).trim();
  const normalize = value => text(value).toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/œ/g, 'oe');
  const number = (value, optional) => {
    if (text(value) === '') { if (optional) return null; throw new Error('Nombre obligatoire manquant.'); }
    if (!/^\d+(?:[.,]\d+)?$/.test(text(value))) throw new Error('Nombre invalide : utilise 1,5 ou 1.5, sans unité.');
    const parsed = Number(text(value).replace(',', '.'));
    if (!Number.isFinite(parsed)) throw new Error('Nombre invalide.');
    return parsed;
  };
  const result = { version: 1, recipes: [], ingredients: [], units: [], tags: [], recipe_ingredients: [], recipe_steps: [], recipe_tags: [] };
  const seen = new Set();
  tabs.Recettes.forEach(row => {
    const id = text(row.id), status = text(row.status).toLowerCase();
    if (!id || seen.has(id)) throw new Error('Identifiant de recette absent ou dupliqué.');
    seen.add(id);
    if (!['draft', 'published'].includes(status)) throw new Error('Le statut doit être draft ou published.');
    if (status !== 'published') return;
    const servings = number(row.servings), name = text(row.name), category = text(row.category);
    if (!name || !Number.isInteger(servings) || servings < 1) throw new Error('Nom ou portions invalides.');
    if (category && !['airfryer','compotes','plats','patisseries','salades'].includes(category)) throw new Error('Catégorie invalide.');
    const image = text(row.image_url);
    if (image && !/^(https?:\/\/|data:image\/(jpeg|png|webp|gif);base64,|images\/)/.test(image)) throw new Error('Adresse de photo invalide.');
    const created = row.created_at instanceof Date ? row.created_at.toISOString() : text(row.created_at);
    result.recipes.push({ id, name, servings, category: category || undefined, description: text(row.description), notes: text(row.notes), prep_minutes: number(row.prep_minutes, true), cook_minutes: number(row.cook_minutes, true), image_url: image || null, created_at: created });
    const tagNames = new Set(text(row.tags).split('|').map(text).filter(Boolean));
    tagNames.forEach(name => {
      const tag = dictionary('tags', name);
      if (!result.recipe_tags.some(link => link.recipe_id === id && link.tag_id === tag.id)) result.recipe_tags.push({ recipe_id: id, tag_id: tag.id });
    });
  });
  function dictionary(table, name) {
    const id = table + ':' + normalize(name);
    let row = result[table].find(item => item.id === id);
    if (!row) { row = { id, name, ...(table === 'units' ? { abbreviation: name } : {}) }; result[table].push(row); }
    return row;
  }
  const published = new Set(result.recipes.map(recipe => recipe.id));
  tabs.Ingredients.forEach(row => {
    const recipe_id = text(row.recipe_id);
    if (!published.has(recipe_id)) return;
    if (!text(row.ingredient) || !text(row.unit)) throw new Error('Nom ou unité d’ingrédient manquant.');
    const ingredient = dictionary('ingredients', text(row.ingredient)), unit = dictionary('units', text(row.unit));
    if (result.recipe_ingredients.some(link => link.recipe_id === recipe_id && link.ingredient_id === ingredient.id)) throw new Error('Ingrédient dupliqué dans une recette.');
    result.recipe_ingredients.push({ recipe_id, ingredient_id: ingredient.id, quantity: number(row.quantity), unit_id: unit.id });
  });
  tabs.Etapes.forEach(row => {
    const recipe_id = text(row.recipe_id);
    if (!published.has(recipe_id)) return;
    const step_number = number(row.step_number), instruction = text(row.instruction);
    if (!instruction || !Number.isInteger(step_number) || step_number < 1) throw new Error('Numéro ou instruction d’étape invalide.');
    if (result.recipe_steps.some(step => step.recipe_id === recipe_id && step.step_number === step_number)) throw new Error('Numéro d’étape dupliqué.');
    result.recipe_steps.push({ id: recipe_id + ':step:' + step_number, recipe_id, step_number, instruction, duration_seconds: number(row.duration_seconds, true) });
  });
  result.recipes.forEach(recipe => {
    const steps = result.recipe_steps.filter(step => step.recipe_id === recipe.id).sort((a, b) => a.step_number - b.step_number);
    if (!result.recipe_ingredients.some(row => row.recipe_id === recipe.id) || !steps.length) throw new Error('Une recette publiée doit contenir des ingrédients et des étapes.');
    if (steps.some((step, index) => step.step_number !== index + 1)) throw new Error('Les étapes doivent se suivre à partir de 1.');
  });
  return result;
}

function getKousineCatalogue_() {
  const id = PropertiesService.getScriptProperties().getProperty('KOU_SPREADSHEET_ID');
  if (!id) throw new Error('Exécute initialiserKousine avant de déployer.');
  const spreadsheet = SpreadsheetApp.openById(id);
  return buildCatalogue_(Object.fromEntries(Object.keys(KOU_HEADERS).map(name => [name, readRows_(spreadsheet, name)])));
}

function verifierKousine() {
  const catalogue = getKousineCatalogue_();
  SpreadsheetApp.getUi().alert(catalogue.recipes.length + ' recettes publiées valides.');
}

function doGet() {
  let output;
  try { output = getKousineCatalogue_(); }
  catch (error) { console.error(error.message); output = { error: 'Catalogue indisponible. Vérifie les onglets et les recettes publiées depuis le menu Kousine.' }; }
  return ContentService.createTextOutput(JSON.stringify(output)).setMimeType(ContentService.MimeType.JSON);
}
