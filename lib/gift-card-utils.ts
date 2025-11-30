import { readDataFile, writeDataFile } from '@/lib/data-utils'

export type GiftCardStatus = 'active' | 'redeemed' | 'expired' | 'cancelled'

export type GiftCard = {
  id: string
  code: string
  amount: number
  originalAmount: number
  status: GiftCardStatus
  purchasedBy: {
    name: string
    email: string
    phone?: string
  }
  recipient?: {
    name?: string
    email?: string
    message?: string
  }
  purchasedAt: string
  expiresAt: string
  redeemedAt?: string
  redeemedBy?: string
  redeemedBookingId?: string
  notes?: string
}

export type GiftCardSettings = {
  enabled: boolean
  minAmount: number
  maxAmount: number
  defaultAmounts: number[]
  expirationDays: number
  allowCustomAmount: boolean
}

export type GiftCardData = {
  version: number
  updatedAt: string | null
  cards: GiftCard[]
  settings: GiftCardSettings
}

const DEFAULT_SETTINGS: GiftCardSettings = {
  enabled: true,
  minAmount: 1000,
  maxAmount: 50000,
  defaultAmounts: [2000, 5000, 10000, 20000],
  expirationDays: 365,
  allowCustomAmount: true,
}

const DEFAULT_DATA: GiftCardData = {
  version: 1,
  updatedAt: null,
  cards: [],
  settings: DEFAULT_SETTINGS,
}

function generateGiftCardCode(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789' // Excluding confusing chars like 0, O, I, 1
  let code = ''
  for (let i = 0; i < 12; i++) {
    if (i > 0 && i % 4 === 0) {
      code += '-'
    }
    code += chars.charAt(Math.floor(Math.random() * chars.length))
  }
  return code
}

function normalizeGiftCard(raw: any): GiftCard | null {
  if (!raw || typeof raw !== 'object') return null

  const id = typeof raw.id === 'string' ? raw.id : ''
  const code = typeof raw.code === 'string' ? raw.code : generateGiftCardCode()
  const amount = typeof raw.amount === 'number' ? raw.amount : 0
  const originalAmount = typeof raw.originalAmount === 'number' ? raw.originalAmount : amount
  const status = ['active', 'redeemed', 'expired', 'cancelled'].includes(raw.status)
    ? raw.status
    : 'active'

  if (!id || amount <= 0) return null

  return {
    id,
    code,
    amount,
    originalAmount,
    status,
    purchasedBy: {
      name: typeof raw.purchasedBy?.name === 'string' ? raw.purchasedBy.name : '',
      email: typeof raw.purchasedBy?.email === 'string' ? raw.purchasedBy.email : '',
      phone: typeof raw.purchasedBy?.phone === 'string' ? raw.purchasedBy.phone : undefined,
    },
    recipient: raw.recipient
      ? {
          name: typeof raw.recipient.name === 'string' ? raw.recipient.name : undefined,
          email: typeof raw.recipient.email === 'string' ? raw.recipient.email : undefined,
          message: typeof raw.recipient.message === 'string' ? raw.recipient.message : undefined,
        }
      : undefined,
    purchasedAt: typeof raw.purchasedAt === 'string' ? raw.purchasedAt : new Date().toISOString(),
    expiresAt: typeof raw.expiresAt === 'string' ? raw.expiresAt : new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString(),
    redeemedAt: typeof raw.redeemedAt === 'string' ? raw.redeemedAt : undefined,
    redeemedBy: typeof raw.redeemedBy === 'string' ? raw.redeemedBy : undefined,
    redeemedBookingId: typeof raw.redeemedBookingId === 'string' ? raw.redeemedBookingId : undefined,
    notes: typeof raw.notes === 'string' ? raw.notes : undefined,
  }
}

export function normalizeGiftCardData(raw: any): GiftCardData {
  if (!raw || typeof raw !== 'object') {
    return DEFAULT_DATA
  }

  const settings: GiftCardSettings = {
    enabled: typeof raw.settings?.enabled === 'boolean' ? raw.settings.enabled : DEFAULT_SETTINGS.enabled,
    minAmount: typeof raw.settings?.minAmount === 'number' ? raw.settings.minAmount : DEFAULT_SETTINGS.minAmount,
    maxAmount: typeof raw.settings?.maxAmount === 'number' ? raw.settings.maxAmount : DEFAULT_SETTINGS.maxAmount,
    defaultAmounts: Array.isArray(raw.settings?.defaultAmounts)
      ? raw.settings.defaultAmounts.filter((a: any) => typeof a === 'number' && a > 0)
      : DEFAULT_SETTINGS.defaultAmounts,
    expirationDays: typeof raw.settings?.expirationDays === 'number' ? raw.settings.expirationDays : DEFAULT_SETTINGS.expirationDays,
    allowCustomAmount: typeof raw.settings?.allowCustomAmount === 'boolean' ? raw.settings.allowCustomAmount : DEFAULT_SETTINGS.allowCustomAmount,
  }

  const rawCards: any[] = Array.isArray(raw.cards) ? raw.cards : []
  const cards: GiftCard[] = rawCards
    .map(normalizeGiftCard)
    .filter((card): card is GiftCard => card !== null)

  return {
    version: typeof raw.version === 'number' ? raw.version : DEFAULT_DATA.version,
    updatedAt: typeof raw.updatedAt === 'string' ? raw.updatedAt : null,
    cards,
    settings,
  }
}

export async function loadGiftCards(): Promise<GiftCardData> {
  const raw = await readDataFile<GiftCardData>('gift-cards.json', DEFAULT_DATA)
  return normalizeGiftCardData(raw)
}

export async function saveGiftCards(data: GiftCardData): Promise<GiftCardData> {
  const dataToSave: GiftCardData = {
    ...data,
    updatedAt: new Date().toISOString(),
    version: typeof data.version === 'number' ? data.version : DEFAULT_DATA.version,
    cards: [...data.cards],
    settings: { ...data.settings },
  }

  await writeDataFile('gift-cards.json', dataToSave)
  return dataToSave
}

export async function createGiftCard(data: {
  amount: number
  purchasedBy: { name: string; email: string; phone?: string }
  recipient?: { name?: string; email?: string; message?: string }
  expirationDays?: number
}): Promise<GiftCard> {
  const giftCards = await loadGiftCards()
  const expirationDays = data.expirationDays || giftCards.settings.expirationDays

  const card: GiftCard = {
    id: `gift-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`,
    code: generateGiftCardCode(),
    amount: data.amount,
    originalAmount: data.amount,
    status: 'active',
    purchasedBy: data.purchasedBy,
    recipient: data.recipient,
    purchasedAt: new Date().toISOString(),
    expiresAt: new Date(Date.now() + expirationDays * 24 * 60 * 60 * 1000).toISOString(),
  }

  giftCards.cards.push(card)
  await saveGiftCards(giftCards)

  return card
}

export async function findGiftCardByCode(code: string): Promise<GiftCard | null> {
  const giftCards = await loadGiftCards()
  const normalizedCode = code.replace(/-/g, '').toUpperCase()
  
  const card = giftCards.cards.find(
    (c) => c.code.replace(/-/g, '').toUpperCase() === normalizedCode
  )

  if (!card) return null

  // Check if expired
  if (card.status === 'active' && new Date(card.expiresAt) < new Date()) {
    card.status = 'expired'
    const giftCards = await loadGiftCards()
    const updatedCards = giftCards.cards.map((c) => (c.id === card.id ? card : c))
    await saveGiftCards({ ...giftCards, cards: updatedCards })
  }

  return card
}

export async function redeemGiftCard(
  code: string,
  amount: number,
  bookingId: string,
  redeemedBy: string
): Promise<{ success: boolean; remainingBalance?: number; error?: string }> {
  const card = await findGiftCardByCode(code)
  
  if (!card) {
    return { success: false, error: 'Gift card not found' }
  }

  if (card.status !== 'active') {
    return { success: false, error: `Gift card is ${card.status}` }
  }

  if (new Date(card.expiresAt) < new Date()) {
    return { success: false, error: 'Gift card has expired' }
  }

  if (card.amount < amount) {
    return { success: false, error: `Insufficient balance. Available: ${card.amount} KSH` }
  }

  const remainingBalance = card.amount - amount
  card.amount = remainingBalance
  card.status = remainingBalance > 0 ? 'active' : 'redeemed'
  card.redeemedAt = new Date().toISOString()
  card.redeemedBy = redeemedBy
  card.redeemedBookingId = bookingId

  const giftCards = await loadGiftCards()
  const updatedCards = giftCards.cards.map((c) => (c.id === card.id ? card : c))
  await saveGiftCards({ ...giftCards, cards: updatedCards })

  return { success: true, remainingBalance }
}

