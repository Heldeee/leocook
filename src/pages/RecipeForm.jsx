import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useLocation, useNavigate, useParams } from 'react-router-dom'
import {
  Container,
  Typography,
  TextField,
  Button,
  Box,
  IconButton,
  Autocomplete,
  Chip,
  Stack,
  Alert,
  Paper,
  MenuItem,
} from '@mui/material'
import AddIcon from '@mui/icons-material/Add'
import DeleteIcon from '@mui/icons-material/Delete'
import PhotoCameraIcon from '@mui/icons-material/PhotoCamera'
import ArrowUpwardIcon from '@mui/icons-material/ArrowUpward'
import ArrowDownwardIcon from '@mui/icons-material/ArrowDownward'
import PreviewIcon from '@mui/icons-material/Preview'

import { referenceData, getRecipe, saveRecipe as saveCatalogueRecipe } from '../lib/catalogue'
import { useUser } from '../context/UserContext'
import RecipeImage from '../components/RecipeImage'
import { CATEGORIES } from '../lib/recipePresentation'

const emptyIngredientRow = () => ({
  ingredientName: '',
  quantity: '',
  unitId: '',
})

const emptyStepRow = () => ({
  instruction: '',
  durationMinutes: '',
})

function FormSection({ title, children }) {
  return (
    <Paper
      variant="outlined"
      sx={{
        p: { xs: 2, sm: 3 },
        borderRadius: 2,
      }}
    >
      <Typography variant="subtitle1" fontWeight={600} sx={{ mb: 2 }}>
        {title}
      </Typography>

      <Stack spacing={2}>
        {children}
      </Stack>
    </Paper>
  )
}

export default function RecipeForm({ editMode = false }) {
  const { currentUser: user, editing } = useUser()
  const navigate = useNavigate()
  const { id } = useParams()
  const location = useLocation()

  const [name, setName] = useState('')
  const [category, setCategory] = useState('')
  const [description, setDescription] = useState('')
  const [notes, setNotes] = useState('')
  const [prepMinutes, setPrepMinutes] = useState('')
  const [cookMinutes, setCookMinutes] = useState('')
  const [servings, setServings] = useState(4)
  const [imageFile, setImageFile] = useState(null)
  const [imagePreview, setImagePreview] = useState(null)
  const [existingImageUrl, setExistingImageUrl] = useState(null)


  const [units, setUnits] = useState([])
  const [existingIngredients, setExistingIngredients] = useState([])
  const [ingredientRows, setIngredientRows] = useState([
    emptyIngredientRow(),
  ])

  const [existingTags, setExistingTags] = useState([])
  const [selectedTags, setSelectedTags] = useState([])

  const [stepRows, setStepRows] = useState([
    emptyStepRow(),
  ])

  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [initialLoading, setInitialLoading] = useState(editMode)

  /*
   * ------------------------------------------------------------
   * Chargement des dictionnaires
   * ------------------------------------------------------------
   */

  useEffect(() => {
    if (!user) return

    async function loadReferenceData() {
      const { units: unitRows, ingredients: ingredientRowsData, tags: tagRows } = await referenceData()

      setUnits(unitRows ?? [])
      setExistingIngredients(ingredientRowsData ?? [])
      setExistingTags(tagRows ?? [])
    }

    loadReferenceData()
  }, [user])

  /*
   * ------------------------------------------------------------
   * Chargement recette en modification
   * ------------------------------------------------------------
   */

  useEffect(() => {
    if (!editMode || !id || !user || location.state?.recipe || location.state?.confirmRecipe) return

    async function loadRecipe() {
      setInitialLoading(true)

      try {
        const recipe = await getRecipe(id)
        setName(recipe.name)
        setCategory(recipe.category ?? '')
        setDescription(recipe.description ?? '')
        setNotes(recipe.notes ?? '')
        setPrepMinutes(recipe.prep_minutes ?? '')
        setCookMinutes(recipe.cook_minutes ?? '')
        setServings(recipe.servings)
        setExistingImageUrl(recipe.image_url)
        setIngredientRows(recipe.ingredients.map(row => ({
          ingredientName: row.ingredients?.name ?? '', quantity: row.quantity ?? '', unitId: row.unit_id ?? '',
        })))
        setSelectedTags(recipe.tags)
        const steps = recipe.steps
        setStepRows(
          (steps ?? []).map((step) => ({
            instruction: step.instruction,
            durationMinutes: step.duration_seconds
              ? step.duration_seconds / 60
              : '',
          }))
        )
      } catch (err) {
        setError(err.message)
      } finally {
        setInitialLoading(false)
      }
    }

    loadRecipe()
  }, [editMode, id, user, location.state?.recipe, location.state?.confirmRecipe])

  useEffect(() => {
    const restored = location.state?.recipe ?? location.state?.confirmRecipe
    if (!restored) return
    setName(restored.name)
    setCategory(restored.category ?? '')
    setDescription(restored.description ?? '')
    setNotes(restored.notes ?? '')
    setPrepMinutes(restored.prep_minutes ?? '')
    setCookMinutes(restored.cook_minutes ?? '')
    setServings(restored.servings)
    setImageFile(restored.imageFile ?? null)
    setExistingImageUrl(restored.imageFile ? null : restored.imageUrl)
    setIngredientRows(restored.ingredients.map(row => ({ ingredientName: row.ingredientName, quantity: row.quantity, unitId: row.unitId })))
    setSelectedTags(restored.tags)
    setStepRows(restored.steps.map(step => ({ instruction: step.instruction, durationMinutes: step.durationMinutes ?? '' })))
    setInitialLoading(false)
  }, [location.state?.recipe, location.state?.confirmRecipe])

  /*
   * ------------------------------------------------------------
   * Image
   * ------------------------------------------------------------
   */

  useEffect(() => {
    if (!imageFile) {
      setImagePreview(existingImageUrl)
      return
    }

    const url = URL.createObjectURL(imageFile)
    setImagePreview(url)

    return () => URL.revokeObjectURL(url)
  }, [imageFile, existingImageUrl])

  /*
   * ------------------------------------------------------------
   * Champs
   * ------------------------------------------------------------
   */

  const updateIngredientRow = (index, field, value) => {
    setIngredientRows((rows) =>
      rows.map((row, i) =>
        i === index
          ? { ...row, [field]: value }
          : row
      )
    )
  }

  const updateStepRow = (index, field, value) => {
    setStepRows((rows) =>
      rows.map((row, i) =>
        i === index
          ? { ...row, [field]: value }
          : row
      )
    )
  }

  /*
   * ------------------------------------------------------------
   * Autocomplétion ingrédients
   * ------------------------------------------------------------
   */

  const ingredientOptions = useMemo(() => {
    return existingIngredients.map((ingredient) => ingredient.name)
  }, [existingIngredients])

  const moveStep = (from, to) => {
    if (from === to) return

    setStepRows((rows) => {
      const copy = [...rows]
      const [moved] = copy.splice(from, 1)
      copy.splice(to, 0, moved)
      return copy
    })
  }

  /*
   * ------------------------------------------------------------
   * Préparation des données pour la preview
   * ------------------------------------------------------------
   */

  const buildPreviewData = () => ({
    id: editMode ? id : null,
    name: name.trim(),
    category, description, notes,
    prep_minutes: prepMinutes === '' ? undefined : Number(prepMinutes),
    cook_minutes: cookMinutes === '' ? (category === 'compotes' ? null : undefined) : Number(cookMinutes),
    servings: Number(servings) || 1,
    imageUrl: imagePreview,
    imageFile,



    ingredients: ingredientRows
      .filter(
        (row) =>
          row.ingredientName.trim() &&
          row.quantity !== '' && row.quantity != null &&
          row.unitId
      )
      .map((row) => {
        const unit = units.find(
          (u) => u.id === row.unitId
        )

        return {
          quantity: row.quantity,
          unitId: row.unitId,
          unitLabel: unit?.abbreviation ?? '',
          ingredientName: row.ingredientName.trim(),
        }
      }),

    tags: selectedTags,

    steps: stepRows
      .filter((step) => step.instruction.trim())
      .map((step) => ({
        instruction: step.instruction.trim(),
        durationMinutes: step.durationMinutes,
        duration_seconds: step.durationMinutes
          ? Math.round(
            Number(step.durationMinutes) * 60
          )
          : null,
      })),
  })

  /*
   * ------------------------------------------------------------
   * Preview
   * ------------------------------------------------------------
   */

  const handlePreview = (e) => {
    e.preventDefault()
    setError('')

    if (!name.trim()) {
      setError('Donne un nom à la recette.')
      return
    }


    if (!Number.isInteger(Number(servings)) || Number(servings) < 1 || Number(servings) > 24) { setError('Choisis entre 1 et 24 portions entières.'); return }
    if (ingredientRows.some(row => (row.ingredientName.trim() || row.quantity !== '' || row.unitId) && (!row.ingredientName.trim() || row.quantity === '' || !row.unitId || !Number.isFinite(Number(row.quantity)) || Number(row.quantity) < 0))) { setError('Complète le nom, la quantité et l’unité de chaque ingrédient, ou supprime la ligne incomplète.'); return }
    navigate('/recipes/preview', {
      state: {
        recipe: buildPreviewData(),
        editMode,
      },
    })
  }

  /*
   * ------------------------------------------------------------
   * Sauvegarde définitive
   * ------------------------------------------------------------
   */

  const saveRecipe = useCallback(async (previewData) => {
    setLoading(true)
    setError('')

    try {
      if (!editing) throw new Error('Active le mode édition depuis Catalogue.')
      const recipeId = await saveCatalogueRecipe(previewData, editMode)
      navigate(`/recipes/${recipeId}`)
    } catch (err) {
      console.error(
        'Erreur sauvegarde recette:',
        err
      )

      setError(
        err?.message ||
        'Erreur lors de la sauvegarde de la recette.'
      )
    } finally {
      setLoading(false)
      setInitialLoading(false)
    }
  }, [editing, editMode, navigate])

  /*
   * Permet à RecipePreview de confirmer.
   */
  const confirmationStarted = useRef(false)
  useEffect(() => {
    const confirmation = location.state?.confirmRecipe

    if (!confirmation || confirmationStarted.current) return
    confirmationStarted.current = true

    navigate(location.pathname, {
      replace: true,
      state: {},
    })

    saveRecipe(confirmation)
  }, [location.state?.confirmRecipe, location.pathname, navigate, saveRecipe])

  if (!editing) {
    return (
      <Container
        maxWidth="sm"
        sx={{ py: 4, px: 2 }}
      >
        <Alert severity="warning">
          Active le mode édition depuis l’onglet Catalogue.
        </Alert>
      </Container>
    )
  }

  if (initialLoading) {
    return (
      <Container sx={{ py: 4 }}>
        Chargement...
      </Container>
    )
  }

  return (
    <Container
      maxWidth="sm"
      disableGutters
      sx={{
        px: { xs: 1.5, sm: 3 },
        py: 3,
      }}
    >
      <Typography
        variant="h5"
        sx={{ mb: 3 }}
      >
        {editMode
          ? 'Modifier la recette'
          : 'Nouvelle recette'}
      </Typography>

      <Alert severity="info" sx={{ mb: 2 }}>Enregistrement sur cet appareil. Publie ensuite ton brouillon depuis Catalogue pour le partager.</Alert>

      {error && (
        <Alert
          severity="error"
          sx={{ mb: 2 }}
        >
          {error}
        </Alert>
      )}

      <Box
        component="form"
        onSubmit={handlePreview}
      >
        <Stack spacing={2.5}>
          <FormSection title="Informations">
            <TextField
              label="Nom de la recette"
              value={name}
              onChange={(e) =>
                setName(e.target.value)
              }
              required
              fullWidth
            />

            <TextField select fullWidth label="Catégorie" value={category} onChange={event => setCategory(event.target.value)}>
              <MenuItem value="">Mon carnet</MenuItem>
              {CATEGORIES.map(item => <MenuItem key={item.id} value={item.id}>{item.title}</MenuItem>)}
            </TextField>
            <TextField label="Description" value={description} onChange={event => setDescription(event.target.value)} multiline minRows={2} fullWidth />
            <Stack direction="row" spacing={1.5}>
              <TextField label="Préparation (min)" type="number" value={prepMinutes} onChange={event => setPrepMinutes(event.target.value)} inputProps={{ min: 0, step: 1 }} fullWidth />
              <TextField label="Cuisson (min)" type="number" value={cookMinutes} onChange={event => setCookMinutes(event.target.value)} inputProps={{ min: 0, step: 1 }} fullWidth />
            </Stack>
            <TextField label="Conseils et matériel" value={notes} onChange={event => setNotes(event.target.value)} multiline minRows={2} fullWidth />
            <TextField
              label="Portions"
              type="number"
              value={servings}
              onChange={(e) =>
                setServings(e.target.value)
              }
              inputProps={{ min: 1, max: 24, step: 1 }}
              fullWidth
            />


            <Box>
              <RecipeImage
                src={imagePreview}
                name={name || 'Aperçu'}
                height={160}
                borderRadius={2}
              />

              <Button
                fullWidth
                variant="outlined"
                component="label"
                startIcon={
                  <PhotoCameraIcon />
                }
                sx={{ mt: 1.5 }}
              >
                {imageFile
                  ? imageFile.name
                  : 'Ajouter une photo'}

                <input
                  type="file"
                  accept="image/*"
                  hidden
                  onChange={(e) =>
                    setImageFile(
                      e.target.files?.[0] ??
                      null
                    )
                  }
                />
              </Button>
            </Box>
          </FormSection>

          <FormSection title="Ingrédients">
            {ingredientRows.map(
              (row, i) => (
                <Box
                  key={i}
                  sx={{
                    p: 1.5,
                    border: '1px solid',
                    borderColor:
                      'divider',
                    borderRadius: 2,
                  }}
                >
                  <Stack spacing={1.5}>
                    <Autocomplete
                      freeSolo
                      fullWidth
                      options={
                        row.ingredientName.length >= 3
                          ? ingredientOptions
                          : []
                      }
                      inputValue={
                        row.ingredientName
                      }
                      onInputChange={(
                        _,
                        value
                      ) =>
                        updateIngredientRow(
                          i,
                          'ingredientName',
                          value
                        )
                      }
                      renderInput={(
                        params
                      ) => (
                        <TextField
                          {...params}
                          label="Ingrédient"
                          placeholder="Ex. tomate"
                          fullWidth
                        />
                      )}
                    />

                    <Stack
                      direction="row"
                      spacing={1}
                      alignItems="center"
                    >
                      <TextField
                        label="Quantité"
                        type="number"
                        value={
                          row.quantity
                        }
                        onChange={(e) =>
                          updateIngredientRow(
                            i,
                            'quantity',
                            e.target.value
                          )
                        }
                        sx={{
                          flex: 1,
                        }}
                      />

                      <Autocomplete
                        sx={{
                          flex: 1,
                        }}
                        options={units}
                        getOptionLabel={(
                          unit
                        ) =>
                          unit.abbreviation
                        }
                        value={
                          units.find(
                            (u) =>
                              u.id ===
                              row.unitId
                          ) ?? null
                        }
                        onChange={(
                          _,
                          value
                        ) =>
                          updateIngredientRow(
                            i,
                            'unitId',
                            value?.id ??
                            ''
                          )
                        }
                        renderInput={(
                          params
                        ) => (
                          <TextField
                            {...params}
                            label="Unité"
                          />
                        )}
                      />

                      <IconButton
                        aria-label={`Supprimer l’ingrédient ${i + 1}`}
                        color="error"
                        onClick={() =>
                          setIngredientRows(
                            (rows) =>
                              rows.filter(
                                (
                                  _,
                                  index
                                ) =>
                                  index !==
                                  i
                              )
                          )
                        }
                      >
                        <DeleteIcon />
                      </IconButton>
                    </Stack>
                  </Stack>
                </Box>
              )
            )}

            <Button
              startIcon={<AddIcon />}
              onClick={() =>
                setIngredientRows(
                  (rows) => [
                    ...rows,
                    emptyIngredientRow(),
                  ]
                )
              }
            >
              Ajouter un ingrédient
            </Button>
          </FormSection>

          <FormSection title="Tags">
            <Autocomplete
              multiple
              freeSolo
              options={existingTags}
              getOptionLabel={(tag) =>
                typeof tag === 'string'
                  ? tag
                  : tag.name
              }
              value={selectedTags}
              onChange={(
                _,
                values
              ) =>
                setSelectedTags(
                  values.map((value) =>
                    typeof value ===
                      'string'
                      ? {
                        name: value,
                      }
                      : value
                  )
                )
              }
              renderTags={(
                value,
                getTagProps
              ) =>
                value.map(
                  (tag, index) => (
                    <Chip
                      label={tag.name}
                      {...getTagProps({
                        index,
                      })}
                      key={
                        tag.id ??
                        `${tag.name}-${index}`
                      }
                    />
                  )
                )
              }
              renderInput={(
                params
              ) => (
                <TextField
                  {...params}
                  label="Tags"
                  placeholder="dessert, rapide..."
                />
              )}
            />
          </FormSection>

          <FormSection title="Étapes">
            {stepRows.map((step, i) => <Box key={i} sx={{ p: 2, border: '1px solid', borderColor: 'divider', borderRadius: 2 }}>
              <Stack direction="row" sx={{ mb: 1, alignItems: 'center', justifyContent: 'space-between' }}>
                <Typography sx={{ fontWeight: 650 }}>Étape {i + 1}</Typography>
                <Stack direction="row">
                  <IconButton aria-label={`Monter l’étape ${i + 1}`} disabled={i === 0} onClick={() => moveStep(i, i - 1)}><ArrowUpwardIcon /></IconButton>
                  <IconButton aria-label={`Descendre l’étape ${i + 1}`} disabled={i === stepRows.length - 1} onClick={() => moveStep(i, i + 1)}><ArrowDownwardIcon /></IconButton>
                  <IconButton aria-label={`Supprimer l’étape ${i + 1}`} color="error" onClick={() => setStepRows(rows => rows.filter((_, index) => index !== i))}><DeleteIcon /></IconButton>
                </Stack>
              </Stack>
              <TextField label="Instruction" value={step.instruction} onChange={event => updateStepRow(i, 'instruction', event.target.value)} multiline minRows={2} fullWidth />
              <TextField label="Minuteur (min)" type="number" value={step.durationMinutes} onChange={event => updateStepRow(i, 'durationMinutes', event.target.value)} inputProps={{ min: 0, step: 1 }} helperText="Facultatif, démarré manuellement en mode cuisine." sx={{ mt: 2, width: '100%' }} />
            </Box>)}
            <Button startIcon={<AddIcon />} onClick={() => setStepRows(rows => [...rows, emptyStepRow()])}>Ajouter une étape</Button>
          </FormSection>

          <Button
            type="submit"
            variant="contained"
            size="large"
            startIcon={<PreviewIcon />}
            disabled={loading}
            sx={{ py: 1.5 }}
          >
            Prévisualiser
          </Button>
        </Stack>
      </Box>
    </Container>
  )
}
