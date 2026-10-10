import { useState } from 'react'
import { Alert, Button, Container, FormControlLabel, Link, Paper, Stack, Switch, TextField, Typography } from '@mui/material'
import { useUser } from '../context/UserContext'
import { discardDraft, exportCatalogue, hasDraft, publishCatalogue, getCatalogueSource, testSheetsConnection, saveSheetsOverride, clearSheetsOverride } from '../lib/catalogue'

export default function CatalogueSettings() {
  const { editing, setEditing } = useUser()
  const [repository, setRepository] = useState('Heldeee/leocook')
  const [branch, setBranch] = useState('main')
  // Credentials stay in memory; never store them in the catalogue or browser storage.
  const [token, setToken] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [commitUrl, setCommitUrl] = useState('')
  const [draft, setDraft] = useState(hasDraft)
  const source = getCatalogueSource()
  const [sheetsUrl, setSheetsUrl] = useState(source.url)
  const [connectionMessage, setConnectionMessage] = useState('')
  const connect = async () => {
    setBusy(true); setError(''); setConnectionMessage('')
    try {
      const catalogue = await testSheetsConnection(sheetsUrl)
      saveSheetsOverride(sheetsUrl)
      setConnectionMessage(`${catalogue.recipes.length} recettes reçues. Recharge l’app pour utiliser Google Sheets sur cet appareil.`)
    } catch (error) { setError(`Connexion impossible : ${error.message} Vérifie le déploiement public et l’URL /exec.`) }
    finally { setBusy(false) }
  }
  const download = () => {
    const url = URL.createObjectURL(new Blob([exportCatalogue()], { type: 'application/json' }))
    const anchor = document.createElement('a')
    anchor.href = url
    anchor.download = 'catalogue.json'
    anchor.click()
    setTimeout(() => URL.revokeObjectURL(url), 1000)
  }
  const publish = async () => {
    setBusy(true); setError(''); setCommitUrl('')
    try { setCommitUrl(await publishCatalogue({ repository, branch, token })); setDraft(hasDraft()) }
    catch (error) { setError(error.message) }
    finally { setToken(''); setBusy(false) }
  }
  return <Container maxWidth="sm" sx={{ py: 3 }}><Stack spacing={3}>
    <Typography variant="h4">Mon catalogue</Typography>
    <Typography color="text.secondary">Les recettes sont accessibles sans compte. Tes favoris et ton historique restent sur cet appareil.</Typography>
    <Paper variant="outlined" sx={{ p: 3 }}><Stack spacing={2}>
      <Typography variant="h6">Source des recettes</Typography>
      <Typography color="text.secondary">{source.mode === 'sheets' ? (source.fallback ? 'Google Sheets configuré · copie JSON de secours affichée.' : 'Google Sheets connecté · recettes lues depuis le tableur.') : 'Catalogue JSON du site.'}</Typography>
      <TextField label="URL publique Apps Script (/exec)" type="url" value={sheetsUrl} onChange={event => setSheetsUrl(event.target.value)} disabled={busy} fullWidth />
      <Typography variant="body2" color="text.secondary">Teste ici ton déploiement Google. Cette connexion est propre à cet appareil. Pour l’activer pour tous, renseigne la même URL dans data/source.json du site une seule fois.</Typography>
      <Button variant="outlined" disabled={busy || !sheetsUrl.trim()} onClick={connect}>Tester et connecter Google Sheets</Button>
      <Button disabled={busy} onClick={() => { clearSheetsOverride(); window.location.reload() }}>Revenir à la configuration du site</Button>
      {connectionMessage && <Alert severity="success">{connectionMessage}<Button onClick={() => window.location.reload()}>Recharger l’app</Button></Alert>}
    </Stack></Paper>
    <Paper variant="outlined" sx={{ p: 3 }}><Stack spacing={2}>
      <FormControlLabel control={<Switch checked={editing} onChange={(_, value) => setEditing(value)} />} label="Activer le mode édition" />
      <Typography color="text.secondary">{source.mode === 'sheets' ? 'Le formulaire prépare un brouillon local exportable. Pour partager des recettes, ajoute-les dans Google Sheets ou demande-le dans un chat connecté à Google Drive. L’app n’écrit pas dans le tableur.' : 'Ajoute et modifie tes recettes depuis l’app. Les changements restent dans un brouillon sur cet appareil jusqu’à leur publication.'}</Typography>
      <Button variant="outlined" onClick={download} disabled={busy}>Exporter le catalogue JSON</Button>
      {draft && <Button color="error" disabled={busy} onClick={() => {
        if (window.confirm('Abandonner toutes les modifications locales ? Exporte le brouillon avant si tu veux le conserver.')) { discardDraft(); setDraft(false) }
      }}>Abandonner le brouillon</Button>}
    </Stack></Paper>
    {editing && source.mode !== 'sheets' && <Paper variant="outlined" sx={{ p: 3 }}><Stack spacing={2}>
      <Typography variant="h6">Publier mes recettes</Typography>
      <Typography color="text.secondary">La publication crée un commit dans ton dépôt. Sur la branche main, GitHub Actions met ensuite le site à jour. Toutes les recettes publiées sont publiques.</Typography>
      <TextField label="Dépôt GitHub" value={repository} onChange={event => setRepository(event.target.value)} disabled={busy} />
      <TextField label="Branche" value={branch} onChange={event => setBranch(event.target.value)} disabled={busy} />
      <TextField label="Token GitHub personnel" type="password" autoComplete="off" value={token} onChange={event => setToken(event.target.value)} disabled={busy} />
      <Typography variant="body2" color="text.secondary">Utilise un token à permissions fines limité à ce dépôt, avec « Contents: Read and write ». Il reste en mémoire et est effacé après chaque tentative de publication ou en quittant cet écran. Le mode édition seul ne donne aucun droit sur GitHub.</Typography>
      <Button variant="contained" disabled={!draft || !token.trim() || busy} onClick={publish}>{busy ? 'Publication…' : 'Publier sur GitHub'}</Button>
    </Stack></Paper>}
    {error && <Alert severity="error">{error}</Alert>}
    {commitUrl && <Alert severity="success">Catalogue enregistré sur GitHub. Le déploiement du site peut prendre quelques minutes. <Link href={commitUrl} target="_blank" rel="noopener noreferrer">Voir le commit</Link></Alert>}
  </Stack></Container>
}
