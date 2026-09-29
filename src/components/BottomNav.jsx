import { useLocation, useNavigate } from 'react-router-dom'
import {
  Paper,
  BottomNavigation,
  BottomNavigationAction,
} from '@mui/material'
import RestaurantMenuIcon from '@mui/icons-material/RestaurantMenu'
import FavoriteIcon from '@mui/icons-material/Favorite'
import HistoryIcon from '@mui/icons-material/History'
import AddCircleIcon from '@mui/icons-material/AddCircle'
import SettingsIcon from '@mui/icons-material/Settings'
import { useUser } from '../context/UserContext'

// height reserved at the bottom of the page so content never hides behind the nav
export const BOTTOM_NAV_HEIGHT = 68

const ROUTE_FOR_VALUE = ['/', '/favorites', '/recipes/new', '/history', '/catalogue']

export default function BottomNav() {
  const location = useLocation()
  const navigate = useNavigate()
  const { editing } = useUser()

  const currentIndex = location.pathname.startsWith('/recipes/') && location.pathname !== '/recipes/new' ? 0 : ROUTE_FOR_VALUE.findIndex((r) => r === location.pathname)

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
          sx={{ height: BOTTOM_NAV_HEIGHT, bgcolor: 'background.paper', maxWidth: 1000, mx: 'auto' }}
        >
          <BottomNavigationAction label="Recettes" icon={<RestaurantMenuIcon />} onClick={() => navigate('/')} />
          <BottomNavigationAction label="Favoris" icon={<FavoriteIcon />} onClick={() => navigate('/favorites')} />
          {editing && <BottomNavigationAction value={2} label="Ajouter" icon={<AddCircleIcon />} onClick={() => navigate('/recipes/new')} />}
          <BottomNavigationAction value={3} label="Historique" icon={<HistoryIcon />} onClick={() => navigate('/history')} />
          <BottomNavigationAction
            value={4}
            label="Catalogue"
            icon={<SettingsIcon />}
            onClick={() => navigate('/catalogue')}
          />
        </BottomNavigation>
      </Paper>

    </>
  )
}
