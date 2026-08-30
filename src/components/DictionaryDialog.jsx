import { useEffect, useState } from 'react'
import {
    Dialog,
    DialogTitle,
    DialogContent,
    Tabs,
    Tab,
    Box,
    TextField,
    Button,
    List,
    ListItem,
    ListItemText,
    IconButton,
    Stack,
    Divider,
} from '@mui/material'

import DeleteIcon from '@mui/icons-material/Delete'
import AddIcon from '@mui/icons-material/Add'

import { supabase } from '../lib/supabaseClient'

export default function DictionaryDialog({
    open,
    onClose,
}) {
    const [tab, setTab] = useState(0)

    const [ingredients, setIngredients] =
        useState([])

    const [units, setUnits] = useState([])

    const [newIngredient, setNewIngredient] =
        useState('')

    const [newUnitName, setNewUnitName] =
        useState('')

    const [newUnitAbbreviation, setNewUnitAbbreviation] =
        useState('')

    const load = async () => {
        const [
            { data: ingredientData },
            { data: unitData },
        ] = await Promise.all([
            supabase
                .from('ingredients')
                .select('id, name')
                .order('name'),

            supabase
                .from('units')
                .select(
                    'id, name, abbreviation'
                )
                .order('name'),
        ])

        setIngredients(
            ingredientData ?? []
        )

        setUnits(unitData ?? [])
    }

    useEffect(() => {
        if (open) {
            load()
        }
    }, [open])

    const addIngredient = async () => {
        const name = newIngredient.trim()

        if (!name) return

        const { error } = await supabase
            .from('ingredients')
            .insert({ name })

        if (error) {
            alert(error.message)
            return
        }

        setNewIngredient('')
        load()
    }

    const deleteIngredient = async (id) => {
        const confirmed = window.confirm(
            'Supprimer cet ingrédient ?'
        )

        if (!confirmed) return

        const { error } = await supabase
            .from('ingredients')
            .delete()
            .eq('id', id)

        if (error) {
            alert(
                'Impossible de supprimer cet ingrédient. Il est probablement utilisé dans une recette.'
            )
            return
        }

        load()
    }

    const addUnit = async () => {
        const name =
            newUnitName.trim()

        const abbreviation =
            newUnitAbbreviation.trim()

        if (!name || !abbreviation) return

        const { error } = await supabase
            .from('units')
            .insert({
                name,
                abbreviation,
            })

        if (error) {
            alert(error.message)
            return
        }

        setNewUnitName('')
        setNewUnitAbbreviation('')

        load()
    }

    const deleteUnit = async (id) => {
        const confirmed = window.confirm(
            'Supprimer cette unité ?'
        )

        if (!confirmed) return

        const { error } = await supabase
            .from('units')
            .delete()
            .eq('id', id)

        if (error) {
            alert(
                'Impossible de supprimer cette unité. Elle est probablement utilisée dans une recette.'
            )
            return
        }

        load()
    }

    return (
        <Dialog
            open={open}
            onClose={onClose}
            fullWidth
            maxWidth="sm"
        >
            <DialogTitle>
                Dictionnaires
            </DialogTitle>

            <Tabs
                value={tab}
                onChange={(_, value) =>
                    setTab(value)
                }
                variant="fullWidth"
            >
                <Tab label="Ingrédients" />
                <Tab label="Unités" />
            </Tabs>

            <DialogContent>
                {tab === 0 && (
                    <Box sx={{ pt: 2 }}>
                        <Stack
                            direction="row"
                            spacing={1}
                        >
                            <TextField
                                fullWidth
                                label="Nouvel ingrédient"
                                value={newIngredient}
                                onChange={(e) =>
                                    setNewIngredient(
                                        e.target.value
                                    )
                                }
                            />

                            <Button
                                variant="contained"
                                onClick={addIngredient}
                                startIcon={<AddIcon />}
                            >
                                Ajouter
                            </Button>
                        </Stack>

                        <List>
                            {ingredients.map(
                                (ingredient) => (
                                    <Box key={ingredient.id}>
                                        <ListItem
                                            secondaryAction={
                                                <IconButton
                                                    color="error"
                                                    onClick={() =>
                                                        deleteIngredient(
                                                            ingredient.id
                                                        )
                                                    }
                                                >
                                                    <DeleteIcon />
                                                </IconButton>
                                            }
                                        >
                                            <ListItemText
                                                primary={
                                                    ingredient.name
                                                }
                                            />
                                        </ListItem>

                                        <Divider />
                                    </Box>
                                )
                            )}
                        </List>
                    </Box>
                )}

                {tab === 1 && (
                    <Box sx={{ pt: 2 }}>
                        <Stack spacing={1}>
                            <TextField
                                label="Nom"
                                value={newUnitName}
                                onChange={(e) =>
                                    setNewUnitName(
                                        e.target.value
                                    )
                                }
                            />

                            <TextField
                                label="Abréviation"
                                value={
                                    newUnitAbbreviation
                                }
                                onChange={(e) =>
                                    setNewUnitAbbreviation(
                                        e.target.value
                                    )
                                }
                            />

                            <Button
                                variant="contained"
                                onClick={addUnit}
                                startIcon={<AddIcon />}
                            >
                                Ajouter
                            </Button>
                        </Stack>

                        <List>
                            {units.map((unit) => (
                                <Box key={unit.id}>
                                    <ListItem
                                        secondaryAction={
                                            <IconButton
                                                color="error"
                                                onClick={() =>
                                                    deleteUnit(
                                                        unit.id
                                                    )
                                                }
                                            >
                                                <DeleteIcon />
                                            </IconButton>
                                        }
                                    >
                                        <ListItemText
                                            primary={unit.name}
                                            secondary={
                                                unit.abbreviation
                                            }
                                        />
                                    </ListItem>

                                    <Divider />
                                </Box>
                            ))}
                        </List>
                    </Box>
                )}
            </DialogContent>
        </Dialog>
    )
}