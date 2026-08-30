import { useEffect, useState } from 'react'
import { Container, Typography, List, ListItemButton, ListItemText, Divider } from '@mui/material'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabaseClient'
import { useUser } from '../context/UserContext'

export default function History() {
  const { currentUser: user } = useUser()
  const navigate = useNavigate()
  const [views, setViews] = useState([])

  useEffect(() => {
    async function load() {
      const { data } = await supabase
        .from('recipe_views')
        .select('viewed_at, recipes(id, name)')
        .eq('user_id', user.id)
        .order('viewed_at', { ascending: false })
        .limit(50)
      setViews(data ?? [])
    }
    if (user) load()
  }, [user])

  return (
    <Container maxWidth="sm" sx={{ py: 3, px: { xs: 2, sm: 3 } }}>
      <Typography variant="h4" sx={{ mb: 3 }}>
        Historique
      </Typography>
      {views.length === 0 && <Typography color="text.secondary">Pas encore d'historique.</Typography>}
      <List>
        {views.map((row, i) => (
          <div key={i}>
            <ListItemButton onClick={() => navigate(`/recipes/${row.recipes?.id}`)}>
              <ListItemText
                primary={row.recipes?.name}
                secondary={new Date(row.viewed_at).toLocaleString('fr-FR')}
              />
            </ListItemButton>
            <Divider component="li" />
          </div>
        ))}
      </List>
    </Container>
  )
}
