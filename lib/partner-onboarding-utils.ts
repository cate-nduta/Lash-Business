import { randomBytes } from 'crypto'
import { readDataFile, writeDataFile } from '@/lib/data-utils'

export type PartnerType = 'salon' | 'beautician' | 'influencer'

export type OnboardingEmailStatus = 'pending' | 'sent' | 'error'

export interface PartnerEmailOverrides {
  onboardingSubject?: string
  onboardingBodyHtml?: string
  onboardingBodyText?: string
  detailsSubject?: string
  detailsBodyHtml?: string
  detailsBodyText?: string
}

export interface PartnerReferralOverrides {
  commissionPercent?: number
  clientDiscountPercent?: number
  codeValidDays?: number
  redeemLimit?: number
  payoutScheduleNote?: string
  paymentMethod?: string
}

export interface PartnerOnboardingRecord {
  id: string
  partnerType: PartnerType
  businessName: string
  contactName: string
  email: string
  phone?: string
  notes?: string
  createdAt: string
  emailStatus: OnboardingEmailStatus
  emailSentAt?: string | null
  emailError?: string | null
  emailProvider?: 'zoho' | 'resend' | 'none'
  agreementId: string
  agreementToken: string
  agreementAcceptedAt?: string | null
  promoCode?: string | null
  detailsEmailSentAt?: string | null
  detailsEmailStatus?: 'pending' | 'sent' | 'error' | null
  detailsEmailError?: string | null
  updatedAt?: string | null
  emailOverrides?: PartnerEmailOverrides
  referralOverrides?: PartnerReferralOverrides
}

export interface PartnerReferralResolvedConfig {
  commissionPercent: number
  clientDiscountPercent: number
  codeValidDays: number
  redeemLimit: number
  payoutScheduleNote: string
  paymentMethod: string
}

type PartnerOnboardingStore = {
  records: PartnerOnboardingRecord[]
}

const DATA_FILE = 'partner-onboarding.json'

function createId(prefix: string) {
  return `${prefix}-${randomBytes(6).toString('hex')}`
}

async function getStoredRecords(): Promise<PartnerOnboardingRecord[]> {
  const raw = await readDataFile<PartnerOnboardingStore>(DATA_FILE, { records: [] })
  const records = Array.isArray(raw?.records) ? raw.records : []

  let needsPersist = false
  const normalised: PartnerOnboardingRecord[] = records.map((record: any) => {
    const agreementAcceptedAt =
      record?.agreementAcceptedAt ?? record?.signedAgreementReceivedAt ?? null
    const emailOverrides =
      record?.emailOverrides && typeof record.emailOverrides === 'object'
        ? { ...record.emailOverrides }
        : undefined
    const referralOverrides =
      record?.referralOverrides && typeof record.referralOverrides === 'object'
        ? { ...record.referralOverrides }
        : undefined

    const normalisedRecord: PartnerOnboardingRecord = {
      id: record?.id ?? createId('onboarding'),
      partnerType: record?.partnerType ?? 'salon',
      businessName: record?.businessName ?? '',
      contactName: record?.contactName ?? '',
      email: record?.email ?? '',
      phone: record?.phone || undefined,
      notes: record?.notes || undefined,
      createdAt: record?.createdAt ?? new Date().toISOString(),
      emailStatus: record?.emailStatus ?? 'pending',
      emailSentAt: record?.emailSentAt ?? null,
      emailError: record?.emailError ?? null,
      emailProvider: record?.emailProvider,
      agreementId: record?.agreementId ?? createId('AGR'),
      agreementToken: record?.agreementToken ?? createId('agree'),
      agreementAcceptedAt,
      promoCode: record?.promoCode ?? null,
      detailsEmailSentAt: record?.detailsEmailSentAt ?? null,
      detailsEmailStatus: record?.detailsEmailStatus ?? null,
      detailsEmailError: record?.detailsEmailError ?? null,
      updatedAt: record?.updatedAt ?? null,
      emailOverrides,
      referralOverrides,
    }

    if (
      !record?.agreementToken ||
      Object.prototype.hasOwnProperty.call(record ?? {}, 'signedAgreementReceivedAt') ||
      Object.prototype.hasOwnProperty.call(record ?? {}, 'pdfUrl') ||
      Object.prototype.hasOwnProperty.call(record ?? {}, 'pdfFileName')
    ) {
      needsPersist = true
    }

    return normalisedRecord
  })

  if (needsPersist) {
    await persistRecords(normalised)
  }

  return normalised
}

async function persistRecords(records: PartnerOnboardingRecord[]) {
  await writeDataFile(DATA_FILE, { records })
}

export async function loadPartnerOnboardingRecords(): Promise<PartnerOnboardingRecord[]> {
  const records = await getStoredRecords()
  return records
    .slice()
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
}

export async function addPartnerOnboardingRecord(input: {
  partnerType: PartnerType
  businessName: string
  contactName: string
  email: string
  phone?: string
  notes?: string
}): Promise<PartnerOnboardingRecord> {
  const existing = await getStoredRecords()
  const agreementId = createId(input.partnerType.slice(0, 3).toUpperCase())
  const record: PartnerOnboardingRecord = {
    id: createId('onboarding'),
    agreementId,
    agreementToken: createId('agree'),
    partnerType: input.partnerType,
    businessName: input.businessName.trim(),
    contactName: input.contactName.trim(),
    email: input.email.trim().toLowerCase(),
    phone: input.phone?.trim() || undefined,
    notes: input.notes?.trim() || undefined,
    createdAt: new Date().toISOString(),
    emailStatus: 'pending',
    emailSentAt: null,
    emailError: null,
    emailProvider: undefined,
    agreementAcceptedAt: null,
    promoCode: null,
    detailsEmailSentAt: null,
    detailsEmailStatus: null,
    detailsEmailError: null,
    updatedAt: null,
  }

  const records = [record, ...existing]
  await persistRecords(records)
  return record
}

export async function updatePartnerOnboardingRecord(
  id: string,
  updates: Partial<
    Omit<
      PartnerOnboardingRecord,
      'id' | 'createdAt' | 'agreementId' | 'agreementToken' | 'emailOverrides' | 'referralOverrides'
    >
  > & {
    emailOverrides?: PartnerEmailOverrides | null
    referralOverrides?: PartnerReferralOverrides | null
  },
): Promise<PartnerOnboardingRecord | null> {
  const records = await getStoredRecords()
  const index = records.findIndex((record) => record.id === id)
  if (index === -1) {
    return null
  }
  const current = records[index]
  const {
    emailOverrides: incomingEmailOverrides,
    referralOverrides: incomingReferralOverrides,
    ...restUpdates
  } = updates

  const emailOverrides =
    Object.prototype.hasOwnProperty.call(updates, 'emailOverrides') === true
      ? incomingEmailOverrides === null
        ? undefined
        : { ...(current.emailOverrides ?? {}), ...(incomingEmailOverrides ?? {}) }
      : current.emailOverrides

  const referralOverrides =
    Object.prototype.hasOwnProperty.call(updates, 'referralOverrides') === true
      ? incomingReferralOverrides === null
        ? undefined
        : { ...(current.referralOverrides ?? {}), ...(incomingReferralOverrides ?? {}) }
      : current.referralOverrides

  const updated: PartnerOnboardingRecord = {
    ...current,
    ...restUpdates,
    emailOverrides,
    referralOverrides,
    updatedAt: new Date().toISOString(),
  }
  records[index] = updated
  await persistRecords(records)
  return updated
}

export async function deletePartnerOnboardingRecord(id: string): Promise<boolean> {
  const records = await getStoredRecords()
  const next = records.filter((record) => record.id !== id)
  if (next.length === records.length) {
    return false
  }
  await persistRecords(next)
  return true
}

type PoliciesData = {
  variables?: Record<string, any>
}

export function resolvePartnerReferralConfig(
  record: PartnerOnboardingRecord,
  policies: PoliciesData,
): PartnerReferralResolvedConfig {
  const vars = policies?.variables ?? {}
  const overrides = record.referralOverrides ?? {}

  const commissionPercent =
    typeof overrides.commissionPercent === 'number' && !Number.isNaN(overrides.commissionPercent)
      ? overrides.commissionPercent
      : typeof vars.salonCommissionTotalPercent === 'number' && !Number.isNaN(vars.salonCommissionTotalPercent)
        ? vars.salonCommissionTotalPercent
        : 3.5

  const clientDiscountPercent =
    typeof overrides.clientDiscountPercent === 'number' && !Number.isNaN(overrides.clientDiscountPercent)
      ? overrides.clientDiscountPercent
      : typeof vars.referralDiscountPercent === 'number'
        ? vars.referralDiscountPercent
        : 8

  const codeValidDays =
    typeof overrides.codeValidDays === 'number' && !Number.isNaN(overrides.codeValidDays)
      ? overrides.codeValidDays
      : 35

  const redeemLimit =
    typeof overrides.redeemLimit === 'number' && !Number.isNaN(overrides.redeemLimit)
      ? overrides.redeemLimit
      : 10

  const payoutScheduleNote =
    typeof overrides.payoutScheduleNote === 'string' && overrides.payoutScheduleNote.trim().length > 0
      ? overrides.payoutScheduleNote.trim()
      : 'Commissions unlock once the client has been serviced and are added to the next bi-weekly payout.'

  const paymentMethod =
    typeof overrides.paymentMethod === 'string' && overrides.paymentMethod.trim().length > 0
      ? overrides.paymentMethod.trim()
      : 'M-Pesa or bank transfer'

  return {
    commissionPercent,
    clientDiscountPercent,
    codeValidDays,
    redeemLimit,
    payoutScheduleNote,
    paymentMethod,
  }
}


