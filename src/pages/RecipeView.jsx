import { Box, Typography, Chip, Stack, List, ListItem, ListItemText, Divider } from '@mui/material'
import ScheduleIcon from '@mui/icons-material/Schedule'
import RecipeImage from '../components/RecipeImage'
import { totalMinutes, formatMinutes } from '../utils/time'

// `ingredients`: [{ quantity, unitLabel, ingredientName }]
// `steps`: [{ instruction, duration_seconds }]  (in order)
// `tags`: [{ id?, name }]
export default function RecipeView({ name, imageUrl, servings, tags = [], ingredients = [], steps = [], headerAction }) {
    const minutes = totalMinutes(steps)

    return (
        <Box>
            <RecipeImage src={imageUrl} name={name} height={220} />

            <Box sx={{ px: { xs: 2, sm: 3 }, py: 3 }}>
                <Stack direction="row" alignItems="center" justifyContent="space-between">
                    <Typography variant="h4" sx={{ wordBreak: 'break-word' }}>
                        {name || 'Sans titre'}
                    </Typography>
                    {headerAction}
                </Stack>

                <Stack direction="row" spacing={1} sx={{ my: 2, flexWrap: 'wrap', gap: 1 }}>
                    {tags.map((tag, i) => (
                        <Chip key={tag.id ?? i} label={tag.name} size="small" />
                    ))}
                </Stack>

                <Stack direction="row" spacing={2} sx={{ mb: 3 }}>
                    <Typography color="text.secondary">{servings} portions</Typography>
                    {minutes > 0 && (
                        <Stack direction="row" spacing={0.5} alignItems="center">
                            <ScheduleIcon sx={{ fontSize: 18, color: 'text.secondary' }} />
                            <Typography color="text.secondary">{formatMinutes(minutes)}</Typography>
                        </Stack>
                    )}
                </Stack>

                <Typography variant="h6" sx={{ mb: 1 }}>
                    Ingrédients
                </Typography>
                <List dense>
                    {ingredients.map((row, i) => (
                        <ListItem key={i} disableGutters>
                            <ListItemText primary={`${row.quantity} ${row.unitLabel ?? ''} — ${row.ingredientName}`} />
                        </ListItem>
                    ))}
                </List>

                <Divider sx={{ my: 3 }} />

                <Typography variant="h6" sx={{ mb: 1 }}>
                    Étapes
                </Typography>
                <List>
                    {steps.map((step, i) => (
                        <ListItem key={i} alignItems="flex-start" disableGutters>
                            <ListItemText
                                primary={`${i + 1}. ${step.instruction}`}
                                secondary={step.duration_seconds ? `${Math.round(step.duration_seconds / 60)} min` : null}
                            />
                        </ListItem>
                    ))}
                </List>
            </Box>
        </Box>
    )
}