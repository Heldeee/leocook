import { useEffect, useMemo, useState } from 'react'
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
  ToggleButtonGroup,
  ToggleButton,
} from '@mui/material'
import AddIcon from '@mui/icons-material/Add'
import DeleteIcon from '@mui/icons-material/Delete'
import PhotoCameraIcon from '@mui/icons-material/PhotoCamera'
import DragIndicatorIcon from '@mui/icons-material/DragIndicator'
import PreviewIcon from '@mui/icons-material/Preview'

import { supabase } from '../lib/supabaseClient'
import { useUser } from '../context/UserContext'
import RecipeImage from '../components/RecipeImage'
import { suggestTagsFromTitle } from '../utils/levenshtein'

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
  const { currentUser: user } = useUser()
  const navigate = useNavigate()
  const { id } = useParams()
  const location = useLocation()

  const [name, setName] = useState('')
  const [servings, setServings] = useState(4)
  const [imageFile, setImageFile] = useState(null)
  const [imagePreview, setImagePreview] = useState(null)
  const [existingImageUrl, setExistingImageUrl] = useState(null)
  const [isPrivate, setIsPrivate] = useState(true)

  const [familyId, setFamilyId] = useState('')

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
   * Chargement des dictionnaires + famille
   * ------------------------------------------------------------
   */

  useEffect(() => {
    if (!user) return

    async function loadReferenceData() {
      const [
        { data: familyRows },
        { data: unitRows },
        { data: ingredientRowsData },
        { data: tagRows },
      ] = await Promise.all([
        supabase
          .from('family_members')
          .select('family_id, families(id, name)')
          .eq('user_id', user.id),

        supabase
          .from('units')
          .select('id, name, abbreviation')
          .order('name'),

        supabase
          .from('ingredients')
          .select('id, name')
          .order('name'),

        supabase
          .from('tags')
          .select('id, name')
          .order('name'),
      ])

      const families = (familyRows ?? [])
        .map((row) => row.families)
        .filter(Boolean)

      /*
       * L'utilisateur appartient à une seule famille.
       * On ne l'affiche donc plus dans le formulaire.
       */
      if (families.length > 0) {
        setFamilyId(families[0].id)
      }

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
    if (!editMode || !id || !user) return

    async function loadRecipe() {
      setInitialLoading(true)

      try {
        const { data: recipe, error: recipeError } = await supabase
          .from('recipes')
          .select('*')
          .eq('id', id)
          .single()

        if (recipeError) throw recipeError

        setName(recipe.name)
        setServings(recipe.servings)
        setIsPrivate(recipe.private)
        setFamilyId(recipe.family_id)
        setExistingImageUrl(recipe.image_url)

        const { data: ingredients } = await supabase
          .from('recipe_ingredients')
          .select(
            'quantity, unit_id, ingredients(id, name)'
          )
          .eq('recipe_id', id)

        setIngredientRows(
          (ingredients ?? []).map((row) => ({
            ingredientName: row.ingredients?.name ?? '',
            quantity: row.quantity ?? '',
            unitId: row.unit_id ?? '',
          }))
        )

        const { data: tags } = await supabase
          .from('recipe_tags')
          .select('tags(id, name)')
          .eq('recipe_id', id)

        setSelectedTags(
          (tags ?? [])
            .map((row) => row.tags)
            .filter(Boolean)
        )

        const { data: steps } = await supabase
          .from('recipe_steps')
          .select('*')
          .eq('recipe_id', id)
          .order('step_number')

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
  }, [editMode, id, user])

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

  /*
   * ------------------------------------------------------------
   * Tags automatiques
   * ------------------------------------------------------------
   */

  useEffect(() => {
    if (!name.trim() || existingTags.length === 0) return

    const suggestions = suggestTagsFromTitle(
      name,
      existingTags
    )

    if (suggestions.length === 0) return

    setSelectedTags((current) => {
      const existingIds = new Set(
        current
          .filter((tag) => tag.id)
          .map((tag) => tag.id)
      )

      const additions = suggestions.filter(
        (tag) => !existingIds.has(tag.id)
      )

      return [...current, ...additions]
    })
  }, [name, existingTags])

  /*
   * ------------------------------------------------------------
   * Drag & drop des étapes
   * ------------------------------------------------------------
   */

  const [draggedStepIndex, setDraggedStepIndex] = useState(null)

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
    servings: Number(servings) || 1,
    imageUrl: imagePreview,
    imageFile,
    private: isPrivate,
    familyId,

    ingredients: ingredientRows
      .filter(
        (row) =>
          row.ingredientName.trim() &&
          row.quantity &&
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

    if (!familyId) {
      setError(
        'Aucune famille n’est associée à ton compte.'
      )
      return
    }

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

  const saveRecipe = async (previewData) => {
    setLoading(true)
    setError('')

    try {
      let imageUrl =
        existingImageUrl ||
        previewData.imageUrl ||
        null

      // ---------------------------------------------------------
      // IMAGE
      // ---------------------------------------------------------

      if (previewData.imageFile) {
        const path = `${user.id}/${Date.now()}-${previewData.imageFile.name}`

        const { error: uploadError } =
          await supabase.storage
            .from('recipe-images')
            .upload(path, previewData.imageFile)

        if (uploadError) throw uploadError

        const { data: publicUrlData } =
          supabase.storage
            .from('recipe-images')
            .getPublicUrl(path)

        imageUrl = publicUrlData.publicUrl
      }

      // ---------------------------------------------------------
      // RECIPE
      // ---------------------------------------------------------

      let recipeId = previewData.id

      if (editMode) {
        const { error } = await supabase
          .from('recipes')
          .update({
            name: previewData.name,
            family_id: previewData.familyId,
            private: previewData.private,
            servings: previewData.servings,
            image_url: imageUrl,
          })
          .eq('id', recipeId)

        if (error) throw error
      } else {
        const { data, error } = await supabase
          .from('recipes')
          .insert({
            name: previewData.name,
            author_id: user.id,
            family_id: previewData.familyId,
            private: previewData.private,
            servings: previewData.servings,
            image_url: imageUrl,
          })
          .select()
          .single()

        if (error) throw error

        recipeId = data.id
      }

      // ---------------------------------------------------------
      // INGREDIENTS
      // ---------------------------------------------------------

      const ingredientRelations = []

      for (const ingredient of previewData.ingredients) {
        const ingredientName =
          ingredient.ingredientName.trim()

        if (!ingredientName) continue

        // Cherche d'abord l'ingrédient existant
        const { data: existingIngredient, error: findError } =
          await supabase
            .from('ingredients')
            .select('id, name')
            .ilike('name', ingredientName)
            .maybeSingle()

        if (findError) throw findError

        let ingredientId = existingIngredient?.id

        // Création uniquement s'il n'existe pas
        if (!ingredientId) {
          const { data: newIngredient, error } =
            await supabase
              .from('ingredients')
              .insert({
                name: ingredientName,
                default_unit_id: ingredient.unitId,
              })
              .select('id')
              .single()

          if (error) {
            // Une autre ligne pourrait avoir créé
            // l'ingrédient entre le SELECT et l'INSERT.
            if (error.code === '23505') {
              const { data: retryIngredient } =
                await supabase
                  .from('ingredients')
                  .select('id')
                  .ilike('name', ingredientName)
                  .maybeSingle()

              if (!retryIngredient) {
                throw error
              }

              ingredientId = retryIngredient.id
            } else {
              throw error
            }
          } else {
            ingredientId = newIngredient.id
          }
        }

        ingredientRelations.push({
          recipe_id: recipeId,
          ingredient_id: ingredientId,
          quantity: Number(ingredient.quantity),
          unit_id: ingredient.unitId,
        })
      }

      // ---------------------------------------------------------
      // TAGS
      // ---------------------------------------------------------

      const tagIds = new Set()

      for (const tag of previewData.tags) {
        const tagName = tag.name?.trim()

        if (!tagName) continue

        let tagId = tag.id

        if (!tagId) {
          const { data: existingTag, error } =
            await supabase
              .from('tags')
              .select('id')
              .ilike('name', tagName)
              .maybeSingle()

          if (error) throw error

          if (existingTag) {
            tagId = existingTag.id
          } else {
            const { data: newTag, error } =
              await supabase
                .from('tags')
                .insert({
                  name: tagName,
                })
                .select('id')
                .single()

            if (error) {
              if (error.code === '23505') {
                const { data: retryTag } =
                  await supabase
                    .from('tags')
                    .select('id')
                    .ilike('name', tagName)
                    .maybeSingle()

                if (!retryTag) throw error

                tagId = retryTag.id
              } else {
                throw error
              }
            } else {
              tagId = newTag.id
            }
          }
        }

        tagIds.add(tagId)
      }

      // ---------------------------------------------------------
      // RELATIONS
      //
      // On supprime seulement maintenant que la recette principale
      // et les dictionnaires sont valides.
      // ---------------------------------------------------------

      const { error: deleteIngredientsError } =
        await supabase
          .from('recipe_ingredients')
          .delete()
          .eq('recipe_id', recipeId)

      if (deleteIngredientsError) {
        throw deleteIngredientsError
      }

      const { error: deleteTagsError } =
        await supabase
          .from('recipe_tags')
          .delete()
          .eq('recipe_id', recipeId)

      if (deleteTagsError) {
        throw deleteTagsError
      }

      const { error: deleteStepsError } =
        await supabase
          .from('recipe_steps')
          .delete()
          .eq('recipe_id', recipeId)

      if (deleteStepsError) {
        throw deleteStepsError
      }

      // ---------------------------------------------------------
      // INSERT INGREDIENT RELATIONS
      // ---------------------------------------------------------

      if (ingredientRelations.length > 0) {
        const { error } = await supabase
          .from('recipe_ingredients')
          .insert(ingredientRelations)

        if (error) throw error
      }

      // ---------------------------------------------------------
      // INSERT TAG RELATIONS
      // ---------------------------------------------------------

      if (tagIds.size > 0) {
        const tagRelations = [...tagIds].map((tagId) => ({
          recipe_id: recipeId,
          tag_id: tagId,
        }))

        const { error } = await supabase
          .from('recipe_tags')
          .insert(tagRelations)

        if (error) throw error
      }

      // ---------------------------------------------------------
      // INSERT STEPS
      // ---------------------------------------------------------

      const steps = previewData.steps
        .filter(
          (step) => step.instruction?.trim()
        )
        .map((step, index) => ({
          recipe_id: recipeId,
          step_number: index + 1,
          instruction: step.instruction.trim(),
          duration_seconds:
            step.duration_seconds ?? null,
        }))

      if (steps.length > 0) {
        const { error } = await supabase
          .from('recipe_steps')
          .insert(steps)

        if (error) throw error
      }

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
    }
  }

  /*
   * Permet à RecipePreview de confirmer.
   */
  useEffect(() => {
    const confirmation = location.state?.confirmRecipe

    if (!confirmation) return

    navigate(location.pathname, {
      replace: true,
      state: {},
    })

    saveRecipe(confirmation)
  }, [])

  if (!user) {
    return (
      <Container
        maxWidth="sm"
        sx={{ py: 4, px: 2 }}
      >
        <Alert severity="warning">
          Choisis d'abord qui tu es dans l'onglet
          "Profil".
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

            <TextField
              label="Portions"
              type="number"
              value={servings}
              onChange={(e) =>
                setServings(e.target.value)
              }
              inputProps={{ min: 1 }}
              fullWidth
            />

            <ToggleButtonGroup
              exclusive
              fullWidth
              value={
                isPrivate
                  ? 'private'
                  : 'public'
              }
              onChange={(_, value) =>
                value &&
                setIsPrivate(
                  value === 'private'
                )
              }
            >
              <ToggleButton value="private">
                Famille uniquement
              </ToggleButton>

              <ToggleButton value="public">
                Publique
              </ToggleButton>
            </ToggleButtonGroup>

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
            {stepRows.map(
              (step, i) => (
                <Box
                  key={i}
                  draggable
                  onDragStart={() =>
                    setDraggedStepIndex(i)
                  }
                  onDragOver={(e) =>
                    e.preventDefault()
                  }
                  onDrop={() => {
                    if (
                      draggedStepIndex !==
                      null
                    ) {
                      moveStep(
                        draggedStepIndex,
                        i
                      )
                    }

                    setDraggedStepIndex(
                      null
                    )
                  }}
                  sx={{
                    p: 1.5,
                    border: '1px solid',
                    borderColor:
                      'divider',
                    borderRadius: 2,
                    cursor: 'grab',
                  }}
                >
                  <Stack
                    direction="row"
                    spacing={1}
                    alignItems="flex-start"
                  >
                    <DragIndicatorIcon
                      sx={{
                        mt: 1.5,
                        color: 'text.secondary',
                      }}
                    />

                    <Typography
                      sx={{
                        pt: 1.5,
                        minWidth: 20,
                        color:
                          'text.secondary',
                      }}
                    >
                      {i + 1}.
                    </Typography>

                    <TextField
                      label="Instruction"
                      value={
                        step.instruction
                      }
                      onChange={(e) =>
                        updateStepRow(
                          i,
                          'instruction',
                          e.target.value
                        )
                      }
                      sx={{
                        flex: 1,
                      }}
                      multiline
                      fullWidth
                    />

                    <TextField
                      label="Min."
                      type="number"
                      value={
                        step.durationMinutes
                      }
                      onChange={(e) =>
                        updateStepRow(
                          i,
                          'durationMinutes',
                          e.target.value
                        )
                      }
                      sx={{
                        width: 75,
                      }}
                    />

                    <IconButton
                      color="error"
                      onClick={() =>
                        setStepRows(
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
                </Box>
              )
            )}

            <Button
              startIcon={<AddIcon />}
              onClick={() =>
                setStepRows(
                  (rows) => [
                    ...rows,
                    emptyStepRow(),
                  ]
                )
              }
            >
              Ajouter une étape
            </Button>
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