export const CATEGORIES = [
  { id: 'airfryer', name: 'Airfryer', title: 'Gâteaux à l’airfryer', color: '#B76A36', background: '#F5E4CA' },
  { id: 'compotes', name: 'Compotes', title: 'Compotes maison', color: '#9F543D', background: '#F6E1D7' },
  { id: 'plats', name: 'Plats simples', title: 'Plats du quotidien', color: '#46654A', background: '#E4EBDA' },
  { id: 'patisseries', name: 'Pâtisseries', title: 'Petites pâtisseries', color: '#876B40', background: '#F2EAD7' },
  { id: 'salades', name: 'Salades', title: 'Salades fraîches', color: '#4E7463', background: '#DDEDE3' },
]
export const categoryFor = id => CATEGORIES.find(category => category.id === id)
export const normalizeSearch = value => value.normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/œ/g, 'oe').toLocaleLowerCase('fr')
export function recipeMinutes(recipe) {
  if (recipe.prep_minutes != null && recipe.cook_minutes != null) return recipe.prep_minutes + recipe.cook_minutes
  if (recipe.cook_minutes === null) return null
  const seconds = recipe.recipe_steps?.reduce((sum, step) => sum + (step.duration_seconds ?? 0), 0) ?? 0
  return seconds ? Math.ceil(seconds / 60) : null
}
export function formatQuantity(quantity, ratio = 1) {
  return new Intl.NumberFormat('fr-FR', { maximumFractionDigits: 2 }).format(Math.round(quantity * ratio * 100) / 100)
}
export function secondsRemaining(deadline, now = Date.now()) {
  return Math.max(0, Math.ceil((deadline - now) / 1000))
}
export function clockLabel(seconds) {
  const minutes = Math.floor(seconds / 60)
  return `${String(minutes).padStart(2, '0')}:${String(seconds % 60).padStart(2, '0')}`
}
