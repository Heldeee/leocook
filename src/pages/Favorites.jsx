import { useEffect, useState } from 'react'
import { Container, Typography, List, ListItemButton, ListItemText, Divider } from '@mui/material'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabaseClient'
import { useUser } from '../context/UserContext'

export default function Favorites() {
  const { currentUser: user } = useUser()
  const navigate = useNavigate()
  const [recipes, setRecipes] = useState([])

  useEffect(() => {
    async function load() {
      const { data } = await supabase
        .from('favorites')
        .select('created_at, recipes(id, name, servings)')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
      setRecipes(data ?? [])
    }
    if (user) load()
  }, [user])

  return (
    <Container maxWidth="sm" sx={{ py: 3, px: { xs: 2, sm: 3 } }}>
      <Typography variant="h4" sx={{ mb: 3 }}>
        Mes favoris
      </Typography>
      {recipes.length === 0 && <Typography color="text.secondary">Aucun favori pour l'instant.</Typography>}
      <List>
        {recipes.map((row, i) => (
          <div key={row.recipes?.id ?? i}>
            <ListItemButton onClick={() => navigate(`/recipes/${row.recipes?.id}`)}>
              <ListItemText primary={row.recipes?.name} secondary={`${row.recipes?.servings} portions`} />
            </ListItemButton>
            <Divider component="li" />
          </div>
        ))}
      </List>
    </Container>
  )
}
