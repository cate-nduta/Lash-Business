export function formatAssistedSlotLabel(value: string): string {
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return value
  return new Intl.DateTimeFormat('en-US', {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
    timeZone: 'Africa/Nairobi',
  }).format(date)
}

export function formatAssistedExpiryLabel(expiresAt: string): string {
  const date = new Date(expiresAt)
  if (Number.isNaN(date.getTime())) return expiresAt
  const minutes = Math.max(0, Math.ceil((date.getTime() - Date.now()) / (60 * 1000)))

  if (minutes <= 1) return 'in less than 1 minute'
  if (minutes < 60) return `in the next ${minutes} minutes`

  const hours = Math.floor(minutes / 60)
  const remainingMinutes = minutes % 60
  if (remainingMinutes === 0) {
    return `in the next ${hours} hour${hours === 1 ? '' : 's'}`
  }
  return `in about ${hours} hour${hours === 1 ? '' : 's'} ${remainingMinutes} minutes`
}

/** Digits only for wa.me (Kenya-friendly: 254...) */
export function phoneDigitsForWhatsApp(phone: string): string {
  let digits = phone.replace(/\D/g, '')
  if (!digits) return ''
  if (digits.startsWith('0')) {
    digits = `254${digits.slice(1)}`
  } else if (digits.length === 9 && digits.startsWith('7')) {
    digits = `254${digits}`
  }
  return digits
}

export function buildWhatsAppMessage(input: {
  clientName: string
  serviceNames: string
  dateTimeLabel: string
  totalKes: number
  depositKes: number
  expiryLabel: string
  paymentUrl: string
}): string {
  const firstName = input.clientName.trim().split(/\s+/)[0] || 'there'
  return `Hi ${firstName}, your LashDiary appointment has been reserved.

Service: ${input.serviceNames}
Date & Time: ${input.dateTimeLabel}
Total: KES ${Math.max(0, input.totalKes).toLocaleString()}
Deposit required: KES ${Math.max(0, input.depositKes).toLocaleString()}

Your appointment is only confirmed after the deposit is paid. Please pay ${input.expiryLabel}. This payment link will expire, and if the deposit is not paid in time, this slot may be released for another booking.

Pay your deposit here:
${input.paymentUrl}
`
}

export function buildWhatsAppUrl(phone: string, message: string): string | null {
  const digits = phoneDigitsForWhatsApp(phone)
  if (!digits) return null
  return `https://wa.me/${digits}?text=${encodeURIComponent(message)}`
}