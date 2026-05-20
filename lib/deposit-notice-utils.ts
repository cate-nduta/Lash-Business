export const DEFAULT_DEPOSIT_NOTICE =
  'A {deposit}% deposit is required to secure your booking. Deposits are strictly for securing your appointment and cannot be refunded under any circumstance.'

export function normalizeDepositNotice(value: unknown): string {
  return typeof value === 'string' && value.trim().length > 0 ? value : DEFAULT_DEPOSIT_NOTICE
}

export function formatDepositNotice(
  template: string,
  depositPercentage: number,
  fridayNightDepositPercentage: number,
  fridayNightEnabled: boolean,
): string {
  const text = normalizeDepositNotice(template)
    .split('{deposit}')
    .join(`${depositPercentage}`)
    .split('{fridayDeposit}')
    .join(fridayNightEnabled ? `${fridayNightDepositPercentage}` : '')

  return text.replace(/\s+/g, ' ').trim()
}
