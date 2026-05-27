import { NextRequest, NextResponse } from 'next/server'
import { readDataFilePreferRemote } from '@/lib/data-utils'
import { normalizeDepositNotice } from '@/lib/deposit-notice-utils'

export const revalidate = 0

export async function GET(request: NextRequest) {
  try {
    const discounts = await readDataFilePreferRemote('discounts.json', {})
    return NextResponse.json({
      ...discounts,
      depositNotice: normalizeDepositNotice((discounts as any)?.depositNotice),
    }, {
      headers: {
        'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate, max-age=0',
        'Pragma': 'no-cache',
        'Expires': '0',
      },
    })
  } catch (error) {
    console.error('Error loading discounts:', error)
    return NextResponse.json({ discounts: [] }, { 
      status: 500,
      headers: {
        'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate, max-age=0',
        'Pragma': 'no-cache',
        'Expires': '0',
      },
    })
  }
}

