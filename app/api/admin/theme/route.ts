import { NextRequest, NextResponse } from 'next/server'
import { revalidatePath } from 'next/cache'
import { readDataFile, writeDataFile } from '@/lib/data-utils'
import { requireAdminAuth, getAdminUser } from '@/lib/admin-auth'
import { recordActivity } from '@/lib/activity-log'
import { DEFAULT_THEME_DATA, withDefaultThemeData, type ThemeFile } from '@/lib/theme-defaults'

export const revalidate = 0
export const dynamic = 'force-dynamic'

export async function GET() {
  try {
    await requireAdminAuth()
    const raw = await readDataFile<ThemeFile>('theme.json', DEFAULT_THEME_DATA)
    const data = withDefaultThemeData(raw)

    if (!raw || !raw.themes || Object.keys(raw.themes).length === 0) {
      await writeDataFile('theme.json', data)
    }

    return NextResponse.json(data)
  } catch (error: any) {
    if (error.message === 'Unauthorized') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    console.error('Error fetching theme settings:', error)
    return NextResponse.json({ error: 'Failed to fetch theme settings' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    await requireAdminAuth()
    const currentUser = await getAdminUser()
    const performedBy = currentUser?.username || 'owner'
    const body = await request.json()
    const { currentTheme } = body as { currentTheme?: string }

    if (!currentTheme) {
      return NextResponse.json({ error: 'Theme key is required.' }, { status: 400 })
    }

    const existingData = withDefaultThemeData(
      await readDataFile<ThemeFile>('theme.json', DEFAULT_THEME_DATA)
    )

    if (!existingData.themes[currentTheme]) {
      return NextResponse.json({ error: 'Selected theme does not exist.' }, { status: 400 })
    }

    const updatedData: ThemeFile = {
      ...existingData,
      currentTheme,
    }

    await writeDataFile('theme.json', updatedData)
    // Revalidate all pages to ensure theme is applied everywhere
    revalidatePath('/', 'layout')
    revalidatePath('/admin')
    revalidatePath('/labs')
    revalidatePath('/booking')
    revalidatePath('/services')
    revalidatePath('/gallery')
    revalidatePath('/contact')
    await recordActivity({
      module: 'themes',
      action: 'apply',
      performedBy,
      summary: `Applied theme ${currentTheme}`,
      targetId: currentTheme,
      targetType: 'theme',
      details: {
        currentTheme,
      },
    })
    return NextResponse.json({ success: true, currentTheme })
  } catch (error: any) {
    if (error.message === 'Unauthorized') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    console.error('Error updating theme settings:', error)
    return NextResponse.json({ error: 'Failed to update theme settings' }, { status: 500 })
  }
}

