import { createTheme } from '@mui/material/styles'

// Palette inspired by a well-used kitchen notebook: basil green,
// egg-yolk yellow, and a warm paper background (deliberately not
// the generic cream/terracotta combo).
const palette = {
  paper: '#FBF6EC',   // warm paper, slightly yellow rather than grey-cream
  ink: '#22301F',      // near-black green, used for text
  basil: '#3F5B3A',    // primary — deep herb green
  basilDark: '#2C4028',
  yolk: '#E8A33D',     // accent — egg yolk / mustard
  clay: '#B4552E',     // secondary accent for warnings/errors, muted brick
  line: '#DED2B8',     // hairline dividers on paper
}

export const theme = createTheme({
  palette: {
    mode: 'light',
    primary: { main: palette.basil, dark: palette.basilDark, contrastText: '#FBF6EC' },
    secondary: { main: palette.yolk, contrastText: palette.ink },
    error: { main: palette.clay },
    background: { default: palette.paper, paper: '#FFFDF8' },
    text: { primary: palette.ink, secondary: '#5B6B54' },
    divider: palette.line,
  },
  typography: {
    fontFamily: '"Inter", "Helvetica Neue", Arial, sans-serif',
    h1: { fontFamily: '"Fraunces", "Georgia", serif', fontWeight: 600 },
    h2: { fontFamily: '"Fraunces", "Georgia", serif', fontWeight: 600 },
    h3: { fontFamily: '"Fraunces", "Georgia", serif', fontWeight: 600 },
    h4: { fontFamily: '"Fraunces", "Georgia", serif', fontWeight: 600 },
    button: { textTransform: 'none', fontWeight: 600 },
  },
  shape: { borderRadius: 10 },
  components: {
    MuiAppBar: {
      styleOverrides: {
        root: { backgroundColor: palette.basil, color: '#FBF6EC' },
      },
    },
    MuiButton: {
      styleOverrides: {
        root: { borderRadius: 8 },
      },
    },
    MuiChip: {
      styleOverrides: {
        root: { borderRadius: 6 },
      },
    },
  },
})
