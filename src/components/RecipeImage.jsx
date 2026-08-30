import { Box, Typography } from '@mui/material'

// Deterministic gradient per recipe name so cards without a photo still feel distinct
const GRADIENTS = [
  ['#3F5B3A', '#5C7C55'],
  ['#B4552E', '#D97D52'],
  ['#3A5361', '#5C7F91'],
  ['#6B4A7A', '#8F6BA0'],
  ['#8A6D2F', '#C79A4B'],
]

function gradientFor(name = '') {
  let hash = 0
  for (let i = 0; i < name.length; i++) hash = (hash * 31 + name.charCodeAt(i)) >>> 0
  const [from, to] = GRADIENTS[hash % GRADIENTS.length]
  return `linear-gradient(135deg, ${from}, ${to})`
}

export default function RecipeImage({ src, name, height = 160, borderRadius = 0 }) {
  if (src) {
    return (
      <Box
        component="img"
        src={src}
        alt={name}
        sx={{ width: '100%', height, objectFit: 'cover', borderRadius, display: 'block' }}
      />
    )
  }

  return (
    <Box
      sx={{
        width: '100%',
        height,
        borderRadius,
        background: gradientFor(name),
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        px: 2,
        textAlign: 'center',
      }}
    >
      <Typography
        variant="h6"
        sx={{
          color: '#FFFDF8',
          fontFamily: '"Fraunces", serif',
          fontWeight: 600,
          textShadow: '0 1px 4px rgba(0,0,0,0.25)',
          overflow: 'hidden',
          textOverflow: 'ellipsis',
          display: '-webkit-box',
          WebkitLineClamp: 2,
          WebkitBoxOrient: 'vertical',
        }}
      >
        {name}
      </Typography>
    </Box>
  )
}
