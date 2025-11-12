export const dynamic = 'force-dynamic'

import { NextRequest, NextResponse } from 'next/server'
import { revalidatePath } from 'next/cache'
import { loadPartnerOnboardingRecords, updatePartnerOnboardingRecord } from '@/lib/partner-onboarding-utils'
import { recordActivity } from '@/lib/activity-log'

function renderHtml({ heading, body }: { heading: string; body: string }) {
  return `
<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <title>LashDiary Partner Onboarding</title>
    <style>
      body { font-family: 'Helvetica Neue', Arial, sans-serif; background: #fdf9f4; margin: 0; padding: 0; color: #3e2a20; }
      .container { max-width: 640px; margin: 64px auto; background: #ffffff; border-radius: 16px; padding: 48px; box-shadow: 0 16px 40px rgba(126, 75, 49, 0.15); }
      h1 { font-size: 28px; margin-bottom: 16px; color: #7c4b31; }
      p { line-height: 1.6; font-size: 16px; margin-bottom: 16px; }
      a.button { display: inline-block; margin-top: 24px; padding: 12px 24px; background: #7c4b31; color: #ffffff; text-decoration: none; border-radius: 8px; font-weight: 600; }
    </style>
  </head>
  <body>
    <div class="container">
      <h1>${heading}</h1>
      ${body}
    </div>
  </body>
</html>
  `.trim()
}

export async function GET(request: NextRequest) {
  try {
    const token = request.nextUrl.searchParams.get('token')
    if (!token) {
      return new NextResponse(
        renderHtml({
          heading: 'Missing confirmation token',
          body: '<p>Please open the latest onboarding email and tap “Agree &amp; Continue” again.</p>',
        }),
        { status: 400, headers: { 'Content-Type': 'text/html; charset=utf-8' } },
      )
    }

    const records = await loadPartnerOnboardingRecords()
    const record = records.find((entry) => entry.agreementToken === token)

    if (!record) {
      return new NextResponse(
        renderHtml({
          heading: 'Link not found',
          body: '<p>This agreement link is no longer valid. Reach out to Catherine at <a href="mailto:hello@lashdiary.co.ke">hello@lashdiary.co.ke</a> so we can resend your onboarding email.</p>',
        }),
        { status: 404, headers: { 'Content-Type': 'text/html; charset=utf-8' } },
      )
    }

    const alreadyAccepted = Boolean(record.agreementAcceptedAt)

    if (!alreadyAccepted) {
      const updated = await updatePartnerOnboardingRecord(record.id, {
        agreementAcceptedAt: new Date().toISOString(),
      })
      const details = updated ?? record

      await recordActivity({
        module: 'partner_onboarding',
        action: 'accept',
        performedBy: record.email,
        summary: `Partner agreement accepted by ${record.businessName}`,
        targetId: record.id,
        targetType: 'partner_onboarding',
        details: details ? { ...details } as Record<string, unknown> : null,
      })

      await revalidatePath('/admin/partner-onboarding')
    }

    return new NextResponse(
      renderHtml({
        heading: alreadyAccepted ? 'Already confirmed' : 'Thanks for confirming',
        body: [
          `<p>${alreadyAccepted ? 'We already have your confirmation on file.' : 'Great — your partnership status is now confirmed.'}</p>`,
          '<p>We’ll countersign within 48 hours and your full referral toolkit email (with promo code, sharing assets, and payout calendar) will arrive within the next 24 hours.</p>',
          '<p>If you need anything in the meantime, reply to your onboarding email or email <a href="mailto:hello@lashdiary.co.ke">hello@lashdiary.co.ke</a>.</p>',
          '<a class="button" href="/">Return to LashDiary</a>',
        ].join(''),
      }),
      { status: 200, headers: { 'Content-Type': 'text/html; charset=utf-8' } },
    )
  } catch (error) {
    console.error('Error confirming partner agreement:', error)
    return new NextResponse(
      renderHtml({
        heading: 'Something went wrong',
        body: '<p>Please try the link again in a moment or contact Catherine so we can confirm your onboarding manually.</p>',
      }),
      { status: 500, headers: { 'Content-Type': 'text/html; charset=utf-8' } },
    )
  }
}


