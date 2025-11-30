export interface PolicyVariables {
  cancellationWindowHours: number
  depositPercentage: number
  referralDiscountPercent: number
  referralRewardPercent: number
  salonCommissionEarlyPercent: number
  salonCommissionFinalPercent: number
  salonCommissionTotalPercent: number
}

export interface PolicySection {
  id: string
  title: string
  description?: string
  items: string[]
}

export interface PolicyData {
  version: number
  updatedAt: string
  introText?: string
  variables: PolicyVariables
  sections: PolicySection[]
}

