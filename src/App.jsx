import { lazy, Suspense, useEffect, useState } from 'react'
import { HashRouter, Routes, Route, useLocation } from 'react-router-dom'
import { Alert, Box, Button, Container, Typography } from '@mui/material'
import { UserProvider } from './context/UserContext'
import BottomNav, { BOTTOM_NAV_HEIGHT } from './components/BottomNav'
import RecipeList from './pages/RecipeList'
const RecipeForm = lazy(() => import('./pages/RecipeForm'))
const RecipePreview = lazy(() => import('./pages/RecipePreview'))
const RecipeDetail = lazy(() => import('./pages/RecipeDetail'))
const RecipeEdit = lazy(() => import('./pages/RecipeEdit'))
const Favorites = lazy(() => import('./pages/Favorites'))
const History = lazy(() => import('./pages/History'))
const CatalogueSettings = lazy(() => import('./pages/CatalogueSettings'))
import { loadCatalogue, hasDraft, subscribeCatalogue, getCatalogueSource } from './lib/catalogue'

function AppContent() {
  const { pathname } = useLocation()
  const [ready, setReady] = useState(false)
  const [error, setError] = useState('')
  const [draft, setDraft] = useState(false)
  useEffect(() => { window.scrollTo(0, 0) }, [pathname])
  useEffect(() => {
    const unsubscribe = subscribeCatalogue(() => setDraft(hasDraft()))
    loadCatalogue().then(() => { setDraft(hasDraft()); setReady(true) }).catch(error => setError(error.message))
    return unsubscribe
  }, [])
  if (error) return <Container sx={{ py: 4 }}><Alert severity="error">{error}</Alert><Button onClick={() => window.location.reload()}>Réessayer</Button></Container>
  if (!ready) return <Container sx={{ py: 4 }}><Typography>Chargement du catalogue…</Typography></Container>
  const source = getCatalogueSource()
  return <><Box sx={{ pb: `calc(${BOTTOM_NAV_HEIGHT}px + env(safe-area-inset-bottom))` }}>
    {source.warning && <Alert severity="warning">{source.warning}</Alert>}
    {source.staleDraft && <Alert severity="warning">Ton ancien brouillon est conservé pour export dans Catalogue. Le catalogue à jour est affiché.</Alert>}
    {draft && <Alert severity="info">{source.mode === 'sheets' ? 'Brouillon sur cet appareil — export disponible dans Catalogue. Les recettes partagées se gèrent dans Sheets.' : 'Brouillon sur cet appareil — publication disponible dans Catalogue.'}</Alert>}
    <Suspense fallback={<Container sx={{ py: 4 }}>Chargement…</Container>}><Routes>
    <Route path="/" element={<RecipeList />} /><Route path="/recipes/new" element={<RecipeForm />} /><Route path="/recipes/preview" element={<RecipePreview />} /><Route path="/recipes/:id/edit" element={<RecipeEdit />} /><Route path="/recipes/:id" element={<RecipeDetail />} /><Route path="/favorites" element={<Favorites />} /><Route path="/history" element={<History />} />
    <Route path="/catalogue" element={<CatalogueSettings />} />
    <Route path="*" element={<Container sx={{ py: 4 }}>Page introuvable.</Container>} />
  </Routes></Suspense></Box><BottomNav /></>
}

export default function App() {
  return (
    <HashRouter>
      <UserProvider>
        <AppContent />
      </UserProvider>
    </HashRouter>
  )
}
