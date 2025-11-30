import { PolicyData, PolicyVariables } from '@/lib/policies-types'

export const POLICY_VARIABLE_CONFIG: Array<{
  key: keyof PolicyVariables
  label: string
  helperText: string
  type: 'number'
  min?: number
  step?: number
  readOnly?: boolean
  manageLink?: string
}> = [
  {
    key: 'cancellationWindowHours',
    label: 'Cancellation window (hours)',
    helperText: 'How many hours before an appointment clients can cancel or reschedule without penalty.',
    type: 'number',
    min: 1,
    step: 1,
  },
  {
    key: 'depositPercentage',
    label: 'Deposit percentage (%)',
    helperText: 'Managed automatically from the Discounts & Deposits settings.',
    type: 'number',
    min: 0,
    step: 1,
    readOnly: true,
    manageLink: '/admin/discounts',
  },
  {
    key: 'referralDiscountPercent',
    label: 'Referral discount for friends (%)',
    helperText: 'Discount provided to the friend who uses a referral code.',
    type: 'number',
    min: 0,
    step: 1,
  },
  {
    key: 'referralRewardPercent',
    label: 'Referral reward for existing clients (%)',
    helperText: 'Discount applied to the referrer after their friend attends.',
    type: 'number',
    min: 0,
    step: 1,
  },
  {
    key: 'salonCommissionEarlyPercent',
    label: 'Salon commission (early payout %)',
    helperText: 'Commission percentage paid to salon partners after the cancellation window closes.',
    type: 'number',
    min: 0,
    step: 0.01,
  },
  {
    key: 'salonCommissionFinalPercent',
    label: 'Salon commission (final payout %)',
    helperText: 'Remaining commission percentage paid after the service is completed.',
    type: 'number',
    min: 0,
    step: 0.01,
  },
  {
    key: 'salonCommissionTotalPercent',
    label: 'Salon commission (total payout %)',
    helperText: 'Total commission percentage paid across both payouts.',
    type: 'number',
    min: 0,
    step: 0.01,
  },
]

export const DEFAULT_POLICIES: PolicyData = {
  version: 1,
  updatedAt: new Date().toISOString(),
  introText: 'These guidelines keep appointments running smoothly and ensure every client—and partner—enjoys the signature LashDiary experience. Reach out if you have any questions or need clarification.',
  variables: {
    cancellationWindowHours: 72,
    depositPercentage: 35,
    referralDiscountPercent: 10,
    referralRewardPercent: 10,
    salonCommissionEarlyPercent: 1,
    salonCommissionFinalPercent: 2.5,
    salonCommissionTotalPercent: 3.5,
  },
  sections: [
    {
      id: 'cancellations',
      title: 'Cancellations',
      description: '',
      items: [
        'Cancel at least {{cancellationWindowHours}} hours before your appointment to receive a full refund of your deposit.',
        'Appointments cancelled inside the {{cancellationWindowHours}}-hour window cannot be refunded because your slot has been reserved specifically for you.',
        'Missed appointments without notice are treated as late cancellations.',
      ],
    },
    {
      id: 'rescheduling',
      title: 'Rescheduling',
      description: '',
      items: [
        'You can reschedule from your confirmation email up to {{cancellationWindowHours}} hours before the appointment.',
        'Inside the {{cancellationWindowHours}}-hour window, kindly contact LashDiary directly so we can review availability.',
        'Each reschedule is subject to the same deposit and cancellation conditions.',
      ],
    },
    {
      id: 'deposits-payments',
      title: 'Deposits & Payments',
      description: '',
      items: [
        'A {{depositPercentage}}% deposit secures every appointment. The balance is paid in-studio after your service.',
        'If you cancel or reschedule outside the {{cancellationWindowHours}}-hour window, the deposit is fully transferable or refundable.',
        'Deposits retained after late cancellations may be credited toward a future appointment at LashDiary’s discretion.',
      ],
    },
    {
      id: 'referral-rewards',
      title: 'Referral Rewards',
      description: '',
      items: [
        'Existing clients can share their LashDiary referral code for {{referralDiscountPercent}}% off with friends.',
        'When your friend attends, you receive {{referralRewardPercent}}% off your next appointment automatically—no need to request it.',
        'Each referral code is single-use per friend to keep rewards meaningful for everyone.',
      ],
    },
    {
      id: 'returning-clients',
      title: 'Returning Clients & Rebooking',
      description: '',
      items: [
        'Rebook within 30 days of your last completed, paid appointment to receive a 12% loyalty discount on your next service.',
        'Rebook between 31 and 45 days after your last paid appointment to receive a 6% loyalty discount.',
        'Loyalty discounts apply only to full sets—fill/infills are excluded from rebooking rewards.',
        'Bookings placed 46 days or more after your last paid appointment do not include a loyalty discount, but once that service is completed and paid we reset the clock for future rewards.',
        'Loyalty discounts apply only to services that have been completed and marked paid in full, and they cannot be combined with promo codes or referral offers.',
      ],
    },
    {
      id: 'salon-beautician-partners',
      title: 'Partner Referrals',
      description: '',
      items: [
        'Partners enjoy a total commission of {{salonCommissionTotalPercent}}% ({{salonCommissionEarlyPercent}}% early payout + {{salonCommissionFinalPercent}}% final payout) on each completed referral.',
        'Early payouts unlock once the {{cancellationWindowHours}}-hour cancellation window closes; final payouts are released after the booked service is completed.',
        'Commission statements and referral status updates are delivered automatically by email, so you always know what is pending. More information will be communicated through the onboarding process.',
      ],
    },
  ],
}

