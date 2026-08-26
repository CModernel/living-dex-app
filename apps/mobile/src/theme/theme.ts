export type Theme = {
  colors: {
    background: string
    foreground: string
    muted: string
    border: string
    brand: string
  }
  spacing: {
    xs: number
    sm: number
    md: number
    lg: number
    xl: number
  }
  typography: {
    title: number
    heading: number
    body: number
    caption: number
  }
}

const spacing = { xs: 4, sm: 8, md: 16, lg: 24, xl: 32 }
const typography = { title: 28, heading: 22, body: 16, caption: 14 }

// Mirrors apps/web/src/index.css's Tailwind color tokens for cross-platform consistency.
export const lightTheme: Theme = {
  colors: {
    background: '#ffffff',
    foreground: '#171717',
    muted: '#666666',
    border: '#e5e7eb',
    brand: '#208aef',
  },
  spacing,
  typography,
}

export const darkTheme: Theme = {
  colors: {
    background: '#0a0a0a',
    foreground: '#ededed',
    muted: '#a1a1aa',
    border: '#27272a',
    brand: '#4da8f5',
  },
  spacing,
  typography,
}
