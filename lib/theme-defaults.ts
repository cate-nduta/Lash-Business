export interface ThemeColors {
  primary: string
  primaryDark: string
  primaryLight: string
  secondary: string
  secondaryDark: string
  accent: string
  background: string
  surface: string
  text: string
  onPrimary?: string
  onSecondary?: string
}

export interface ThemeDefinition {
  name: string
  colors: ThemeColors
}

export interface ThemeFile {
  currentTheme: string
  themes: Record<string, ThemeDefinition>
}

export const DEFAULT_THEME_DATA: ThemeFile = {
  currentTheme: 'default',
  themes: {
    default: {
      name: 'Signature Blush',
      colors: {
        primary: '#733D26',
        primaryDark: '#4F2A1B',
        primaryLight: '#C78D7F',
        secondary: '#F9D0DE',
        secondaryDark: '#F4B0C9',
        accent: '#F790B2',
        background: '#FFF8FB',
        surface: '#FFFFFF',
        text: '#3B262F',
        onPrimary: '#FDF5F7',
        onSecondary: '#3B262F',
      },
    },
    summer: {
      name: 'Coastal Sunset',
      colors: {
        primary: '#037F8C',
        primaryDark: '#026473',
        primaryLight: '#4FB7C6',
        secondary: '#F27979',
        secondaryDark: '#D86A6A',
        accent: '#FEBAED',
        background: '#E6FAFF',
        surface: '#FFFFFF',
        text: '#14454B',
        onPrimary: '#F2FFFF',
        onSecondary: '#14454B',
      },
    },
    winter: {
      name: 'Mulled Wine',
      colors: {
        primary: '#8B2C3A',
        primaryDark: '#5A1924',
        primaryLight: '#D27B8C',
        secondary: '#F3F4F8',
        secondaryDark: '#D7DCE8',
        accent: '#B196F8',
        background: '#F8F7FB',
        surface: '#FFFFFF',
        text: '#2B1C28',
        onPrimary: '#FFF8FA',
        onSecondary: '#2B1C28',
      },
    },
    spring: {
      name: 'Apricot Bloom',
      colors: {
        primary: '#E7AE75',
        primaryDark: '#B78052',
        primaryLight: '#F6DFB3',
        secondary: '#FAD6D3',
        secondaryDark: '#F2AEA6',
        accent: '#F28AA1',
        background: '#FFF8F2',
        surface: '#FFFFFF',
        text: '#5B3B28',
        onPrimary: '#FFF9F0',
        onSecondary: '#5B3B28',
      },
    },
    fall: {
      name: 'Berry Maple',
      colors: {
        primary: '#7B1D26',
        primaryDark: '#4C1208',
        primaryLight: '#CA99AB',
        secondary: '#E4CDDD',
        secondaryDark: '#C8AFC3',
        accent: '#F28AA1',
        background: '#FBF4F8',
        surface: '#FFFFFF',
        text: '#2F1A16',
        onPrimary: '#FFF6F8',
        onSecondary: '#2F1A16',
      },
    },
    dark: {
      name: 'Midnight Noir',
      colors: {
        primary: '#7A6CFF',
        primaryDark: '#5A4DCC',
        primaryLight: '#A69BFF',
        secondary: '#2F2840',
        secondaryDark: '#221D34',
        accent: '#F6B5FF',
        background: '#151321',
        surface: '#221D34',
        text: '#F8F7FF',
        onPrimary: '#FFFFFF',
        onSecondary: '#F8F7FF',
      },
    },
    rose_gold: {
      name: 'Rose Gold Glam',
      colors: {
        primary: '#B76E79',
        primaryDark: '#8A5158',
        primaryLight: '#E4A5AD',
        secondary: '#FBE8E9',
        secondaryDark: '#F6C9CE',
        accent: '#FFD1DC',
        background: '#FFF9F9',
        surface: '#FFFFFF',
        text: '#3D1F23',
        onPrimary: '#FFF9FA',
        onSecondary: '#3D1F23',
      },
    },
  },
}

export function withDefaultThemeData(source?: ThemeFile | null): ThemeFile {
  if (!source || !source.themes || Object.keys(source.themes).length === 0) {
    return structuredClone(DEFAULT_THEME_DATA)
  }

  const mergedThemes = {
    ...DEFAULT_THEME_DATA.themes,
    ...source.themes,
  }

  const currentTheme = source.currentTheme && mergedThemes[source.currentTheme]
    ? source.currentTheme
    : DEFAULT_THEME_DATA.currentTheme

  return {
    currentTheme,
    themes: mergedThemes,
  }
}

