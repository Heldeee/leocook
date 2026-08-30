import { useEffect, useState, useRef, useCallback } from 'react'
import EditIcon from '@mui/icons-material/Edit'
import {
  useParams,
  useNavigate,
} from 'react-router-dom'
import {
  Container,
  Typography,
  Box,
  Chip,
  Stack,
  List,
  ListItem,
  ListItemText,
  Divider,
  IconButton,
  Button,
  Dialog,
  DialogContent,
  LinearProgress,
} from '@mui/material'
import FavoriteIcon from '@mui/icons-material/Favorite'
import FavoriteBorderIcon from '@mui/icons-material/FavoriteBorder'
import PlayCircleOutlineIcon from '@mui/icons-material/PlayCircleOutlined'
import ScheduleIcon from '@mui/icons-material/Schedule'
import { supabase } from '../lib/supabaseClient'
import { useUser } from '../context/UserContext'
import RecipeImage from '../components/RecipeImage'
import { totalMinutes, formatMinutes } from '../utils/time'

export default function RecipeDetail() {
  const { id } = useParams()
  const { currentUser: user } = useUser()
  const [recipe, setRecipe] = useState(null)
  const [ingredients, setIngredients] = useState([])
  const [steps, setSteps] = useState([])
  const [tags, setTags] = useState([])
  const [isFavorite, setIsFavorite] = useState(false)
  const [moulinexOpen, setMoulinexOpen] = useState(false)
  const navigate = useNavigate()

  const load = useCallback(async () => {
    const { data: recipeData } = await supabase.from('recipes').select('*').eq('id', id).single()
    setRecipe(recipeData)

    const { data: ingredientRows } = await supabase
      .from('recipe_ingredients')
      .select('quantity, ingredients(name), units(abbreviation)')
      .eq('recipe_id', id)
    setIngredients(ingredientRows ?? [])

    const { data: stepRows } = await supabase
      .from('recipe_steps')
      .select('*')
      .eq('recipe_id', id)
      .order('step_number')
    setSteps(stepRows ?? [])

    const { data: tagRows } = await supabase
      .from('recipe_tags')
      .select('tags(id, name)')
      .eq('recipe_id', id)
    setTags((tagRows ?? []).map((t) => t.tags))

    if (user) {
      const { data: favRow } = await supabase
        .from('favorites')
        .select('*')
        .eq('user_id', user.id)
        .eq('recipe_id', id)
        .maybeSingle()
      setIsFavorite(!!favRow)

      // log this view for the history page
      await supabase.from('recipe_views').insert({ user_id: user.id, recipe_id: id })
    }
  }, [id, user])

  useEffect(() => {
    load()
  }, [load])

  const toggleFavorite = async () => {
    if (!user) return
    if (isFavorite) {
      await supabase.from('favorites').delete().eq('user_id', user.id).eq('recipe_id', id)
    } else {
      await supabase.from('favorites').insert({ user_id: user.id, recipe_id: id })
    }
    setIsFavorite(!isFavorite)
  }

  if (!recipe) return null

  return (
    <Container maxWidth="md" disableGutters sx={{ py: 0 }}>
      <RecipeImage src={recipe.image_url} name={recipe.name} height={220} />

      <Box sx={{ px: { xs: 2, sm: 3 }, py: 3 }}>
        <Stack direction="row" alignItems="center" justifyContent="space-between">
          <Typography variant="h4" sx={{ wordBreak: 'break-word' }}>
            {recipe.name}
          </Typography>
          <IconButton onClick={toggleFavorite} color="secondary">
            {isFavorite ? <FavoriteIcon /> : <FavoriteBorderIcon />}
          </IconButton>
          <IconButton
            onClick={() =>
              navigate(`/recipes/${id}/edit`)
            }
          >
            <EditIcon />
          </IconButton>
        </Stack>

        <Stack direction="row" spacing={1} sx={{ my: 2, flexWrap: 'wrap', gap: 1 }}>
          {tags.map((tag) => (
            <Chip key={tag.id} label={tag.name} size="small" />
          ))}
        </Stack>

        <Stack direction="row" spacing={2} sx={{ mb: 3 }}>
          <Typography color="text.secondary">{recipe.servings} portions</Typography>
          {totalMinutes(steps) > 0 && (
            <Stack direction="row" spacing={0.5} alignItems="center">
              <ScheduleIcon sx={{ fontSize: 18, color: 'text.secondary' }} />
              <Typography color="text.secondary">{formatMinutes(totalMinutes(steps))}</Typography>
            </Stack>
          )}
        </Stack>

        <Typography variant="h6" sx={{ mb: 1 }}>
          Ingrédients
        </Typography>
        <List dense>
          {ingredients.map((row, i) => (
            <ListItem key={i} disableGutters>
              <ListItemText primary={`${row.quantity} ${row.units?.abbreviation} — ${row.ingredients?.name}`} />
            </ListItem>
          ))}
        </List>

        <Divider sx={{ my: 3 }} />

        <Stack direction="row" alignItems="center" justifyContent="space-between" sx={{ mb: 1 }}>
          <Typography variant="h6">Étapes</Typography>
          <Button
            startIcon={<PlayCircleOutlineIcon />}
            variant="contained"
            onClick={() => setMoulinexOpen(true)}
            disabled={steps.length === 0}
          >
            Mode guidé
          </Button>
        </Stack>
        <List>
          {steps.map((step) => (
            <ListItem key={step.id} alignItems="flex-start" disableGutters>
              <ListItemText
                primary={`${step.step_number}. ${step.instruction}`}
                secondary={step.duration_seconds ? `${Math.round(step.duration_seconds / 60)} min` : null}
              />
            </ListItem>
          ))}
        </List>

        <MoulinexDialog open={moulinexOpen} onClose={() => setMoulinexOpen(false)} steps={steps} />
      </Box>
    </Container>
  )
}

// --- "Moulinex mode": one step at a time, with an optional countdown timer ---
function MoulinexDialog({ open, onClose, steps }) {
  const [index, setIndex] = useState(0)
  const [secondsLeft, setSecondsLeft] = useState(null)
  const intervalRef = useRef(null)

  const step = steps[index]

  useEffect(() => {
    if (!open) return
    setIndex(0)
  }, [open])

  useEffect(() => {
    clearInterval(intervalRef.current)
    setSecondsLeft(step?.duration_seconds ?? null)
    if (step?.duration_seconds) {
      intervalRef.current = setInterval(() => {
        setSecondsLeft((s) => {
          if (s <= 1) {
            clearInterval(intervalRef.current)
            return 0
          }
          return s - 1
        })
      }, 1000)
    }
    return () => clearInterval(intervalRef.current)
  }, [step])

  if (!step) return null

  const progress = step.duration_seconds ? ((step.duration_seconds - secondsLeft) / step.duration_seconds) * 100 : 0

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogContent sx={{ py: 5, textAlign: 'center' }}>
        <Typography variant="overline" color="text.secondary">
          Étape {index + 1} / {steps.length}
        </Typography>
        <Typography variant="h5" sx={{ my: 3 }}>
          {step.instruction}
        </Typography>

        {step.duration_seconds != null && (
          <Box sx={{ my: 3 }}>
            <Typography variant="h2">
              {Math.floor(secondsLeft / 60)}:{String(secondsLeft % 60).padStart(2, '0')}
            </Typography>
            <LinearProgress variant="determinate" value={progress} sx={{ mt: 2, height: 8, borderRadius: 4 }} />
          </Box>
        )}

        <Stack direction="row" spacing={2} justifyContent="center" sx={{ mt: 4 }}>
          <Button disabled={index === 0} onClick={() => setIndex((i) => i - 1)}>
            Précédent
          </Button>
          {index < steps.length - 1 ? (
            <Button variant="contained" onClick={() => setIndex((i) => i + 1)}>
              Étape suivante
            </Button>
          ) : (
            <Button variant="contained" color="secondary" onClick={onClose}>
              Terminé
            </Button>
          )}
        </Stack>
      </DialogContent>
    </Dialog>
  )
}
