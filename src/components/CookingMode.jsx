import { useEffect, useRef, useState } from 'react'
import { Alert, Box, Button, Dialog, DialogContent, IconButton, LinearProgress, Paper, Stack, Typography, useMediaQuery } from '@mui/material'
import CloseIcon from '@mui/icons-material/Close'
import PlayArrowIcon from '@mui/icons-material/PlayArrow'
import PauseIcon from '@mui/icons-material/Pause'
import RestartAltIcon from '@mui/icons-material/RestartAlt'
import IngredientChecklist from './IngredientChecklist'
import { clockLabel, secondsRemaining } from '../lib/recipePresentation'

export default function CookingMode({ recipe, ratio, checked, onToggle, onClose }) {
  const small = useMediaQuery(theme => theme.breakpoints.down('sm'))
  const [index, setIndex] = useState(() => {
    const remembered = Number(sessionStorage.getItem(`kousine.step.${recipe.id}`))
    return Number.isInteger(remembered) && remembered >= 0 && remembered < recipe.steps.length ? remembered : 0
  })
  const step = recipe.steps[index]
  const [remaining, setRemaining] = useState(() => step.duration_seconds ?? 0)
  const [running, setRunning] = useState(false)
  const [showIngredients, setShowIngredients] = useState(false)
  const [wakeActive, setWakeActive] = useState(false)
  const deadline = useRef(null)
  const progress = ((index + 1) / recipe.steps.length) * 100
  useEffect(() => {
    if (!running) return
    const update = () => {
      const value = secondsRemaining(deadline.current)
      setRemaining(value)
      if (value === 0) setRunning(false)
    }
    const interval = setInterval(update, 250)
    document.addEventListener('visibilitychange', update)
    return () => { clearInterval(interval); document.removeEventListener('visibilitychange', update) }
  }, [running])
  useEffect(() => {
    if (!navigator.wakeLock) return
    let alive = true, lock
    const request = async () => {
      if (document.visibilityState !== 'visible' || (lock && !lock.released)) return
      try {
        const acquired = await navigator.wakeLock.request('screen')
        if (!alive) { await acquired.release(); return }
        lock = acquired
        setWakeActive(true)
        lock.addEventListener('release', () => { if (alive) setWakeActive(false) })
      } catch { if (alive) setWakeActive(false) }
    }
    request()
    document.addEventListener('visibilitychange', request)
    return () => { alive = false; document.removeEventListener('visibilitychange', request); lock?.release().catch(() => {}) }
  }, [])
  const toggleTimer = () => {
    if (running) { setRemaining(secondsRemaining(deadline.current)); setRunning(false) }
    else { const seconds = remaining || step.duration_seconds; deadline.current = Date.now() + seconds * 1000; setRemaining(seconds); setRunning(true) }
  }
  const resetTimer = () => { setRunning(false); setRemaining(step.duration_seconds ?? 0); deadline.current = null }
  const chooseStep = next => {
    if (running && !window.confirm('Changer d’étape arrête le minuteur en cours. Continuer ?')) return
    setRunning(false); deadline.current = null
    setRemaining(recipe.steps[next].duration_seconds ?? 0)
    setIndex(next)
    sessionStorage.setItem(`kousine.step.${recipe.id}`, String(next))
    setShowIngredients(false)
  }
  const close = () => {
    if (running && !window.confirm('Quitter le mode cuisine arrête le minuteur. Continuer ?')) return false
    onClose()
    return true
  }
  const finish = () => { if (close()) sessionStorage.removeItem(`kousine.step.${recipe.id}`) }
  return <Dialog open onClose={close} fullScreen={small} maxWidth="md" fullWidth aria-labelledby="cooking-title" PaperProps={{ sx: { borderRadius: small ? 0 : 4, minHeight: small ? '100dvh' : 520 } }}>
    <Stack direction="row" sx={{ p: { xs: 2, sm: 3 }, pb: 1, alignItems: 'center', justifyContent: 'space-between' }}>
      <Box sx={{ minWidth: 0 }}><Typography variant="overline" color="primary">Mode cuisine</Typography><Typography id="cooking-title" sx={{ fontWeight: 650, fontSize: '1rem', overflowWrap: 'anywhere' }}>{recipe.name}</Typography></Box>
      <IconButton aria-label="Quitter le mode cuisine" onClick={close}><CloseIcon /></IconButton>
    </Stack>
    <DialogContent sx={{ px: { xs: 2, sm: 4 }, pb: 3 }}>
      <Stack direction="row" sx={{ mb: 1, justifyContent: 'space-between', alignItems: 'center' }}><Typography variant="body2">Étape {index + 1} sur {recipe.steps.length}</Typography><Button onClick={() => setShowIngredients(value => !value)}>{showIngredients ? 'Masquer' : 'Voir les ingrédients'}</Button></Stack>
      <LinearProgress aria-label="Progression des étapes" variant="determinate" value={progress} sx={{ height: 5, borderRadius: 3, mb: 3 }} />
      {showIngredients && <Paper variant="outlined" sx={{ p: 2, mb: 3 }}><IngredientChecklist ingredients={recipe.ingredients} ratio={ratio} checked={checked} onToggle={onToggle} /></Paper>}
      <Typography component="p" aria-live="polite" sx={{ fontFamily: 'Georgia, serif', fontSize: { xs: '1.4rem', sm: '1.8rem' }, lineHeight: 1.65, mb: 3, overflowWrap: 'anywhere' }} tabIndex={-1} key={step.id}>{step.instruction}</Typography>
      {step.duration_seconds > 0 && <Paper variant="outlined" sx={{ p: 2.5, textAlign: 'center', bgcolor: 'background.default' }}>
        <Typography variant="overline" color="text.secondary">Minuteur de cette étape</Typography>
        <Typography role="timer" aria-label="Temps restant" data-testid="timer" sx={{ fontSize: '3.2rem', fontVariantNumeric: 'tabular-nums', lineHeight: 1.4 }}>{clockLabel(remaining)}</Typography>
        <Stack direction="row" spacing={1} sx={{ justifyContent: 'center' }}><Button variant="contained" startIcon={running ? <PauseIcon /> : <PlayArrowIcon />} onClick={toggleTimer}>{running ? 'Pause' : remaining === 0 ? 'Relancer' : remaining < step.duration_seconds ? 'Reprendre' : 'Démarrer'}</Button><IconButton aria-label="Réinitialiser le minuteur" onClick={resetTimer}><RestartAltIcon /></IconButton></Stack>
        {remaining === 0 && <Alert severity="success" role="status" sx={{ mt: 2 }}>Temps écoulé. Vérifie la cuisson avant de continuer.</Alert>}
      </Paper>}
      <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 2 }}>{wakeActive ? 'Écran maintenu allumé pendant ce mode.' : 'Pour cuisiner longtemps, vérifie le verrouillage automatique de ton écran.'}</Typography>
    </DialogContent>
    <Stack direction="row" spacing={1.5} sx={{ p: { xs: 2, sm: 3 }, borderTop: '1px solid', borderColor: 'divider', bgcolor: 'background.paper', pb: 'max(16px, env(safe-area-inset-bottom))' }}>
      <Button variant="outlined" disabled={index === 0} onClick={() => chooseStep(index - 1)} sx={{ flex: 1 }}>Précédente</Button>
      {index < recipe.steps.length - 1 ? <Button variant="contained" onClick={() => chooseStep(index + 1)} sx={{ flex: 1 }}>Suivante</Button> : <Button variant="contained" onClick={finish} sx={{ flex: 1 }}>Terminer</Button>}
    </Stack>
  </Dialog>
}
