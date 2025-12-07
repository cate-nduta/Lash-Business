import { NextRequest, NextResponse } from 'next/server'

export async function POST(request: NextRequest) {
  const response = NextResponse.json({ success: true })

  // Clear authentication cookies
  response.cookies.delete('client-auth')
  response.cookies.delete('client-user-id')
  response.cookies.delete('client-last-active')

  return response
}

