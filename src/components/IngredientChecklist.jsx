import { Box, Checkbox, FormControlLabel, Typography } from '@mui/material'
import { formatQuantity } from '../lib/recipePresentation'

export default function IngredientChecklist({ ingredients, ratio = 1, checked = [], onToggle }) {
  return <Box component="ul" sx={{ listStyle: 'none', p: 0, m: 0 }}>
    {ingredients.map(row => {
      const id = row.ingredient_id
      const done = checked.includes(id)
      return <Box component="li" key={id} sx={{ borderBottom: '1px solid', borderColor: 'divider' }}>
        <FormControlLabel sx={{ m: 0, width: '100%', minHeight: 56, alignItems: 'center', py: .5, '& .MuiFormControlLabel-label': { flex: 1, minWidth: 0 } }}
          control={<Checkbox checked={done} onChange={() => onToggle(id)} sx={{ alignSelf: 'center', mr: .5 }} />}
          label={<Box sx={{ textDecoration: done ? 'line-through' : 'none', opacity: done ? .55 : 1 }}><Typography sx={{ fontWeight: 650, fontVariantNumeric: 'tabular-nums' }}>{formatQuantity(row.quantity, ratio)} {row.units?.abbreviation}</Typography><Typography variant="body2">{row.ingredients?.name}</Typography></Box>} />
      </Box>
    })}
  </Box>
}
