import { NextResponse } from 'next/server'
import { readDataFile } from '@/lib/data-utils'
import { DEFAULT_THEME_DATA, withDefaultThemeData, type ThemeFile } from '@/lib/theme-defaults'

export const dynamic = 'force-dynamic'
export const revalidate = 0

export async function GET() {
  try {
    const raw = await readDataFile<ThemeFile>('theme.json', DEFAULT_THEME_DATA)
    const data = withDefaultThemeData(raw)
    const currentTheme = data.currentTheme || 'default'
    const theme = data.themes[currentTheme]

    if (!theme || !theme.colors) {
      return NextResponse.json(
        { colors: DEFAULT_THEME_DATA.themes.default.colors },
        {
          headers: {
            'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate, max-age=0',
            'Pragma': 'no-cache',
            'Expires': '0',
          },
        }
      )
    }

    return NextResponse.json(
      { 
        colors: theme.colors,
        currentTheme,
      },
      {
        headers: {
          'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate, max-age=0',
          'Pragma': 'no-cache',
          'Expires': '0',
        },
      }
    )
  } catch (error) {
    console.error('Error fetching current theme:', error)
    return NextResponse.json(
      { colors: DEFAULT_THEME_DATA.themes.default.colors },
      {
        headers: {
          'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate, max-age=0',
          'Pragma': 'no-cache',
          'Expires': '0',
        },
      }
    )
  }
}

