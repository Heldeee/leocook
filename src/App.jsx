import { BrowserRouter, Routes, Route } from 'react-router-dom'
import { Box } from '@mui/material'
import { UserProvider } from './context/UserContext'
import BottomNav, { BOTTOM_NAV_HEIGHT } from './components/BottomNav'
import RecipeList from './pages/RecipeList'
import RecipeForm from './pages/RecipeForm'
import RecipePreview from './pages/RecipePreview'
import RecipeDetail from './pages/RecipeDetail'
import RecipeEdit from './pages/RecipeEdit'
import Favorites from './pages/Favorites'
import History from './pages/History'
import Auth from './pages/Auth'
import { useUser } from './context/UserContext'

function AppContent() {
  const { session, loading } = useUser()
  if (loading) return null
  if (!session) return <Auth />
  return <><Box sx={{ pb: `calc(${BOTTOM_NAV_HEIGHT}px + env(safe-area-inset-bottom))` }}><Routes>
    <Route path="/" element={<RecipeList />} /><Route path="/recipes/new" element={<RecipeForm />} /><Route path="/recipes/preview" element={<RecipePreview />} /><Route path="/recipes/:id/edit" element={<RecipeEdit />} /><Route path="/recipes/:id" element={<RecipeDetail />} /><Route path="/favorites" element={<Favorites />} /><Route path="/history" element={<History />} />
  </Routes></Box><BottomNav /></>
}

export default function App() {
  return (
    <BrowserRouter basename={import.meta.env.BASE_URL}>
      <UserProvider>
        <AppContent />
      </UserProvider>
    </BrowserRouter>
  )
}
