/**
 * Tier Permissions and Access Control
 * This module defines what features are available for each tier
 */

export type TierId = 'starter' | 'business' | 'premium'

export interface TierPermissions {
  // Pages Access
  canEditPages: boolean
  availablePages: string[]
  
  // Layout & Structure
  canModifyLayout: boolean
  canAdjustFlow: boolean
  
  // Booking Features
  canSetBasicBookingRules: boolean
  canSetAdvancedBookingRules: boolean // buffer times, cancellation windows
  canSetComplexBookingLogic: boolean // service-specific rules, conditional deposits
  
  // Payment Features
  maxPaymentProviders: number // 1 for starter, multiple for business+
  canSetCountryBasedPayments: boolean
  
  // Domain Features
  canConnectCustomDomain: boolean
  hasDomainSetupAssistance: boolean
  
  // Email Automation
  hasAutomatedEmails: boolean
  
  // Support
  hasGuidedSetup: boolean
  hasSetupSession: boolean
  hasPostLaunchSupport: boolean
  
  // Done-for-you
  isDoneForYou: boolean
}

/**
 * Tier 1 - Starter System
 * "I just need order. I don't want to think too much."
 */
const TIER_1_PERMISSIONS: TierPermissions = {
  canEditPages: false, // Pre-built structure, locked layout
  availablePages: ['Home', 'Services', 'Booking & Checkout', 'Contact'],
  
  canModifyLayout: false, // Locked layout
  canAdjustFlow: false,
  
  canSetBasicBookingRules: true, // working hours, simple deposits OR full payment
  canSetAdvancedBookingRules: false,
  canSetComplexBookingLogic: false,
  
  maxPaymentProviders: 1, // One payment provider connection
  canSetCountryBasedPayments: false,
  
  canConnectCustomDomain: false, // Temporary subdomain only
  hasDomainSetupAssistance: false, // No domain assistance beyond basic instructions
  
  hasAutomatedEmails: false,
  
  hasGuidedSetup: true, // Guided setup flow
  hasSetupSession: false,
  hasPostLaunchSupport: false,
  
  isDoneForYou: false,
}

/**
 * Tier 2 - Business System
 * "My business is specific. I need the system to fit me."
 */
const TIER_2_PERMISSIONS: TierPermissions = {
  // Includes everything from Tier 1
  canEditPages: true, // Flexible structure - can adjust pages and flow
  availablePages: ['Home', 'Services', 'Booking & Checkout', 'Contact', 'About', 'Policies / Terms', 'FAQ'],
  
  canModifyLayout: true, // Flexible structure
  canAdjustFlow: true,
  
  canSetBasicBookingRules: true,
  canSetAdvancedBookingRules: true, // buffer times, cancellation windows, deposits + balance logic
  canSetComplexBookingLogic: false,
  
  maxPaymentProviders: Infinity, // Multiple payment methods
  canSetCountryBasedPayments: true, // Multiple payment methods based on country
  
  canConnectCustomDomain: true, // Custom domain connection
  hasDomainSetupAssistance: false,
  
  hasAutomatedEmails: true, // booking confirmation, reminders, cancellation notices
  
  hasGuidedSetup: true,
  hasSetupSession: true, // One guided setup or review session
  hasPostLaunchSupport: false,
  
  isDoneForYou: false,
}

/**
 * Tier 3 - Full Operations Suite
 * "I want this handled. I don't want to touch tech."
 */
const TIER_3_PERMISSIONS: TierPermissions = {
  // Includes everything from Tier 2
  canEditPages: true,
  availablePages: ['Home', 'About', 'Services', 'Booking', 'Blog / Content', 'Legal pages'],
  
  canModifyLayout: true,
  canAdjustFlow: true,
  
  canSetBasicBookingRules: true,
  canSetAdvancedBookingRules: true,
  canSetComplexBookingLogic: true, // service-specific rules, conditional deposits
  
  maxPaymentProviders: Infinity,
  canSetCountryBasedPayments: true,
  
  canConnectCustomDomain: true,
  hasDomainSetupAssistance: true, // Domain setup + launch handled
  
  hasAutomatedEmails: true,
  
  hasGuidedSetup: true,
  hasSetupSession: true,
  hasPostLaunchSupport: true, // Post-launch support window
  
  isDoneForYou: true, // Full system setup done-for-you
}

const TIER_PERMISSIONS_MAP: Record<TierId, TierPermissions> = {
  starter: TIER_1_PERMISSIONS,
  business: TIER_2_PERMISSIONS,
  premium: TIER_3_PERMISSIONS,
}

/**
 * Get permissions for a specific tier
 */
export function getTierPermissions(tierId: TierId | string): TierPermissions {
  const normalizedId = tierId.toLowerCase()
  
  if (normalizedId === 'starter' || normalizedId === 'tier-1' || normalizedId === 'tier1') {
    return TIER_1_PERMISSIONS
  }
  
  if (normalizedId === 'business' || normalizedId === 'tier-2' || normalizedId === 'tier2') {
    return TIER_2_PERMISSIONS
  }
  
  if (normalizedId === 'premium' || normalizedId === 'tier-3' || normalizedId === 'tier3' || normalizedId === 'full operations suite') {
    return TIER_3_PERMISSIONS
  }
  
  // Default to tier 1 if unknown
  console.warn(`Unknown tier ID: ${tierId}, defaulting to Tier 1 permissions`)
  return TIER_1_PERMISSIONS
}

/**
 * Check if a specific feature is available for a tier
 */
export function hasFeature(tierId: TierId | string, feature: keyof TierPermissions): boolean {
  const permissions = getTierPermissions(tierId)
  return permissions[feature] === true
}

/**
 * Check if tier allows multiple payment providers
 */
export function canAddPaymentProvider(tierId: TierId | string, currentCount: number): boolean {
  const permissions = getTierPermissions(tierId)
  return currentCount < permissions.maxPaymentProviders
}

/**
 * Check if tier allows custom domain
 */
export function canConnectCustomDomain(tierId: TierId | string): boolean {
  return hasFeature(tierId, 'canConnectCustomDomain')
}

/**
 * Check if tier allows advanced booking rules
 */
export function canUseAdvancedBookingRules(tierId: TierId | string): boolean {
  return hasFeature(tierId, 'canSetAdvancedBookingRules')
}

/**
 * Check if tier allows layout modifications
 */
export function canModifyLayout(tierId: TierId | string): boolean {
  return hasFeature(tierId, 'canModifyLayout')
}

