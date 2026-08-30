import { useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import {
  Paper,
  BottomNavigation,
  BottomNavigationAction,
  Drawer,
  List,
  ListItemButton,
  ListItemText,
  Typography,
  Box,
} from '@mui/material'
import RestaurantMenuIcon from '@mui/icons-material/RestaurantMenu'
import FavoriteIcon from '@mui/icons-material/Favorite'
import HistoryIcon from '@mui/icons-material/History'
import AddCircleIcon from '@mui/icons-material/AddCircle'
import PersonIcon from '@mui/icons-material/Person'
import { useUser } from '../context/UserContext'

// height reserved at the bottom of the page so content never hides behind the nav
export const BOTTOM_NAV_HEIGHT = 68

const ROUTE_FOR_VALUE = ['/', '/favorites', '/recipes/new', '/history']

export default function BottomNav() {
  const location = useLocation()
  const navigate = useNavigate()
  const { users, currentUser, selectUser } = useUser()
  const [profileOpen, setProfileOpen] = useState(false)

  const currentIndex = ROUTE_FOR_VALUE.findIndex((r) => r === location.pathname)

  return (
    <>
      <Paper
        elevation={8}
        sx={{
          position: 'fixed',
          bottom: 0,
          left: 0,
          right: 0,
          zIndex: (theme) => theme.zIndex.appBar,
          borderTop: '1px solid',
          borderColor: 'divider',
          paddingBottom: 'env(safe-area-inset-bottom)',
        }}
      >
        <BottomNavigation
          value={currentIndex === -1 ? false : currentIndex}
          showLabels
          sx={{ height: BOTTOM_NAV_HEIGHT, bgcolor: 'background.paper' }}
        >
          <BottomNavigationAction label="Recettes" icon={<RestaurantMenuIcon />} onClick={() => navigate('/')} />
          <BottomNavigationAction label="Favoris" icon={<FavoriteIcon />} onClick={() => navigate('/favorites')} />
          <BottomNavigationAction label="Ajouter" icon={<AddCircleIcon />} onClick={() => navigate('/recipes/new')} />
          <BottomNavigationAction label="Historique" icon={<HistoryIcon />} onClick={() => navigate('/history')} />
          <BottomNavigationAction
            label={currentUser?.name ?? 'Profil'}
            icon={<PersonIcon />}
            onClick={() => setProfileOpen(true)}
          />
        </BottomNavigation>
      </Paper>

      <Drawer anchor="bottom" open={profileOpen} onClose={() => setProfileOpen(false)}>
        <Box sx={{ p: 2, pb: 'calc(env(safe-area-inset-bottom) + 16px)' }}>
          <Typography variant="h6" sx={{ mb: 1, px: 1 }}>
            Qui es-tu ?
          </Typography>
          <List>
            {users.map((u) => (
              <ListItemButton
                key={u.id}
                selected={u.id === currentUser?.id}
                onClick={() => {
                  selectUser(u.id)
                  setProfileOpen(false)
                }}
              >
                <ListItemText primary={u.name} />
              </ListItemButton>
            ))}
          </List>
        </Box>
      </Drawer>
    </>
  )
}
