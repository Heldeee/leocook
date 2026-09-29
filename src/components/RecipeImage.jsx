import { useState } from 'react'
import { Box } from '@mui/material'
import { categoryFor } from '../lib/recipePresentation'
import CategoryIllustration from './CategoryIllustration'

export default function RecipeImage({ src, name, category, height = 160, borderRadius = 0 }) {
  const [failedSrc, setFailedSrc] = useState(null)
  if (src && failedSrc !== src) return <Box component="img" src={src.startsWith('images/') ? `${import.meta.env.BASE_URL}${src}` : src} alt={name} loading="lazy" decoding="async" onError={() => setFailedSrc(src)} sx={{ width: '100%', height, objectFit: 'cover', borderRadius, display: 'block' }} />
  const style = categoryFor(category) ?? categoryFor('plats')
  return <Box sx={{ width: '100%', height, borderRadius, bgcolor: style.background, color: style.color, display: 'flex', alignItems: 'center', justifyContent: 'center', px: 1 }}><CategoryIllustration category={category} /></Box>
}
