import { useLocation, useNavigate } from 'react-router-dom'
import {
    Container,
    Button,
    Stack,
    Alert,
} from '@mui/material'

import RecipeView from './RecipeView'

export default function RecipePreview() {
    const location = useLocation()
    const navigate = useNavigate()

    const recipe = location.state?.recipe
    const editMode = location.state?.editMode ?? false

    if (!recipe) {
        return (
            <Container sx={{ py: 4 }}>
                <Alert severity="warning">
                    Aucune recette à prévisualiser.
                </Alert>

                <Button
                    sx={{ mt: 2 }}
                    onClick={() => navigate('/')}
                >
                    Retour
                </Button>
            </Container>
        )
    }

    const confirm = () => {
        /*
         * On retourne vers le formulaire.
         * Le formulaire effectuera alors la sauvegarde.
         */
        navigate(
            editMode
                ? `/recipes/${recipe.id}/edit`
                : '/recipes/new',
            {
                state: {
                    confirmRecipe: recipe,
                },
            }
        )
    }

    const edit = () => {
        if (editMode) {
            navigate(`/recipes/${recipe.id}/edit`)
        } else {
            navigate('/recipes/new', {
                state: {
                    recipe,
                },
            })
        }
    }

    return (
        <Container
            maxWidth="md"
            disableGutters
            sx={{ pb: 4 }}
        >
            <RecipeView
                name={recipe.name}
                imageUrl={recipe.imageUrl}
                servings={recipe.servings}
                tags={recipe.tags}
                ingredients={recipe.ingredients}
                steps={recipe.steps}
            />

            <Stack
                direction="row"
                spacing={2}
                sx={{
                    px: 2,
                    mt: 2,
                }}
            >
                <Button
                    fullWidth
                    variant="outlined"
                    onClick={edit}
                >
                    Modifier
                </Button>

                <Button
                    fullWidth
                    variant="contained"
                    onClick={confirm}
                >
                    {editMode
                        ? 'Enregistrer'
                        : 'Confirmer la recette'}
                </Button>
            </Stack>
        </Container>
    )
}