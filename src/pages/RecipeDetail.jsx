import { useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { Alert, Box, Button, Chip, Container, IconButton, Paper, Stack, Typography } from '@mui/material'
import ArrowBackIcon from '@mui/icons-material/ArrowBack'
import EditIcon from '@mui/icons-material/Edit'
import FavoriteIcon from '@mui/icons-material/Favorite'
import FavoriteBorderIcon from '@mui/icons-material/FavoriteBorder'
import AddIcon from '@mui/icons-material/Add'
import RemoveIcon from '@mui/icons-material/Remove'
import PlayCircleOutlineIcon from '@mui/icons-material/PlayCircleOutlined'
import ScheduleIcon from '@mui/icons-material/Schedule'
import { getRecipe, isFavorite, toggleFavorite, recordView } from '../lib/catalogue'
import { categoryFor, recipeMinutes } from '../lib/recipePresentation'
import { useUser } from '../context/UserContext'
import { formatMinutes } from '../utils/time'
import RecipeImage from '../components/RecipeImage'
import IngredientChecklist from '../components/IngredientChecklist'
import CookingMode from '../components/CookingMode'

export default function RecipeDetail() {
  const { id } = useParams()
  const { editing } = useUser()
  const navigate = useNavigate()
  const [recipe, setRecipe] = useState(null)
  const [error, setError] = useState('')
  const [favorite, setFavorite] = useState(false)
  const [servings, setServings] = useState(1)
  const [checked, setChecked] = useState([])
  const [cooking, setCooking] = useState(false)
  useEffect(() => {
    let alive = true
    getRecipe(id).then(data => {
      if (!alive) return
      setRecipe(data); setServings(data.servings); setFavorite(isFavorite(id)); setError('')
      try { const saved = JSON.parse(sessionStorage.getItem(`kousine.ingredients.${id}`) ?? '[]'); setChecked(Array.isArray(saved) ? saved : []) } catch { setChecked([]) }
      recordView(id)
    }).catch(error => { if (alive) setError(error.message) })
    return () => { alive = false }
  }, [id])
  const checkIngredient = ingredientId => setChecked(current => {
    const next = current.includes(ingredientId) ? current.filter(id => id !== ingredientId) : [...current, ingredientId]
    sessionStorage.setItem(`kousine.ingredients.${id}`, JSON.stringify(next))
    return next
  })
  const changeServings = number => { setServings(number); setChecked([]); sessionStorage.removeItem(`kousine.ingredients.${id}`) }
  if (error) return <Container sx={{ py: 4 }}><Alert severity="error">{error}</Alert><Button onClick={() => navigate('/')}>Retour aux recettes</Button></Container>
  if (!recipe || recipe.id !== id) return <Container sx={{ py: 4 }}>Chargement…</Container>
  const category = categoryFor(recipe.category), minutes = recipeMinutes({ ...recipe, recipe_steps: recipe.steps }), ratio = servings / recipe.servings
  return <Container maxWidth="lg" sx={{ py: { xs: 2, sm: 3 }, px: { xs: 2, sm: 3 } }}>
    <Stack direction="row" sx={{ mb: 2, justifyContent: 'space-between', alignItems: 'center' }}>
      <Button startIcon={<ArrowBackIcon />} onClick={() => navigate('/')}>Recettes</Button>
      <Stack direction="row" spacing={.5}><IconButton aria-label={favorite ? 'Retirer des favoris' : 'Ajouter aux favoris'} aria-pressed={favorite} onClick={() => setFavorite(toggleFavorite(id))} color="primary">{favorite ? <FavoriteIcon /> : <FavoriteBorderIcon />}</IconButton>{editing && <IconButton aria-label="Modifier la recette" onClick={() => navigate(`/recipes/${id}/edit`)}><EditIcon /></IconButton>}</Stack>
    </Stack>
    {recipe.image_url && <Box sx={{ mb: 3 }}><RecipeImage src={recipe.image_url} name={recipe.name} height={{ xs: 200, sm: 300 }} borderRadius={3} /></Box>}
    <Box component="header" sx={{ mb: 3, maxWidth: 780 }}>
      {category && <Typography variant="overline" color="primary" sx={{ letterSpacing: '.1em' }}>{category.title}</Typography>}
      <Typography variant="h4" component="h1" sx={{ fontSize: { xs: '2rem', sm: '2.7rem' }, lineHeight: 1.2, overflowWrap: 'anywhere', mb: 1.5 }}>{recipe.name}</Typography>
      {recipe.description && <Typography color="text.secondary" sx={{ fontSize: '1.05rem', lineHeight: 1.7 }}>{recipe.description}</Typography>}
      <Stack direction="row" spacing={1} sx={{ mt: 2, flexWrap: 'wrap', gap: 1, alignItems: 'center' }}>
        <Stack direction="row" spacing={.5} alignItems="center"><ScheduleIcon sx={{ fontSize: 18 }} /><Typography variant="body2">{minutes != null ? formatMinutes(minutes) : recipe.category === 'compotes' ? '10 min de préparation + cycle appareil' : 'Durée selon les étapes'}</Typography></Stack>
        {recipe.tags.map(tag => <Chip key={tag.id} label={tag.name} size="small" variant="outlined" />)}
      </Stack>
      {recipe.prep_minutes != null && recipe.cook_minutes != null && <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 1 }}>Préparation : {recipe.prep_minutes} min · Cuisson : {recipe.cook_minutes} min · Repos éventuel indiqué dans les étapes.</Typography>}
    </Box>
    <Button variant="contained" size="large" fullWidth startIcon={<PlayCircleOutlineIcon />} disabled={!recipe.steps.length} onClick={() => setCooking(true)} sx={{ mb: 3, py: 1.5, maxWidth: { sm: 350 } }}>Mode cuisine</Button>
    <Box sx={{ display: 'grid', gridTemplateColumns: { xs: 'minmax(0, 1fr)', sm: '280px minmax(0, 1fr)', md: '320px minmax(0, 1fr)' }, gap: { xs: 3, sm: 3, md: 4 }, alignItems: 'start' }}>
      <Paper component="section" aria-labelledby="ingredients-heading" variant="outlined" sx={{ p: { xs: 2, sm: 3 }, position: { sm: 'sticky' }, top: { sm: 20 }, borderRadius: 3 }}>
        <Typography id="ingredients-heading" component="h2" variant="h5">Ingrédients</Typography>
        <Stack direction="row" sx={{ mt: 2, mb: 1, p: .5, bgcolor: 'background.default', borderRadius: 2, alignItems: 'center', justifyContent: 'space-between' }}>
          <IconButton aria-label="Réduire les portions" onClick={() => changeServings(servings - 1)} disabled={servings <= 1}><RemoveIcon /></IconButton>
          <Typography aria-live="polite" sx={{ fontWeight: 650 }}>{servings} portion{servings > 1 ? 's' : ''}</Typography>
          <IconButton aria-label="Augmenter les portions" onClick={() => changeServings(servings + 1)} disabled={servings >= 24}><AddIcon /></IconButton>
        </Stack>
        {ratio !== 1 && <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 1 }}>Quantités adaptées. Les temps, le moule et les repères de l’appareil ne changent pas automatiquement. Adapte les œufs fractionnés.</Typography>}
        <IngredientChecklist ingredients={recipe.ingredients} ratio={ratio} checked={checked} onToggle={checkIngredient} />
        <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 2 }}>{checked.length} / {recipe.ingredients.length} préparés · touche pour cocher</Typography>
      </Paper>
      <Box component="section" aria-labelledby="steps-heading" sx={{ minWidth: 0 }}>
        <Typography id="steps-heading" component="h2" variant="h5" sx={{ mb: 2 }}>Étapes</Typography>
        <Stack component="ol" spacing={1.5} sx={{ listStyle: 'none', p: 0, m: 0 }}>
          {recipe.steps.map((step, index) => <Paper component="li" variant="outlined" key={step.id} sx={{ p: { xs: 2, sm: 3 }, borderRadius: 3 }}>
            <Stack direction="row" spacing={1.5} alignItems="flex-start"><Box sx={{ flexShrink: 0, width: 30, height: 30, display: 'grid', placeItems: 'center', bgcolor: 'primary.main', color: 'primary.contrastText', borderRadius: '50%', fontWeight: 650 }}>{index + 1}</Box><Box sx={{ minWidth: 0 }}><Typography sx={{ lineHeight: 1.8, overflowWrap: 'anywhere' }}>{step.instruction}</Typography>{step.duration_seconds > 0 && <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 1 }}>Minuteur disponible : {formatMinutes(Math.ceil(step.duration_seconds / 60))}</Typography>}</Box></Stack>
          </Paper>)}
        </Stack>
        {recipe.notes && <Alert severity="info" icon={false} sx={{ mt: 3, lineHeight: 1.7 }}><Typography sx={{ fontWeight: 650, mb: .5 }}>Bon à savoir</Typography>{recipe.notes}</Alert>}
      </Box>
    </Box>
    {cooking && <CookingMode key={recipe.id} recipe={recipe} ratio={ratio} checked={checked} onToggle={checkIngredient} onClose={() => setCooking(false)} />}
  </Container>
}
