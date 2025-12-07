export interface PasswordResetToken {
  token: string
  expiresAt: string // ISO timestamp
  used: boolean
}

export interface ClientProfile {
  id: string
  email: string
  name: string
  phone: string
  passwordHash: string
  createdAt: string
  lastLoginAt?: string
  birthday?: string // YYYY-MM-DD format
  isActive: boolean
  emailVerified?: boolean
  verificationCode?: string
  verificationCodeExpires?: string // ISO timestamp
  resetTokens?: PasswordResetToken[]
}

export interface LashHistory {
  appointmentId: string
  date: string // ISO date
  service: string
  serviceType: 'full-set' | 'refill' | 'removal' | 'other'
  lashTech: string
  notes?: string
  retentionDays?: number // How long lashes lasted
  retentionNotes?: string // Why retention was good/poor
  retentionScore?: 1 | 2 | 3 // 1 = Poor, 2 = Good, 3 = Excellent
  retentionReason?: string // Detailed reason for the score
}

export interface LashPreferences {
  preferredCurl: 'J' | 'C' | 'CC' | 'D' | 'DD' | 'L+' | null
  lengthRange: {
    min: number // mm
    max: number // mm
  } | null
  densityLevel: 'natural' | 'classic' | 'hybrid' | 'volume' | 'mega-volume' | null
  eyeShape: string | null // e.g., "Almond", "Round", "Hooded", "Monolid", "Deep Set"
  mappingStyle: string | null // e.g., "Cat Eye", "Doll Eye", "Wispy"
  signatureLook: string | null // Description of their signature look
}

export interface AllergySensitivity {
  hasReaction: boolean
  reactionDetails?: string
  glueSensitivity?: string
  patchesUsed?: string[]
  avoidNextSession?: string[]
  lastReactionDate?: string
}

export interface AftercareInfo {
  aftercareIssues?: string[]
  lashSheddingPattern?: 'normal' | 'excessive' | 'minimal'
  sleepPosition?: 'back' | 'side' | 'stomach' | 'mixed'
  oilUse?: 'frequent' | 'occasional' | 'rare' | 'none'
  makeupHabits?: 'daily' | 'occasional' | 'rare' | 'none'
  notes?: string
}

export interface LengthLabel {
  eye: 'left' | 'right'
  length: number // 8-15mm
  x: number
  y: number
  id: string
}

export interface LashMapDrawingData {
  leftEye: Array<{
    eye: 'left' | 'right'
    points: Array<{ x: number; y: number }>
    color: string
    strokeWidth: number
    type?: 'drawn' | 'template'
    templateId?: string
  }>
  rightEye: Array<{
    eye: 'left' | 'right'
    points: Array<{ x: number; y: number }>
    color: string
    strokeWidth: number
    type?: 'drawn' | 'template'
    templateId?: string
  }>
  leftEyeLabels?: LengthLabel[]
  rightEyeLabels?: LengthLabel[]
  metadata?: {
    created?: string
    updated?: string
    style?: string
  }
}

export interface LashMap {
  id?: string // Unique identifier for the map (new maps will have this)
  appointmentId: string
  date: string
  mapData: string // JSON string containing LashMapDrawingData
  imageUrl?: string
  notes?: string
}

export interface ClientData {
  profile: ClientProfile
  lashHistory: LashHistory[]
  preferences: LashPreferences
  allergies: AllergySensitivity
  aftercare: AftercareInfo
  lashMaps: LashMap[]
  lastAppointmentDate?: string
  recommendedRefillDate?: string
  retentionCycles: Array<{
    appointmentId: string
    startDate: string
    endDate?: string
    retentionDays?: number
    retentionQuality: 'excellent' | 'good' | 'fair' | 'poor'
    notes?: string
  }>
}

export interface ClientUsersData {
  users: ClientProfile[]
}

