import { useEffect, useState, useCallback } from 'react'
import {
  Box,
  Container,
  Card,
  CardActionArea,
  CardContent,
  Typography,
  TextField,
  Chip,
  Stack,
  InputAdornment,
  IconButton,
} from '@mui/material'
import SearchIcon from '@mui/icons-material/Search'
import ScheduleIcon from '@mui/icons-material/Schedule'
import SettingsIcon from '@mui/icons-material/Settings'
import DictionaryDialog from '../components/DictionaryDialog'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabaseClient'
import RecipeImage from '../components/RecipeImage'
import { totalMinutes, formatMinutes } from '../utils/time'

export default function RecipeList() {
  const navigate = useNavigate()
  const [recipes, setRecipes] = useState([])
  const [allTags, setAllTags] = useState([])
  const [keyword, setKeyword] = useState('')
  const [activeTag, setActiveTag] = useState(null)
  const [loading, setLoading] = useState(true)
  const [dictionaryOpen, setDictionaryOpen] = useState(false)

  const fetchTags = useCallback(async () => {
    const { data } = await supabase.from('tags').select('id, name').order('name')
    setAllTags(data ?? [])
  }, [])

  const fetchRecipes = useCallback(async () => {
    setLoading(true)
    let query = supabase
      .from('recipes')
      .select('id, name, image_url, servings, recipe_tags(tag_id, tags(id, name)), recipe_steps(duration_seconds)')
      .order('created_at', { ascending: false })

    if (keyword.trim()) {
      query = query.ilike('name', `%${keyword.trim()}%`)
    }

    const { data, error } = await query
    if (!error) {
      let results = data ?? []
      if (activeTag) {
        results = results.filter((r) => r.recipe_tags?.some((rt) => rt.tag_id === activeTag))
      }
      setRecipes(results)
    }
    setLoading(false)
  }, [keyword, activeTag])

  useEffect(() => {
    fetchTags()
  }, [fetchTags])

  useEffect(() => {
    const timeout = setTimeout(fetchRecipes, 250) // debounce keyword typing
    return () => clearTimeout(timeout)
  }, [fetchRecipes])

  return (
    <Container maxWidth="lg" sx={{ py: 3, px: { xs: 2, sm: 3 } }}>
      <Stack
        direction="row"
        spacing={1}
        sx={{ mb: 2 }}
      >
        <TextField
          placeholder="Chercher une recette..."
          fullWidth
          value={keyword}
          onChange={(e) =>
            setKeyword(e.target.value)
          }
          InputProps={{
            startAdornment: (
              <InputAdornment position="start">
                <SearchIcon />
              </InputAdornment>
            ),
          }}
        />

        <IconButton
          onClick={() =>
            setDictionaryOpen(true)
          }
          sx={{
            border: '1px solid',
            borderColor: 'divider',
            borderRadius: 2,
          }}
        >
          <SettingsIcon />
        </IconButton>
      </Stack>

      <DictionaryDialog
        open={dictionaryOpen}
        onClose={() =>
          setDictionaryOpen(false)
        }
      />

      {allTags.length > 0 && (
        <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap', mb: 3, overflowX: 'auto', pb: 0.5 }}>
          <Chip
            label="Tous"
            onClick={() => setActiveTag(null)}
            color={activeTag === null ? 'primary' : 'default'}
          />
          {allTags.map((tag) => (
            <Chip
              key={tag.id}
              label={tag.name}
              onClick={() => setActiveTag(tag.id)}
              color={activeTag === tag.id ? 'primary' : 'default'}
            />
          ))}
        </Box>
      )}

      {!loading && recipes.length === 0 && (
        <Typography color="text.secondary" sx={{ textAlign: 'center', mt: 6 }}>
          Aucune recette trouvée.
        </Typography>
      )}

      <Box
        sx={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fill, minmax(160px, 1fr))',
          gap: 2,
        }}
      >
        {recipes.map((recipe) => {
          const minutes = totalMinutes(recipe.recipe_steps)
          return (
            <Card key={recipe.id} variant="outlined" sx={{ overflow: 'hidden' }}>
              <CardActionArea onClick={() => navigate(`/recipes/${recipe.id}`)}>
                <RecipeImage src={recipe.image_url} name={recipe.name} height={140} />
                <CardContent sx={{ p: 1.5, '&:last-child': { pb: 1.5 } }}>
                  <Typography variant="subtitle1" fontWeight={600} noWrap>
                    {recipe.name}
                  </Typography>
                  <Stack direction="row" spacing={1.5} alignItems="center" sx={{ mt: 0.5 }}>
                    <Typography variant="caption" color="text.secondary">
                      {recipe.servings} pers.
                    </Typography>
                    {minutes > 0 && (
                      <Stack direction="row" spacing={0.3} alignItems="center">
                        <ScheduleIcon sx={{ fontSize: 14, color: 'text.secondary' }} />
                        <Typography variant="caption" color="text.secondary">
                          {formatMinutes(minutes)}
                        </Typography>
                      </Stack>
                    )}
                  </Stack>
                </CardContent>
              </CardActionArea>
            </Card>
          )
        })}
      </Box>
    </Container>
  )
}
