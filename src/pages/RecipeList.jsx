import { useDeferredValue, useEffect, useMemo, useRef, useState } from 'react'
import { Alert, Box, Button, Card, CardActionArea, CardContent, Chip, Container, InputAdornment, IconButton, MenuItem, Skeleton, Stack, TextField, Typography } from '@mui/material'
import SearchIcon from '@mui/icons-material/Search'
import CloseIcon from '@mui/icons-material/Close'
import SettingsIcon from '@mui/icons-material/Settings'
import ScheduleIcon from '@mui/icons-material/Schedule'
import { useNavigate } from 'react-router-dom'
import DictionaryDialog from '../components/DictionaryDialog'
import RecipeImage from '../components/RecipeImage'
import { listRecipes, subscribeCatalogue } from '../lib/catalogue'
import { CATEGORIES, normalizeSearch, recipeMinutes, categoryFor } from '../lib/recipePresentation'
import { useUser } from '../context/UserContext'
import { formatMinutes } from '../utils/time'

export default function RecipeList() {
  const navigate = useNavigate()
  const { editing } = useUser()
  const [recipes, setRecipes] = useState([])
  const [keyword, setKeyword] = useState(() => sessionStorage.getItem('kousine.search') ?? '')
  const [category, setCategory] = useState(() => sessionStorage.getItem('kousine.category') ?? '')
  const [sort, setSort] = useState('name')
  const [quick, setQuick] = useState(false)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [dictionaryOpen, setDictionaryOpen] = useState(false)
  const deferredKeyword = useDeferredValue(keyword)
  const restoredScroll = useRef(false)
  useEffect(() => {
    let alive = true
    const load = () => listRecipes().then(data => { if (alive) { setRecipes(data); setLoading(false) } }).catch(error => { if (alive) { setError(error.message); setLoading(false) } })
    load()
    const unsubscribe = subscribeCatalogue(load)
    return () => { alive = false; unsubscribe() }
  }, [])
  useEffect(() => {
    if (loading || restoredScroll.current) return
    restoredScroll.current = true
    const frame = requestAnimationFrame(() => window.scrollTo(0, Number(sessionStorage.getItem('kousine.list-scroll') ?? 0)))
    return () => cancelAnimationFrame(frame)
  }, [loading])
  const results = useMemo(() => {
    const words = normalizeSearch(deferredKeyword.trim()).split(/\s+/)
    return recipes.filter(recipe => (!category || recipe.category === category) && words.every(word => recipe.search_text.includes(word)) && (!quick || (recipeMinutes(recipe) != null && recipeMinutes(recipe) <= 30)))
      .sort((a, b) => sort === 'time' ? (recipeMinutes(a) ?? Infinity) - (recipeMinutes(b) ?? Infinity) : a.name.localeCompare(b.name, 'fr'))
  }, [recipes, category, deferredKeyword, quick, sort])
  const changeCategory = id => { setCategory(id); sessionStorage.setItem('kousine.category', id) }
  const changeKeyword = value => { setKeyword(value); sessionStorage.setItem('kousine.search', value) }
  const clear = () => { changeKeyword(''); changeCategory(''); setQuick(false) }
  return <Container maxWidth="lg" sx={{ py: { xs: 2, sm: 4 }, px: { xs: 2, sm: 3 } }}>
    <Box component="header" sx={{ mb: 3 }}>
      <Typography variant="overline" sx={{ color: 'primary.main', letterSpacing: '.16em' }}>Le carnet de cuisine</Typography>
      <Typography component="h1" variant="h3" sx={{ fontSize: { xs: '2.4rem', sm: '3.5rem' }, lineHeight: 1.15 }}>Kousine<span style={{ color: '#B76A36' }}>.</span></Typography>
      <Typography color="text.secondary" sx={{ mt: 1 }}>Des recettes simples, à portée de main.</Typography>
    </Box>
    <Box sx={{ position: 'sticky', top: 0, zIndex: 5, bgcolor: 'background.default', pt: 1, pb: 1.5, mb: 2 }}>
      <Stack direction="row" spacing={1}>
        <TextField placeholder="Une recette, un ingrédient…" fullWidth value={keyword} onChange={event => changeKeyword(event.target.value)}
          slotProps={{ htmlInput: { 'aria-label': 'Rechercher une recette ou un ingrédient', type: 'search' }, input: { startAdornment: <InputAdornment position="start"><SearchIcon /></InputAdornment>, endAdornment: keyword && <InputAdornment position="end"><IconButton aria-label="Effacer la recherche" onClick={() => changeKeyword('')}><CloseIcon /></IconButton></InputAdornment> } }} />
        {editing && <IconButton aria-label="Dictionnaires" onClick={() => setDictionaryOpen(true)} sx={{ border: '1px solid', borderColor: 'divider', borderRadius: 2 }}><SettingsIcon /></IconButton>}
      </Stack>
      <Box component="nav" aria-label="Catégories de recettes" sx={{ display: { xs: 'grid', sm: 'flex' }, gridTemplateColumns: 'repeat(3, minmax(0, 1fr))', flexWrap: 'wrap', gap: 1, mt: 1.5, pb: .5, '& .MuiChip-root': { minHeight: 44, fontSize: { xs: '.76rem', sm: '.85rem' }, '& .MuiChip-label': { px: { xs: 1, sm: 1.5 } } } }}>
        <Chip label="Toutes" color={!category ? 'primary' : 'default'} onClick={() => changeCategory('')} aria-pressed={!category} />
        {CATEGORIES.map(item => <Chip key={item.id} label={item.name} color={category === item.id ? 'primary' : 'default'} onClick={() => changeCategory(item.id)} aria-pressed={category === item.id} />)}
      </Box>
    </Box>
    <Stack direction="row" spacing={1} sx={{ mb: 2, alignItems: 'center', justifyContent: 'space-between' }}>
      <Typography variant="body2" role="status" aria-live="polite">{loading ? 'Chargement…' : `${results.length} recette${results.length > 1 ? 's' : ''}`}</Typography>
      <TextField select size="small" label="Trier" value={sort} onChange={event => setSort(event.target.value)} sx={{ minWidth: 150 }}><MenuItem value="name">Nom A → Z</MenuItem><MenuItem value="time">Les plus rapides</MenuItem></TextField>
    </Stack>
    <Chip label="30 min ou moins" variant={quick ? 'filled' : 'outlined'} color={quick ? 'primary' : 'default'} onClick={() => setQuick(value => !value)} aria-pressed={quick} sx={{ minHeight: 44, mb: 2 }} />
    {error && <Alert severity="error">{error}</Alert>}
    {!loading && results.length === 0 && <Box sx={{ textAlign: 'center', py: 5 }}><Typography variant="h5">Rien pour cette recherche</Typography><Typography color="text.secondary" sx={{ my: 2 }}>Essaie un autre ingrédient ou une autre catégorie.</Typography><Button variant="outlined" onClick={clear}>Réinitialiser les filtres</Button></Box>}
    <Box sx={{ display: 'grid', gridTemplateColumns: { xs: 'repeat(2, minmax(0, 1fr))', sm: 'repeat(3, minmax(0, 1fr))', md: 'repeat(4, minmax(0, 1fr))' }, gap: { xs: 1.5, sm: 2.5 } }}>
      {loading && [0,1,2,3,4,5].map(key => <Skeleton key={key} variant="rounded" height={245} />)}
      {results.map(recipe => {
        const minutes = recipeMinutes(recipe), category = categoryFor(recipe.category)
        return <Card key={recipe.id} variant="outlined" sx={{ borderRadius: 3 }}>
          <CardActionArea aria-label={recipe.name} onClick={() => { sessionStorage.setItem('kousine.list-scroll', String(window.scrollY)); navigate(`/recipes/${recipe.id}`) }} sx={{ height: '100%', display: 'flex', flexDirection: 'column', alignItems: 'stretch', justifyContent: 'flex-start' }}>
            <RecipeImage src={recipe.image_url} name={recipe.name} category={recipe.category} height={{ xs: 110, sm: 145 }} />
            <CardContent sx={{ p: { xs: 1.5, sm: 2 }, flex: 1 }}>
              <Typography variant="overline" sx={{ color: 'text.secondary', fontSize: '.65rem', letterSpacing: '.06em', lineHeight: 1.5 }}>{category?.name ?? 'Mon carnet'}</Typography>
              <Typography component="h2" sx={{ fontWeight: 650, lineHeight: 1.4, fontSize: { xs: '.96rem', sm: '1.06rem' }, mt: .5, overflowWrap: 'anywhere' }}>{recipe.name}</Typography>
              <Stack direction="row" spacing={.5} alignItems="center" sx={{ mt: 1.5, color: 'text.secondary' }}><ScheduleIcon sx={{ fontSize: 16 }} /><Typography variant="caption">{minutes != null ? formatMinutes(minutes) : recipe.category === 'compotes' ? '10 min + cycle' : 'À ton rythme'}</Typography></Stack>
              <Typography variant="caption" color="text.secondary">{recipe.servings} portions</Typography>
            </CardContent>
          </CardActionArea>
        </Card>
      })}
    </Box>
    <DictionaryDialog open={dictionaryOpen} onClose={() => setDictionaryOpen(false)} />
  </Container>
}
