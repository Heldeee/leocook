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

import { referenceData, addReference, deleteReference } from '../lib/catalogue'
import { useUser } from '../context/UserContext'

export default function DictionaryDialog({
    open,
    onClose,
}) {
    const { editing } = useUser()
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
        const data = await referenceData()
        setIngredients(data.ingredients)
        setUnits(data.units)
    }

    useEffect(() => {
        if (open) {
            load()
        }
    }, [open])

    const mutate = async (action) => {
        if (!editing) return
        try { await action(); await load() } catch (error) { alert(error.message) }
    }
    const addIngredient = () => {
        const name = newIngredient.trim()
        if (name) mutate(async () => { await addReference('ingredients', { name, default_unit_id: null }); setNewIngredient('') })
    }
    const deleteIngredient = id => {
        if (window.confirm('Supprimer cet ingrédient ?')) mutate(() => deleteReference('ingredients', id))
    }
    const addUnit = () => {
        const name = newUnitName.trim(), abbreviation = newUnitAbbreviation.trim()
        if (name && abbreviation) mutate(async () => { await addReference('units', { name, abbreviation }); setNewUnitName(''); setNewUnitAbbreviation('') })
    }
    const deleteUnit = id => {
        if (window.confirm('Supprimer cette unité ?')) mutate(() => deleteReference('units', id))
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