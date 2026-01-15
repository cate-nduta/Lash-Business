'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import AdminBackButton from '@/components/AdminBackButton'
import type { ConsultationSubmission } from '@/app/api/labs/consultation/route'
import type { InvoiceItem, ConsultationInvoice } from '@/app/api/admin/labs/invoices/route'
import { convertCurrency, type Currency, type ExchangeRates } from '@/lib/currency-utils'

const authorizedFetch = (input: RequestInfo | URL, init: RequestInit = {}) =>
  fetch(input, { credentials: 'include', ...init })

export default function AdminLabsConsultations() {
  const [consultations, setConsultations] = useState<ConsultationSubmission[]>([])
  const [loading, setLoading] = useState(true)
  const [expandedId, setExpandedId] = useState<string | null>(null)
  const [filter, setFilter] = useState<'all' | 'recent' | 'with-tier'>('all')
  const [showInvoiceModal, setShowInvoiceModal] = useState(false)
  const [selectedConsultation, setSelectedConsultation] = useState<ConsultationSubmission | null>(null)
  const [invoiceItems, setInvoiceItems] = useState<InvoiceItem[]>([
    { description: 'Consultation Fee', quantity: 1, unitPrice: 0, total: 0 },
  ])
  const [taxRate, setTaxRate] = useState<number>(0)
  const [discountType, setDiscountType] = useState<'amount' | 'percentage'>('amount')
  const [discountValue, setDiscountValue] = useState<number>(0)
  const [invoiceCurrency, setInvoiceCurrency] = useState<string>('')
  const [notes, setNotes] = useState<string>('')
  const [dueDate, setDueDate] = useState<string>('')
  const [creatingInvoice, setCreatingInvoice] = useState(false)
  const [downpaymentPercent, setDownpaymentPercent] = useState<number>(80)
  const [finalPaymentPercent, setFinalPaymentPercent] = useState<number>(20)
  const [invoiceType, setInvoiceType] = useState<'downpayment' | 'final'>('downpayment')
  const [existingInvoices, setExistingInvoices] = useState<ConsultationInvoice[]>([])
  const [sendingInvoiceId, setSendingInvoiceId] = useState<string | null>(null)
  const [sendingRemainingBalanceId, setSendingRemainingBalanceId] = useState<string | null>(null)
  const [markingPaymentId, setMarkingPaymentId] = useState<{ invoiceId: string; paymentType: 'upfront' | 'final' } | null>(null)
  const [showBuildEmailModal, setShowBuildEmailModal] = useState(false)
  const [selectedTierForBuild, setSelectedTierForBuild] = useState<string>('')
  const [availableTiers, setAvailableTiers] = useState<Array<{ id: string; name: string; priceKES: number }>>([])
  const [sendingBuildEmail, setSendingBuildEmail] = useState(false)
  const [selectedInvoiceForBuild, setSelectedInvoiceForBuild] = useState<string>('')
  const [selectedTierForInvoice, setSelectedTierForInvoice] = useState<string>('')
  const [loadingTierForInvoice, setLoadingTierForInvoice] = useState(false)
  const [deletingAll, setDeletingAll] = useState(false)
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)
  const [exchangeRates, setExchangeRates] = useState<ExchangeRates | null>(null)
  const [showContractModal, setShowContractModal] = useState(false)
  const [sendingContract, setSendingContract] = useState(false)
  const [contractProjectDescription, setContractProjectDescription] = useState<string>('')
  const [contractProjectCost, setContractProjectCost] = useState<number>(0)
  const [contractTaxRate, setContractTaxRate] = useState<number>(0)
  const [selectedTierForContract, setSelectedTierForContract] = useState<string>('')
  const [contractTerms, setContractTerms] = useState<any>(null)
  const [contractStatuses, setContractStatuses] = useState<Record<string, { hasContract: boolean; contractStatus: string | null; contract: any }>>({})
  const router = useRouter()

  useEffect(() => {
    let isMounted = true

    const checkAuth = async () => {
      try {
        const response = await authorizedFetch('/api/admin/current-user')
        if (!response.ok) {
          throw new Error('Unauthorized')
        }
        const data = await response.json()
        if (!isMounted) return
        if (!data.authenticated) {
          router.replace('/admin/login')
          return
        }
        loadConsultations()
        loadTiers()
      } catch (error) {
        if (!isMounted) return
        router.replace('/admin/login')
      }
    }

    checkAuth()

    return () => {
      isMounted = false
    }
  }, [router])

  const loadExchangeRates = async () => {
    try {
      const response = await authorizedFetch('/api/admin/settings', { cache: 'no-store' })
      if (response.ok) {
        const data = await response.json()
        if (data.exchangeRates) {
          setExchangeRates({
            usdToKes: data.exchangeRates.usdToKes || 130,
          })
        }
      }
    } catch (error) {
      console.error('Error loading exchange rates:', error)
      // Set default rate on error
      setExchangeRates({ usdToKes: 130 })
    }
  }

  const loadTiers = async () => {
    try {
      const response = await authorizedFetch('/api/admin/labs', { cache: 'no-store' })
      if (response.ok) {
        const data = await response.json()
        setAvailableTiers(data.tiers || [])
      }
    } catch (error) {
      console.error('Error loading tiers:', error)
    }
  }

  const loadConsultations = async () => {
    try {
      const response = await authorizedFetch('/api/admin/labs/consultations')
      if (!response.ok) {
        throw new Error('Failed to load consultations')
      }
      const data = await response.json()
      setConsultations(data.consultations || [])
      
      // Load contract statuses for all consultations
      const statuses: Record<string, { hasContract: boolean; contractStatus: string | null; contract: any }> = {}
      for (const consultation of data.consultations || []) {
        const consultationId = consultation.consultationId || consultation.submittedAt
        try {
          const contractResponse = await authorizedFetch(`/api/admin/labs/consultations/${consultationId}/contract-status`)
          if (contractResponse.ok) {
            const contractData = await contractResponse.json()
            statuses[consultationId] = contractData
          }
        } catch (error) {
          console.error(`Error loading contract status for ${consultationId}:`, error)
        }
      }
      setContractStatuses(statuses)
    } catch (error) {
      console.error('Error loading consultations:', error)
    } finally {
      setLoading(false)
    }
  }
  
  const refreshContractStatus = async (consultationId: string) => {
    try {
      const response = await authorizedFetch(`/api/admin/labs/consultations/${consultationId}/contract-status`)
      if (response.ok) {
        const data = await response.json()
        setContractStatuses(prev => ({
          ...prev,
          [consultationId]: data,
        }))
      }
    } catch (error) {
      console.error('Error refreshing contract status:', error)
    }
  }

  const loadInvoices = async (consultationId: string) => {
    try {
      const response = await authorizedFetch(`/api/admin/labs/invoices?consultationId=${encodeURIComponent(consultationId)}`)
      if (response.ok) {
        const data = await response.json()
        setExistingInvoices(data.invoices || [])
      }
    } catch (error) {
      console.error('Error loading invoices:', error)
    }
  }

  const openInvoiceModal = async (consultation: ConsultationSubmission) => {
    // Check contract status first
    const consultationId = consultation.consultationId || consultation.submittedAt
    const contractStatus = contractStatuses[consultationId]
    
    if (contractStatus?.hasContract && contractStatus.contractStatus === 'expired') {
      alert('The contract has expired. Please send a new contract first, then wait for it to be signed before creating an invoice.')
      return
    }
    
    // Allow opening the modal even if contract isn't signed - user can preview pricing
    // We'll show a warning in the modal instead
    
    setSelectedConsultation(consultation)
    const tierName = consultation.selectedTier || consultation.interestedTier || ''
    setSelectedTierForInvoice(tierName)
    
    // Pre-fill consultation fee
    const initialItems: InvoiceItem[] = [
      {
        description: 'Consultation Fee',
        quantity: 1,
        unitPrice: consultation.consultationPrice || 0,
        total: consultation.consultationPrice || 0,
      },
    ]
    
    // If tier is selected, load tier details and pre-populate services
    if (tierName) {
      await loadTierServicesForInvoice(tierName, initialItems, consultation.currency || 'KES')
    } else {
      setInvoiceItems(initialItems)
    }
    
    setTaxRate(0)
    setDiscountType('amount')
    setDiscountValue(0)
    setNotes('')
    // Reset payment split to defaults
    setDownpaymentPercent(80)
    setFinalPaymentPercent(20)
    setInvoiceType('downpayment')
    // Set due date to 30 days from now
    const futureDate = new Date()
    futureDate.setDate(futureDate.getDate() + 30)
    setDueDate(futureDate.toISOString().split('T')[0])
    loadInvoices(consultation.consultationId || consultation.submittedAt)
    setShowInvoiceModal(true)
  }

  const loadTierServicesForInvoice = async (tierName: string, existingItems: InvoiceItem[], currency: string) => {
    setLoadingTierForInvoice(true)
    try {
      const response = await authorizedFetch('/api/admin/labs', { cache: 'no-store' })
      if (response.ok) {
        const data = await response.json()
        const tier = data.tiers?.find((t: any) => t.name === tierName)
        
        if (tier) {
          // IMPORTANT: consultationPrice is ALREADY in the consultation's currency
          // If currency is USD, consultationPrice is in USD
          // If currency is KES, consultationPrice is in KES
          const consultationFeeItem = existingItems[0]
          const consultationFee = consultationFeeItem?.total || 0
          
          // Tier price is always stored in KES - convert to consultation currency
          let tierPriceInCurrency = tier.priceKES
          if (currency === 'USD') {
            if (exchangeRates) {
              tierPriceInCurrency = convertCurrency(tier.priceKES, 'KES', currency as Currency, exchangeRates)
            } else {
              // Fallback to default rate
              const defaultRates = { usdToKes: 130 }
              tierPriceInCurrency = convertCurrency(tier.priceKES, 'KES', currency as Currency, defaultRates)
            }
          }
          
          // Calculate remaining amount in the consultation's currency
          const remainingAmount = tierPriceInCurrency - consultationFee
          const featureCount = tier.features.included.length
          const suggestedPrice = featureCount > 0 ? Math.round(remainingAmount / featureCount) : 0
          
          // Convert tier features into invoice items
          // All prices are in the consultation's currency
          const tierItems: InvoiceItem[] = tier.features?.included?.map((feature: string, index: number) => {
            return {
              description: feature,
              quantity: 1,
              unitPrice: suggestedPrice,
              total: suggestedPrice,
            }
          }) || []
          
          // Consultation fee is already in the correct currency, no conversion needed
          // Combine consultation fee with tier services
          setInvoiceItems([...existingItems, ...tierItems])
        } else {
          setInvoiceItems(existingItems)
        }
      } else {
        setInvoiceItems(existingItems)
      }
    } catch (error) {
      console.error('Error loading tier services:', error)
      setInvoiceItems(existingItems)
    } finally {
      setLoadingTierForInvoice(false)
    }
  }

  const handleTierChangeForInvoice = async (tierName: string) => {
    setSelectedTierForInvoice(tierName)
    if (!selectedConsultation) return
    
    const consultationCurrency = selectedConsultation.currency || 'KES'
    const consultationFee = invoiceItems.find(item => item.description === 'Consultation Fee')
    
    // Consultation price is already in the consultation's currency
    const consultationPrice = selectedConsultation.consultationPrice || 0
    
    const consultationItems: InvoiceItem[] = consultationFee 
      ? [consultationFee]
      : [{
          description: 'Consultation Fee',
          quantity: 1,
          unitPrice: consultationPrice,
          total: consultationPrice,
        }]
    
    if (tierName) {
      await loadTierServicesForInvoice(tierName, consultationItems, consultationCurrency)
    } else {
      setInvoiceItems(consultationItems)
    }
  }

  const addInvoiceItem = () => {
    setInvoiceItems([...invoiceItems, { description: '', quantity: 1, unitPrice: 0, total: 0 }])
  }

  const updateInvoiceItem = (index: number, field: keyof InvoiceItem, value: any) => {
    const updated = [...invoiceItems]
    updated[index] = { ...updated[index], [field]: value }
    if (field === 'quantity' || field === 'unitPrice') {
      updated[index].total = (updated[index].quantity || 1) * (updated[index].unitPrice || 0)
    }
    setInvoiceItems(updated)
  }

  const removeInvoiceItem = (index: number) => {
    setInvoiceItems(invoiceItems.filter((_: InvoiceItem, i: number) => i !== index))
  }

  const calculateTotals = () => {
    const subtotal = invoiceItems.reduce((sum, item) => sum + item.total, 0)
    const tax = taxRate ? subtotal * (taxRate / 100) : 0
    const subtotalAfterTax = subtotal + tax
    
    // Calculate discount
    let discount = 0
    if (discountValue > 0) {
      if (discountType === 'percentage') {
        discount = subtotalAfterTax * (discountValue / 100)
      } else {
        discount = discountValue
      }
      // Ensure discount doesn't exceed subtotal after tax
      discount = Math.min(discount, subtotalAfterTax)
    }
    
    const total = subtotalAfterTax - discount
    return { subtotal, tax, discount, total }
  }

  const handleCreateInvoice = async () => {
    if (!selectedConsultation) return

    // Check contract status
    const consultationId = selectedConsultation.consultationId || selectedConsultation.submittedAt
    const contractStatus = contractStatuses[consultationId]
    
    if (contractStatus?.hasContract && contractStatus.contractStatus === 'expired') {
      alert('The contract has expired. Please send a new contract first, then wait for it to be signed before creating an invoice.')
      return
    }
    
    if (contractStatus?.hasContract && contractStatus.contractStatus !== 'signed') {
      alert('The contract must be signed before you can create an invoice. Please wait for the client to sign the contract.')
      return
    }
    
    if (!contractStatus?.hasContract) {
      alert('Please send a contract first, then wait for it to be signed before creating an invoice.')
      return
    }

    // Validate items
    if (invoiceItems.length === 0 || invoiceItems.some(item => !item.description.trim())) {
      alert('Please fill in all invoice items')
      return
    }

    setCreatingInvoice(true)
    try {
      const response = await authorizedFetch('/api/admin/labs/invoices', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            consultationId: selectedConsultation.consultationId || selectedConsultation.submittedAt,
            items: invoiceItems,
            taxRate: taxRate || undefined,
            discountType: discountValue > 0 ? discountType : undefined,
            discountValue: discountValue > 0 ? discountValue : undefined,
            currency: invoiceCurrency || selectedConsultation.currency || 'KES',
            notes: notes.trim() || undefined,
            dueDate: dueDate || undefined,
            invoiceType: invoiceType, // 'downpayment' or 'final'
            downpaymentPercent: downpaymentPercent,
            finalPaymentPercent: finalPaymentPercent,
          }),
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || 'Failed to create invoice')
      }

      const data = await response.json()
      alert('Invoice created successfully!')
      setShowInvoiceModal(false)
      loadInvoices(selectedConsultation.consultationId || selectedConsultation.submittedAt)
    } catch (error: any) {
      alert(error.message || 'Failed to create invoice')
    } finally {
      setCreatingInvoice(false)
    }
  }

  const formatCurrency = (amount: number, currency: Currency | string) => {
    if (currency === 'USD') {
      return `$${amount.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
    }
    return `KSH ${Math.round(amount).toLocaleString('en-KE')}`
  }

  const handleSendInvoice = async (invoiceId: string) => {
    setSendingInvoiceId(invoiceId)
    try {
      const response = await authorizedFetch(`/api/admin/labs/invoices/${invoiceId}/send`, {
        method: 'POST',
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || 'Failed to send invoice')
      }

      const data = await response.json()
      alert('Invoice sent successfully to ' + (selectedConsultation?.email || 'client'))
      
      // Reload invoices to update status
      if (selectedConsultation) {
        loadInvoices(selectedConsultation.consultationId || selectedConsultation.submittedAt)
      }
    } catch (error: any) {
      alert(error.message || 'Failed to send invoice')
    } finally {
      setSendingInvoiceId(null)
    }
  }

  const handleSendRemainingBalance = async (invoiceId: string) => {
    if (!confirm('Send remaining balance (20%) email to the client? This will generate a payment link for the final payment.')) {
      return
    }

    setSendingRemainingBalanceId(invoiceId)
    try {
      const response = await authorizedFetch(`/api/admin/labs/invoices/${invoiceId}/send-remaining-balance`, {
        method: 'POST',
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || 'Failed to send remaining balance email')
      }

      const data = await response.json()
      alert(`Remaining balance email sent successfully! The client will receive a payment link for ${formatCurrency(data.remainingBalance, selectedConsultation?.currency || 'KES')} (20% final payment).`)
      
      // Reload invoices to update status
      if (selectedConsultation) {
        loadInvoices(selectedConsultation.consultationId || selectedConsultation.submittedAt)
      }
    } catch (error: any) {
      alert(error.message || 'Failed to send remaining balance email')
    } finally {
      setSendingRemainingBalanceId(null)
    }
  }

  const openBuildEmailModal = (consultation: ConsultationSubmission) => {
    setSelectedConsultation(consultation)
    setSelectedTierForBuild(consultation.selectedTier || consultation.interestedTier || '')
    setSelectedInvoiceForBuild('')
    loadInvoices(consultation.consultationId || consultation.submittedAt)
    setShowBuildEmailModal(true)
  }

  const handleSendBuildEmail = async () => {
    if (!selectedConsultation || !selectedTierForBuild) {
      alert('Please select a tier')
      return
    }

    setSendingBuildEmail(true)
    try {
      const response = await authorizedFetch(
        `/api/admin/labs/consultations/${selectedConsultation.consultationId || selectedConsultation.submittedAt}/build-email`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            tierName: selectedTierForBuild,
            invoiceId: selectedInvoiceForBuild || undefined,
          }),
        }
      )

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || 'Failed to send build email')
      }

      alert('Build email sent successfully!')
      setShowBuildEmailModal(false)
      loadConsultations() // Reload to show updated outcome
    } catch (error: any) {
      alert(error.message || 'Failed to send build email')
    } finally {
      setSendingBuildEmail(false)
    }
  }

  const handleDeleteAll = async () => {
    setDeletingAll(true)
    try {
      const response = await authorizedFetch('/api/admin/labs/consultations', {
        method: 'DELETE',
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || 'Failed to delete consultations')
      }

      alert('All consultations deleted successfully!')
      setShowDeleteConfirm(false)
      loadConsultations() // Reload to show empty list
    } catch (error: any) {
      alert(error.message || 'Failed to delete consultations')
    } finally {
      setDeletingAll(false)
    }
  }

  const openContractModal = async (consultation: ConsultationSubmission) => {
    setSelectedConsultation(consultation)
    
    // Set initial tier selection
    const initialTier = consultation.selectedTier || consultation.interestedTier || ''
    setSelectedTierForContract(initialTier)
    
    // Pre-fill project description
    setContractProjectDescription(
      initialTier
        ? `LashDiary Labs - ${initialTier} System Setup`
        : 'LashDiary Labs System Setup'
    )
    
    // Initialize tax rate
    setContractTaxRate(0)
    
    // Load contract template
    try {
      const templateResponse = await authorizedFetch('/api/admin/labs/contract-template')
      let templateTerms: any = null
      
      if (templateResponse.ok) {
        const templateData = await templateResponse.json()
        templateTerms = templateData.template?.contractTerms
      }
      
      // Initialize contract terms with template values (if available) or defaults
      const upfrontPercent = templateTerms?.paymentTerms?.upfrontPercentage || 80
      const finalPercent = templateTerms?.paymentTerms?.finalPercentage || 20
      
      setContractTerms({
        deliverables: {
          included: [''],
          notIncluded: [''],
          extras: [''],
        },
        paymentTerms: {
          consultationFee: consultation.consultationPrice || 0,
          consultationFeeNonRefundable: templateTerms?.paymentTerms?.consultationFeeNonRefundable ?? true,
          upfrontPercentage: upfrontPercent,
          upfrontAmount: 0,
          finalPercentage: finalPercent,
          finalAmount: 0,
          finalPaymentDue: templateTerms?.paymentTerms?.finalPaymentDue || 'before launch',
          invoiceExpiryDays: templateTerms?.paymentTerms?.invoiceExpiryDays || 7,
          noWorkWithoutPayment: templateTerms?.paymentTerms?.noWorkWithoutPayment ?? true,
        },
        timelines: {
          clientResponsibilities: templateTerms?.timelines?.clientResponsibilities || [],
          clientDelays: templateTerms?.timelines?.clientDelays || 'Project timeline may be extended',
          providerDelays: templateTerms?.timelines?.providerDelays || 'We will communicate any delays promptly',
        },
        boundaries: {
          revisionLimit: templateTerms?.boundaries?.revisionLimit || 2,
          revisionType: templateTerms?.boundaries?.revisionType || 'rounds',
          noRefundsAfterStart: templateTerms?.boundaries?.noRefundsAfterStart ?? true,
          noEndlessChanges: templateTerms?.boundaries?.noEndlessChanges ?? true,
        },
        confidentiality: {
          providerRetainsIPUntilPayment: templateTerms?.confidentiality?.providerRetainsIPUntilPayment ?? true,
          clientReceivesIPOnFullPayment: templateTerms?.confidentiality?.clientReceivesIPOnFullPayment ?? true,
          mutualNDA: templateTerms?.confidentiality?.mutualNDA ?? true,
        },
        cancellation: {
          clientCancellationPolicy: templateTerms?.cancellation?.clientCancellationPolicy || 'Consultation fee is non-refundable',
          providerCancellationPolicy: templateTerms?.cancellation?.providerCancellationPolicy || 'Full refund if we cancel',
        },
        liability: {
          noIndirectDamages: templateTerms?.liability?.noIndirectDamages ?? true,
          noThirdPartyResponsibility: templateTerms?.liability?.noThirdPartyResponsibility ?? true,
        },
      })
    } catch (error) {
      console.error('Error loading contract template:', error)
      // Use defaults if template loading fails
      const upfrontPercent = 80
      const finalPercent = 20
      
      setContractTerms({
        deliverables: {
          included: [''],
          notIncluded: [''],
          extras: [''],
        },
        paymentTerms: {
          consultationFee: consultation.consultationPrice || 0,
          consultationFeeNonRefundable: true,
          upfrontPercentage: upfrontPercent,
          upfrontAmount: 0,
          finalPercentage: finalPercent,
          finalAmount: 0,
          finalPaymentDue: 'before launch',
          invoiceExpiryDays: 7,
          noWorkWithoutPayment: true,
        },
        timelines: {
          clientResponsibilities: [],
          clientDelays: 'Project timeline may be extended',
          providerDelays: 'We will communicate any delays promptly',
        },
        boundaries: {
          revisionLimit: 2,
          revisionType: 'rounds',
          noRefundsAfterStart: true,
          noEndlessChanges: true,
        },
        confidentiality: {
          providerRetainsIPUntilPayment: true,
          clientReceivesIPOnFullPayment: true,
          mutualNDA: true,
        },
        cancellation: {
          clientCancellationPolicy: 'Consultation fee is non-refundable',
          providerCancellationPolicy: 'Full refund if we cancel',
        },
        liability: {
          noIndirectDamages: true,
          noThirdPartyResponsibility: true,
        },
      })
    }
    
    // If tier is pre-selected, load its data
    if (initialTier) {
      handleTierChangeForContract(initialTier, consultation)
    } else {
      setContractProjectCost(0)
    }
    
    setShowContractModal(true)
  }
  
  const handleTierChangeForContract = (tierName: string, consultation: ConsultationSubmission) => {
    setSelectedTierForContract(tierName)
    
    const tier = availableTiers.find(t => t.name === tierName)
    if (tier) {
      const consultationCurrency = consultation.currency || 'KES'
      let tierPrice = tier.priceKES
      if (consultationCurrency === 'USD') {
        if (exchangeRates) {
          tierPrice = tier.priceKES / exchangeRates.usdToKes
        } else {
          tierPrice = tier.priceKES / 130 // Default rate
        }
      }
      
      // Calculate project cost (excluding consultation fee)
      const projectCost = Math.round(tierPrice - (consultation.consultationPrice || 0))
      setContractProjectCost(projectCost)
      
      // Update project description
      setContractProjectDescription(`LashDiary Labs - ${tierName} System Setup`)
      
      // Pre-populate deliverables from tier
      const defaultIncluded = (tier as any).features?.included || ['']
      const defaultNotIncluded = (tier as any).features?.excluded || ['']
      const defaultExtras = ['']
      
      // Recalculate payment terms with new cost
      const upfrontPercent = 80
      const finalPercent = 20
      const taxAmount = contractTaxRate ? (projectCost * contractTaxRate / 100) : 0
      const totalWithTax = projectCost + taxAmount
      
      setContractTerms((prev: any) => ({
        ...prev,
        deliverables: {
          included: defaultIncluded,
          notIncluded: defaultNotIncluded,
          extras: defaultExtras,
        },
        paymentTerms: {
          ...prev.paymentTerms,
          upfrontAmount: Math.round(totalWithTax * (upfrontPercent / 100)),
          finalAmount: Math.round(totalWithTax * (finalPercent / 100)),
        },
      }))
    }
  }

  const handleSendContract = async () => {
    if (!selectedConsultation || !contractProjectCost || !contractTerms || !selectedTierForContract) {
      alert('Please fill in all required fields (Tier, Project Cost, and Contract Terms)')
      return
    }

    // Calculate total with tax
    const taxAmount = contractTaxRate ? (contractProjectCost * contractTaxRate / 100) : 0
    const totalWithTax = contractProjectCost + taxAmount

    // Filter out empty strings from deliverables
    const cleanedContractTerms = {
      ...contractTerms,
      deliverables: {
        included: contractTerms.deliverables.included.filter((item: string) => item.trim().length > 0),
        notIncluded: contractTerms.deliverables.notIncluded.filter((item: string) => item.trim().length > 0),
        extras: contractTerms.deliverables.extras.filter((item: string) => item.trim().length > 0),
      },
    }

    setSendingContract(true)
    try {
      const response = await authorizedFetch(
        `/api/admin/labs/consultations/${selectedConsultation.consultationId || selectedConsultation.submittedAt}/send-contract`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            projectDescription: contractProjectDescription,
            projectCost: Math.round(totalWithTax), // Send total including tax
            contractTerms: cleanedContractTerms,
          }),
        }
      )

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || 'Failed to send contract')
      }

      const data = await response.json()
      alert('Contract sent successfully! The client will receive an email with a link to review and sign the contract.')
      setShowContractModal(false)
      
      // Refresh contract status for this consultation
      if (selectedConsultation) {
        const consultationId = selectedConsultation.consultationId || selectedConsultation.submittedAt
        await refreshContractStatus(consultationId)
      }
      
      loadConsultations() // Reload to show updated contract status
    } catch (error: any) {
      alert(error.message || 'Failed to send contract')
    } finally {
      setSendingContract(false)
    }
  }

  const formatDate = (dateStr: string) => {
    try {
      const date = new Date(dateStr)
      return date.toLocaleString('en-US', {
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric',
        hour: 'numeric',
        minute: '2-digit',
      })
    } catch {
      return dateStr
    }
  }

  const formatTime = (timeStr: string) => {
    if (!timeStr) return 'Not specified'
    const timeMap: Record<string, string> = {
      morning: 'Morning (9 AM - 12 PM)',
      afternoon: 'Afternoon (12 PM - 4 PM)',
      evening: 'Evening (4 PM - 7 PM)',
    }
    return timeMap[timeStr.toLowerCase()] || timeStr
  }

  // Parse time label and create datetime in Nairobi timezone
  const parseTimeLabelToDateTime = (dateStr: string, timeLabel: string): Date | null => {
    try {
      // Parse time label like "9:30 AM" or "morning"
      const timeMatch = timeLabel.match(/(\d{1,2}):(\d{2})\s*(AM|PM)/i)
      if (timeMatch) {
        let hours = parseInt(timeMatch[1], 10)
        const minutes = parseInt(timeMatch[2], 10)
        const period = timeMatch[3].toUpperCase()
        
        if (period === 'PM' && hours !== 12) hours += 12
        else if (period === 'AM' && hours === 12) hours = 0
        
        // Create datetime in Nairobi timezone (UTC+3)
        const nairobiDateTime = `${dateStr}T${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}:00+03:00`
        return new Date(nairobiDateTime)
      }
      
      // Handle fallback time ranges
      if (timeLabel.toLowerCase().includes('morning')) {
        return new Date(`${dateStr}T09:00:00+03:00`)
      } else if (timeLabel.toLowerCase().includes('afternoon')) {
        return new Date(`${dateStr}T13:00:00+03:00`)
      } else if (timeLabel.toLowerCase().includes('evening')) {
        return new Date(`${dateStr}T16:00:00+03:00`)
      }
      
      return null
    } catch {
      return null
    }
  }

  const businessTypeMap: Record<string, string> = {
    'lash-studio': 'Lash Studio',
    'beauty-salon': 'Beauty Salon',
    'spa': 'Spa',
    'nail-salon': 'Nail Salon',
    'hair-salon': 'Hair Salon',
    'barbershop': 'Barbershop',
    'wellness-center': 'Wellness Center',
    'fitness-studio': 'Fitness Studio',
    'other-service': 'Other Service Business',
  }

  const hasWebsiteMap: Record<string, string> = {
    'no': "No, I don't have a website",
    'yes-basic': "Yes, but it's very basic",
    'yes-functional': "Yes, it's functional but needs improvement",
    'yes-good': "Yes, it's good but missing features",
  }

  const preferredContactMap: Record<string, string> = {
    email: 'Email',
    phone: 'Phone call',
    whatsapp: 'WhatsApp',
  }

  const filteredConsultations = consultations.filter((consultation) => {
    if (filter === 'recent') {
      const sevenDaysAgo = new Date()
      sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7)
      return new Date(consultation.submittedAt) >= sevenDaysAgo
    }
    if (filter === 'with-tier') {
      return !!consultation.interestedTier
    }
    return true
  })

  if (loading) {
    return (
      <div className="min-h-screen bg-baby-pink-light flex items-center justify-center">
        <div className="text-brown">Loading consultations...</div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-baby-pink-light py-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <AdminBackButton />
        <div className="mb-8 flex justify-between items-start">
          <div>
            <h1 className="text-3xl font-display text-brown mb-2">Labs Consultation Requests</h1>
            <p className="text-gray-600">View all consultation requests from potential clients</p>
          </div>
          {consultations.length > 0 && (
            <button
              onClick={() => setShowDeleteConfirm(true)}
              className="bg-red-600 text-white px-6 py-2 rounded-lg font-semibold hover:bg-red-700 transition-colors"
            >
              🗑️ Delete All
            </button>
          )}
        </div>

        {/* Filters */}
        <div className="mb-6 flex gap-4">
          <button
            onClick={() => setFilter('all')}
            className={`px-4 py-2 rounded-lg font-semibold transition-colors ${
              filter === 'all'
                ? 'bg-brown-dark text-white'
                : 'bg-white text-brown border-2 border-brown-light hover:border-brown'
            }`}
          >
            All ({consultations.length})
          </button>
          <button
            onClick={() => setFilter('recent')}
            className={`px-4 py-2 rounded-lg font-semibold transition-colors ${
              filter === 'recent'
                ? 'bg-brown-dark text-white'
                : 'bg-white text-brown border-2 border-brown-light hover:border-brown'
            }`}
          >
            Last 7 Days
          </button>
          <button
            onClick={() => setFilter('with-tier')}
            className={`px-4 py-2 rounded-lg font-semibold transition-colors ${
              filter === 'with-tier'
                ? 'bg-brown-dark text-white'
                : 'bg-white text-brown border-2 border-brown-light hover:border-brown'
            }`}
          >
            With Tier Interest
          </button>
        </div>

        {/* Consultations List */}
        {filteredConsultations.length === 0 ? (
          <div className="bg-white rounded-xl shadow-soft border-2 border-brown-light p-12 text-center">
            <p className="text-gray-600 text-lg">No consultations found.</p>
          </div>
        ) : (
          <div className="space-y-4">
            {filteredConsultations.map((consultation) => {
              const isExpanded = expandedId === consultation.submittedAt
              return (
                <div
                  key={consultation.submittedAt}
                  className="bg-white rounded-xl shadow-soft border-2 border-brown-light overflow-hidden"
                >
                  <div
                    className="p-6 cursor-pointer hover:bg-brown-light/10 transition-colors"
                    onClick={() => setExpandedId(isExpanded ? null : consultation.submittedAt)}
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-4 mb-2 flex-wrap">
                          <h3 className="text-xl font-semibold text-brown">
                            {consultation.businessName}
                          </h3>
                          {consultation.interestedTier && (
                            <span className="bg-brown-dark text-white px-3 py-1 rounded-full text-sm font-semibold">
                              Tier: {consultation.interestedTier}
                            </span>
                          )}
                          {(() => {
                            const consultationId = consultation.consultationId || consultation.submittedAt
                            const contractStatus = contractStatuses[consultationId]
                            if (contractStatus?.hasContract) {
                              return (
                                <span className={`px-3 py-1 rounded-full text-sm font-semibold ${
                                  contractStatus.contractStatus === 'signed'
                                    ? 'bg-green-600 text-white'
                                    : contractStatus.contractStatus === 'pending'
                                    ? 'bg-yellow-600 text-white'
                                    : contractStatus.contractStatus === 'expired'
                                    ? 'bg-red-600 text-white'
                                    : 'bg-gray-400 text-white'
                                }`}>
                                  {contractStatus.contractStatus === 'signed' ? '✓ Contract Signed' : 
                                   contractStatus.contractStatus === 'pending' ? '⏳ Contract Pending' : 
                                   contractStatus.contractStatus === 'expired' ? '⏰ Contract Expired' :
                                   'Contract Unknown'}
                                </span>
                              )
                            }
                            return null
                          })()}
                        </div>
                        <p className="text-gray-600 mb-1">
                          <strong>Contact:</strong> {consultation.contactName}
                        </p>
                        <p className="text-gray-600 mb-1">
                          <strong>Email:</strong>{' '}
                          <a
                            href={`mailto:${consultation.email}`}
                            className="text-brown hover:underline"
                            onClick={(e) => e.stopPropagation()}
                          >
                            {consultation.email}
                          </a>
                        </p>
                        <p className="text-gray-600 mb-1">
                          <strong>Phone:</strong>{' '}
                          <a
                            href={`tel:${consultation.phone}`}
                            className="text-brown hover:underline"
                            onClick={(e) => e.stopPropagation()}
                          >
                            {consultation.phone}
                          </a>
                        </p>
                        <p className="text-sm text-gray-500 mt-2">
                          Submitted: {formatDate(consultation.submittedAt)}
                        </p>
                      </div>
                      <div className="text-right">
                        <div className="text-2xl font-bold text-brown mb-1">
                          {consultation.consultationPrice.toLocaleString()} {consultation.currency}
                        </div>
                        <span className="text-gray-500 text-sm">{isExpanded ? '▼' : '▶'}</span>
                      </div>
                    </div>
                  </div>

                  {isExpanded && (
                    <div className="border-t-2 border-brown-light p-6 space-y-6">
                      {/* Business Information */}
                      <div>
                        <h4 className="text-lg font-semibold text-brown mb-3 border-b-2 border-brown-light pb-2">
                          Business Information
                        </h4>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <div>
                            <p className="text-sm text-gray-600 mb-1">
                              <strong>Business Type:</strong> {businessTypeMap[consultation.businessType] || consultation.businessType}
                            </p>
                            <p className="text-sm text-gray-600 mb-1">
                              <strong>Services Offered:</strong> {consultation.serviceType}
                            </p>
                            {consultation.monthlyClients && (
                              <p className="text-sm text-gray-600 mb-1">
                                <strong>Monthly Clients:</strong> {consultation.monthlyClients}
                              </p>
                            )}
                          </div>
                          <div>
                            <p className="text-sm text-gray-600 mb-1">
                              <strong>Has Website:</strong> {hasWebsiteMap[consultation.hasWebsite] || consultation.hasWebsite || 'Not specified'}
                            </p>
                            {consultation.currentWebsite && (
                              <p className="text-sm text-gray-600 mb-1">
                                <strong>Current Website:</strong>{' '}
                                <a
                                  href={consultation.currentWebsite}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="text-brown hover:underline"
                                >
                                  {consultation.currentWebsite}
                                </a>
                              </p>
                            )}
                            <p className="text-sm text-gray-600 mb-1">
                              <strong>Booking System:</strong> {consultation.currentBookingSystem || 'Not specified'}
                            </p>
                            <p className="text-sm text-gray-600 mb-1">
                              <strong>Payment System:</strong> {consultation.currentPaymentSystem || 'Not specified'}
                            </p>
                          </div>
                        </div>
                      </div>

                      {/* Pain Points */}
                      <div>
                        <h4 className="text-lg font-semibold text-brown mb-3 border-b-2 border-brown-light pb-2">
                          Pain Points & Goals
                        </h4>
                        <div className="bg-brown-light/20 p-4 rounded-lg">
                          <p className="text-gray-700 whitespace-pre-wrap">{consultation.mainPainPoints}</p>
                        </div>
                      </div>

                      {/* Project Details */}
                      <div>
                        <h4 className="text-lg font-semibold text-brown mb-3 border-b-2 border-brown-light pb-2">
                          Project Details
                        </h4>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          {consultation.interestedTier && (
                            <div>
                              <p className="text-sm text-gray-600 mb-1">
                                <strong>Interested Tier:</strong>{' '}
                                <span className="font-semibold text-brown">{consultation.interestedTier}</span>
                              </p>
                            </div>
                          )}
                          {consultation.budgetRange && (
                            <p className="text-sm text-gray-600 mb-1">
                              <strong>Budget Range:</strong> {consultation.budgetRange}
                            </p>
                          )}
                          {consultation.timeline && (
                            <p className="text-sm text-gray-600 mb-1">
                              <strong>Timeline:</strong> {consultation.timeline}
                            </p>
                          )}
                        </div>
                      </div>

                      {/* Consultation Preferences */}
                      <div>
                        <h4 className="text-lg font-semibold text-brown mb-3 border-b-2 border-brown-light pb-2">
                          Consultation Preferences
                        </h4>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <p className="text-sm text-gray-600 mb-1">
                            <strong>Preferred Contact:</strong> {preferredContactMap[consultation.preferredContact] || consultation.preferredContact}
                          </p>
                          {consultation.preferredDate && (
                            <p className="text-sm text-gray-600 mb-1">
                              <strong>Preferred Date:</strong> {formatDate(consultation.preferredDate)}
                            </p>
                          )}
                          {consultation.preferredTime && (
                            <p className="text-sm text-gray-600 mb-1">
                              <strong>Preferred Time:</strong> {formatTime(consultation.preferredTime)}
                            </p>
                          )}
                        </div>
                        {consultation.clientTimezone && consultation.clientCountry && consultation.preferredDate && consultation.preferredTime && (
                          <div className="mt-4 p-4 bg-blue-50 border border-blue-200 rounded-lg">
                            <p className="text-sm font-semibold text-blue-900 mb-2">
                              {consultation.contactName} — {consultation.clientCountry}
                            </p>
                            <div className="space-y-1 text-sm">
                              <p className="text-blue-800">
                                <span className="font-medium">Client time:</span>{' '}
                                {(() => {
                                  try {
                                    const dateTime = parseTimeLabelToDateTime(consultation.preferredDate, consultation.preferredTime)
                                    if (dateTime) {
                                      return new Intl.DateTimeFormat('en-US', {
                                        timeZone: consultation.clientTimezone,
                                        hour: 'numeric',
                                        minute: '2-digit',
                                        hour12: true,
                                      }).format(dateTime)
                                    }
                                    return formatTime(consultation.preferredTime)
                                  } catch {
                                    return formatTime(consultation.preferredTime)
                                  }
                                })()}{' '}
                                ({consultation.clientTimezone.replace(/_/g, ' ')})
                              </p>
                              <p className="text-blue-800">
                                <span className="font-medium">Your time:</span>{' '}
                                {(() => {
                                  try {
                                    const dateTime = parseTimeLabelToDateTime(consultation.preferredDate, consultation.preferredTime)
                                    if (dateTime) {
                                      return new Intl.DateTimeFormat('en-US', {
                                        timeZone: 'Africa/Nairobi',
                                        hour: 'numeric',
                                        minute: '2-digit',
                                        hour12: true,
                                      }).format(dateTime)
                                    }
                                    return formatTime(consultation.preferredTime)
                                  } catch {
                                    return formatTime(consultation.preferredTime)
                                  }
                                })()}{' '}
                                (Africa/Nairobi)
                              </p>
                            </div>
                          </div>
                        )}
                      </div>

                      {/* Spin Wheel Information */}
                      {((consultation as any).spinWheelCode || (consultation.discountCode && consultation.discountCode.startsWith('SPIN'))) && (
                        <div>
                          <h4 className="text-lg font-semibold text-brown mb-3 border-b-2 border-brown-light pb-2">
                            🎡 Spin Wheel Prize
                          </h4>
                          <div className="bg-purple-50 border-2 border-purple-200 rounded-lg p-4">
                            <p className="text-sm text-purple-900 mb-2">
                              <strong>Spin Wheel Code:</strong> <code className="bg-purple-100 px-2 py-1 rounded font-mono">{(consultation as any).spinWheelCode || consultation.discountCode}</code>
                            </p>
                            {consultation.discountAmount && consultation.discountAmount > 0 && (
                              <p className="text-sm text-purple-900">
                                <strong>Discount Applied:</strong> {consultation.discountAmount.toLocaleString()} {consultation.currency}
                                {consultation.discountType === 'percentage' && consultation.discountValue && (
                                  <span> ({consultation.discountValue}% off)</span>
                                )}
                              </p>
                            )}
                            {consultation.consultationPrice === 0 && (
                              <p className="text-sm text-green-700 font-semibold mt-2">
                                ✓ Free Consultation - Spin wheel prize applied!
                              </p>
                            )}
                            <p className="text-xs text-purple-700 mt-2 italic">
                              This customer won a spin wheel prize and used it when booking this consultation.
                            </p>
                          </div>
                        </div>
                      )}

                      {/* Additional Details */}
                      {consultation.additionalDetails && (
                        <div>
                          <h4 className="text-lg font-semibold text-brown mb-3 border-b-2 border-brown-light pb-2">
                            Additional Details
                          </h4>
                          <div className="bg-brown-light/20 p-4 rounded-lg">
                            <p className="text-gray-700 whitespace-pre-wrap">{consultation.additionalDetails}</p>
                          </div>
                        </div>
                      )}

                      {/* Contract Status */}
                      {(() => {
                        const consultationId = consultation.consultationId || consultation.submittedAt
                        const contractStatus = contractStatuses[consultationId]
                        return contractStatus && contractStatus.hasContract ? (
                          <div className="pt-4 border-t-2 border-brown-light">
                            <h4 className="text-lg font-semibold text-brown mb-3">
                              Contract Status
                            </h4>
                            <div className="flex items-center gap-3 mb-2">
                              <span className={`px-4 py-2 rounded-lg font-semibold ${
                                contractStatus.contractStatus === 'signed'
                                  ? 'bg-green-600 text-white'
                                  : contractStatus.contractStatus === 'pending'
                                  ? 'bg-yellow-600 text-white'
                                  : 'bg-gray-400 text-white'
                              }`}>
                                {contractStatus.contractStatus === 'signed' ? '✓ Signed' : 
                                 contractStatus.contractStatus === 'pending' ? '⏳ Pending Signature' : 
                                 'Expired'}
                              </span>
                              {contractStatus.contractStatus === 'signed' && contractStatus.contract?.signedAt && (
                                <span className="text-sm text-gray-600">
                                  Signed on: {formatDate(contractStatus.contract.signedAt)}
                                </span>
                              )}
                            {contractStatus.contractStatus === 'pending' && contractStatus.contract?.daysRemaining !== null && (
                                <span className="text-sm text-gray-600">
                                  {contractStatus.contract.daysRemaining === 0 
                                    ? 'Expires today' 
                                    : `${contractStatus.contract.daysRemaining} day${contractStatus.contract.daysRemaining !== 1 ? 's' : ''} remaining`}
                                </span>
                              )}
                            </div>
                            {contractStatus.contractStatus === 'signed' && (
                              <div className="bg-green-50 border-2 border-green-400 rounded-lg p-3 mt-2">
                                <p className="text-sm text-green-800 font-semibold">
                                  ✓ Contract is signed! You can now send the invoice.
                                </p>
                              </div>
                            )}
                            {contractStatus.contractStatus === 'pending' && (
                              <div className="bg-yellow-50 border-2 border-yellow-400 rounded-lg p-3 mt-2">
                                <p className="text-sm text-yellow-800 mb-1">
                                  ⏳ Waiting for client to sign the contract. Invoice can only be sent after contract is signed.
                                </p>
                                {contractStatus.contract?.daysRemaining !== null && contractStatus.contract.daysRemaining <= 2 && (
                                  <p className="text-sm text-yellow-900 font-semibold">
                                    ⚠️ Contract expires in {contractStatus.contract.daysRemaining} day{contractStatus.contract.daysRemaining !== 1 ? 's' : ''}. Consider sending a reminder.
                                  </p>
                                )}
                              </div>
                            )}
                            {contractStatus.contractStatus === 'expired' && (
                              <div className="bg-red-50 border-2 border-red-400 rounded-lg p-3 mt-2">
                                <p className="text-sm text-red-800 font-semibold mb-1">
                                  ⏰ Contract has expired (7 days have passed since it was sent).
                                </p>
                                <p className="text-sm text-red-700">
                                  You'll need to send a new contract to the client. The old contract link is no longer valid.
                                </p>
                              </div>
                            )}
                          </div>
                        ) : null
                      })()}

                      {/* Consultation Outcome */}
                      <div className="pt-4 border-t-2 border-brown-light">
                        <h4 className="text-lg font-semibold text-brown mb-3">
                          Consultation Outcome
                        </h4>
                        <div className="flex gap-2 flex-wrap mb-4">
                          <span className={`px-4 py-2 rounded-lg font-semibold ${
                            consultation.outcome === 'build-now'
                              ? 'bg-green-600 text-white'
                              : 'bg-gray-200 text-gray-600'
                          }`}>
                            {consultation.outcome === 'build-now' ? '✓ Build Now' : 'Build Now'}
                          </span>
                          <span className={`px-4 py-2 rounded-lg font-semibold ${
                            consultation.outcome === 'fix-first'
                              ? 'bg-yellow-600 text-white'
                              : 'bg-gray-200 text-gray-600'
                          }`}>
                            {consultation.outcome === 'fix-first' ? '✓ Fix First' : 'Fix First'}
                          </span>
                          <span className={`px-4 py-2 rounded-lg font-semibold ${
                            consultation.outcome === 'don\'t-build'
                              ? 'bg-red-600 text-white'
                              : 'bg-gray-200 text-gray-600'
                          }`}>
                            {consultation.outcome === 'don\'t-build' ? '✓ Don\'t Build' : 'Don\'t Build'}
                          </span>
                        </div>
                        {consultation.selectedTier && (
                          <p className="text-sm text-gray-600 mb-2">
                            <strong>Selected Tier:</strong> {consultation.selectedTier}
                          </p>
                        )}
                        {consultation.buildEmailSentAt && (
                          <p className="text-sm text-gray-600">
                            <strong>Build Email Sent:</strong> {formatDate(consultation.buildEmailSentAt)}
                          </p>
                        )}
                      </div>

                      {/* Action Buttons */}
                      <div className="flex gap-4 pt-4 border-t-2 border-brown-light flex-wrap">
                        {(() => {
                          const consultationId = consultation.consultationId || consultation.submittedAt
                          const contractStatus = contractStatuses[consultationId]
                          const hasContract = contractStatus?.hasContract
                          const isContractExpired = contractStatus?.contractStatus === 'expired'
                          const isContractSigned = contractStatus?.contractStatus === 'signed'
                          
                          if (!hasContract || isContractExpired) {
                            return (
                              <button
                                onClick={() => openContractModal(consultation)}
                                className="bg-purple-600 text-white px-6 py-2 rounded-lg font-semibold hover:bg-purple-700 transition-colors"
                              >
                                {isContractExpired ? 'Resend Contract' : 'Send Contract'}
                              </button>
                            )
                          }
                          if (hasContract && !isContractSigned && !isContractExpired) {
                            return (
                              <button
                                onClick={() => openContractModal(consultation)}
                                className="bg-purple-600 text-white px-6 py-2 rounded-lg font-semibold hover:bg-purple-700 transition-colors"
                                title="Send a new contract (current one is still pending)"
                              >
                                Send New Contract
                              </button>
                            )
                          }
                          return null
                        })()}
                        {(() => {
                          const consultationId = consultation.consultationId || consultation.submittedAt
                          const contractStatus = contractStatuses[consultationId]
                          const hasContract = contractStatus?.hasContract
                          
                          if (hasContract) {
                            return (
                              <button
                                onClick={() => refreshContractStatus(consultationId)}
                                className="bg-gray-500 text-white px-6 py-2 rounded-lg font-semibold hover:bg-gray-600 transition-colors"
                                title="Refresh contract status"
                              >
                                🔄 Refresh Contract Status
                              </button>
                            )
                          }
                          return null
                        })()}
                        <button
                          onClick={() => openBuildEmailModal(consultation)}
                          className="bg-blue-600 text-white px-6 py-2 rounded-lg font-semibold hover:bg-blue-700 transition-colors"
                        >
                          Send Build Email
                        </button>
                        {(() => {
                          const consultationId = consultation.consultationId || consultation.submittedAt
                          const contractStatus = contractStatuses[consultationId]
                          const isContractSigned = contractStatus?.contractStatus === 'signed'
                          const isContractExpired = contractStatus?.contractStatus === 'expired'
                          const hasContract = contractStatus?.hasContract
                          
                          return (
                            <button
                              onClick={() => openInvoiceModal(consultation)}
                              disabled={hasContract && isContractExpired}
                              className={`px-6 py-2 rounded-lg font-semibold transition-colors ${
                                hasContract && isContractExpired
                                  ? 'bg-gray-400 text-white cursor-not-allowed opacity-60'
                                  : 'bg-green-600 text-white hover:bg-green-700'
                              }`}
                              title={
                                hasContract && isContractExpired 
                                  ? 'Contract has expired. Send a new contract first.' 
                                  : hasContract && !isContractSigned 
                                  ? 'Preview invoice pricing (contract must be signed before sending)' 
                                  : 'Create Invoice'
                              }
                            >
                              {hasContract && isContractSigned ? '✓ Create Invoice' : 
                               hasContract && isContractExpired ? '⏰ Contract Expired - Send New Contract' : 
                               hasContract && !isContractSigned ? '📋 Preview Invoice' : 
                               'Create Invoice'}
                            </button>
                          )
                        })()}
                        <a
                          href={`mailto:${consultation.email}?subject=Re: LashDiary Labs Consultation Request - ${consultation.businessName}`}
                          className="bg-brown-dark text-white px-6 py-2 rounded-lg font-semibold hover:bg-brown transition-colors"
                        >
                          Reply via Email
                        </a>
                        <a
                          href={`tel:${consultation.phone}`}
                          className="bg-brown-light text-brown px-6 py-2 rounded-lg font-semibold hover:bg-brown-light/80 transition-colors"
                        >
                          Call
                        </a>
                      </div>
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        )}
      </div>

      {/* Invoice Creation Modal */}
      {showInvoiceModal && selectedConsultation && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-2xl max-w-4xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b-2 border-brown-light">
              <div className="flex justify-between items-center">
                <h2 className="text-2xl font-semibold text-brown">Create Invoice</h2>
                <button
                  onClick={() => setShowInvoiceModal(false)}
                  className="text-gray-500 hover:text-gray-700 text-2xl"
                >
                  ×
                </button>
              </div>
              <p className="text-gray-600 mt-2">
                For: <strong>{selectedConsultation.businessName}</strong> ({selectedConsultation.contactName})
              </p>
            </div>

            <div className="p-6 space-y-6">
              {/* Contract Status Warning */}
              {(() => {
                if (!selectedConsultation) return null
                const consultationId = selectedConsultation.consultationId || selectedConsultation.submittedAt
                const contractStatus = contractStatuses[consultationId]
                
                if (contractStatus?.hasContract && contractStatus.contractStatus === 'expired') {
                  return (
                    <div className="bg-red-50 border-2 border-red-400 rounded-lg p-4">
                      <p className="text-sm text-red-800 font-semibold mb-1">
                        ⏰ Contract Expired
                      </p>
                      <p className="text-sm text-red-700">
                        The contract has expired (7 days have passed). You need to send a new contract. The old contract link is no longer valid for signing.
                      </p>
                    </div>
                  )
                }
                
                if (contractStatus?.hasContract && contractStatus.contractStatus !== 'signed' && contractStatus.contractStatus !== 'expired') {
                  return (
                    <div className="bg-yellow-50 border-2 border-yellow-400 rounded-lg p-4">
                      <p className="text-sm text-yellow-800 font-semibold mb-1">
                        ⚠️ Contract Not Yet Signed - Preview Mode
                      </p>
                      <p className="text-sm text-yellow-700">
                        You can preview and calculate the invoice pricing below, but the invoice cannot be created or sent until the contract is signed.
                        {contractStatus.contract?.daysRemaining !== null && contractStatus.contract.daysRemaining <= 2 && (
                          <span className="block mt-1 font-semibold">
                            ⚠️ Contract expires in {contractStatus.contract.daysRemaining} day{contractStatus.contract.daysRemaining !== 1 ? 's' : ''}.
                          </span>
                        )}
                      </p>
                    </div>
                  )
                }
                
                if (!contractStatus?.hasContract) {
                  return (
                    <div className="bg-blue-50 border-2 border-blue-400 rounded-lg p-4">
                      <p className="text-sm text-blue-800 font-semibold mb-1">
                        ℹ️ No Contract Sent Yet - Preview Mode
                      </p>
                      <p className="text-sm text-blue-700">
                        You can preview and calculate the invoice pricing below. Send a contract first, then wait for it to be signed before creating the invoice.
                      </p>
                    </div>
                  )
                }
                
                if (contractStatus?.hasContract && contractStatus.contractStatus === 'signed') {
                  return (
                    <div className="bg-green-50 border-2 border-green-400 rounded-lg p-4">
                      <p className="text-sm text-green-800 font-semibold mb-1">
                        ✓ Contract Signed
                      </p>
                      <p className="text-sm text-green-700">
                        Contract was signed on {contractStatus.contract?.signedAt ? formatDate(contractStatus.contract.signedAt) : 'recently'}. You can now create and send invoices.
                      </p>
                    </div>
                  )
                }
                
                return (
                  <div className="bg-blue-50 border-2 border-blue-400 rounded-lg p-4">
                    <p className="text-sm text-blue-800 font-semibold mb-1">
                      ℹ️ No Contract Sent Yet
                    </p>
                    <p className="text-sm text-blue-700">
                      Send a contract first before creating an invoice. The contract must be signed before invoices can be sent. Contracts expire 7 days after being sent.
                    </p>
                  </div>
                )
              })()}
              
              {/* Tier Selection */}
              <div>
                <label className="block text-sm font-semibold text-brown mb-2">
                  Select Tier to Pre-populate Services (Optional)
                </label>
                <select
                  value={selectedTierForInvoice}
                  onChange={(e) => handleTierChangeForInvoice(e.target.value)}
                  disabled={loadingTierForInvoice}
                  className="w-full px-3 py-2 border-2 border-brown-light rounded-lg focus:outline-none focus:border-brown disabled:opacity-50"
                >
                  <option value="">No tier selected (manual entry)</option>
                  {availableTiers.map((tier) => (
                    <option key={tier.id} value={tier.name}>
                      {tier.name} - {(() => {
                        const consultationCurrency = selectedConsultation?.currency || 'KES'
                        let tierPriceInCurrency = tier.priceKES
                        if (consultationCurrency === 'USD') {
                          if (exchangeRates) {
                            tierPriceInCurrency = tier.priceKES / exchangeRates.usdToKes
                          } else {
                            const defaultRate = 130
                            tierPriceInCurrency = tier.priceKES / defaultRate
                          }
                        }
                        return formatCurrency(tierPriceInCurrency, consultationCurrency as Currency)
                      })()}
                    </option>
                  ))}
                </select>
                {loadingTierForInvoice && (
                  <p className="text-sm text-gray-600 mt-1">Loading tier services...</p>
                )}
                {selectedTierForInvoice && !loadingTierForInvoice && (
                  <p className="text-sm text-green-600 mt-1">
                    ✓ Tier services loaded. You can edit descriptions and prices below.
                  </p>
                )}
              </div>

              {/* Invoice Items */}
              <div>
                <div className="flex justify-between items-center mb-4">
                  <h3 className="text-lg font-semibold text-brown">Invoice Items</h3>
                  <button
                    onClick={addInvoiceItem}
                    className="px-4 py-2 bg-brown-dark text-white rounded-lg font-semibold hover:bg-brown transition-colors text-sm"
                  >
                    + Add Custom Item
                  </button>
                </div>
                <div className="space-y-3">
                  {invoiceItems.length === 0 ? (
                    <div className="text-center py-8 text-gray-500">
                      <p>No items added yet. Select a tier above or add custom items.</p>
                    </div>
                  ) : (
                    <>
                      <div className="grid grid-cols-12 gap-2 mb-2 px-2 text-sm font-semibold text-brown">
                        <div className="col-span-5">Description</div>
                        <div className="col-span-2 text-center">Qty</div>
                        <div className="col-span-2 text-right">Unit Price</div>
                        <div className="col-span-2 text-right">Total</div>
                        <div className="col-span-1"></div>
                      </div>
                      {invoiceItems.map((item: InvoiceItem, index: number) => (
                        <div key={index} className="flex gap-2 items-start p-3 bg-gray-50 rounded-lg border-2 border-brown-light/30 hover:border-brown-light transition-colors">
                          <div className="flex-1 min-w-0">
                            <textarea
                              value={item.description}
                              onChange={(e) => updateInvoiceItem(index, 'description', e.target.value)}
                              placeholder="Service/item description"
                              rows={2}
                              className="w-full px-3 py-2 border-2 border-brown-light rounded-lg focus:outline-none focus:border-brown resize-none"
                            />
                          </div>
                          <div className="w-20">
                            <input
                              type="number"
                              value={item.quantity}
                              onChange={(e) => updateInvoiceItem(index, 'quantity', parseFloat(e.target.value) || 1)}
                              min="1"
                              step="1"
                              className="w-full px-2 py-2 border-2 border-brown-light rounded-lg focus:outline-none focus:border-brown text-center"
                            />
                          </div>
                          <div className="w-32">
                            <input
                              type="number"
                              value={item.unitPrice}
                              onChange={(e) => updateInvoiceItem(index, 'unitPrice', parseFloat(e.target.value) || 0)}
                              min="0"
                              step="0.01"
                              placeholder="0.00"
                              className="w-full px-2 py-2 border-2 border-brown-light rounded-lg focus:outline-none focus:border-brown text-right"
                            />
                          </div>
                          <div className="w-32 text-right font-semibold text-brown py-2 flex items-center justify-end">
                            {formatCurrency(item.total, selectedConsultation?.currency || 'KES')}
                          </div>
                          <button
                            onClick={() => removeInvoiceItem(index)}
                            className="text-red-600 hover:text-red-800 px-2 py-2 font-bold text-lg"
                            title="Remove item"
                          >
                            ×
                          </button>
                        </div>
                      ))}
                    </>
                  )}
                </div>
              </div>

              {/* Tax, Discount and Notes */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-semibold text-brown mb-2">
                    Tax Rate (%)
                  </label>
                  <input
                    type="number"
                    value={taxRate}
                    onChange={(e) => setTaxRate(parseFloat(e.target.value) || 0)}
                    min="0"
                    max="100"
                    step="0.01"
                    className="w-full px-3 py-2 border-2 border-brown-light rounded-lg focus:outline-none focus:border-brown"
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-brown mb-2">
                    Due Date
                  </label>
                  <input
                    type="date"
                    value={dueDate}
                    onChange={(e) => setDueDate(e.target.value)}
                    className="w-full px-3 py-2 border-2 border-brown-light rounded-lg focus:outline-none focus:border-brown"
                  />
                </div>
              </div>

              {/* Discount Section */}
              <div className="border-t-2 border-brown-light pt-4">
                <h3 className="text-lg font-semibold text-brown mb-4">Discount</h3>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <label className="block text-sm font-semibold text-brown mb-2">
                      Discount Type
                    </label>
                    <select
                      value={discountType}
                      onChange={(e) => setDiscountType(e.target.value as 'amount' | 'percentage')}
                      className="w-full px-3 py-2 border-2 border-brown-light rounded-lg focus:outline-none focus:border-brown"
                    >
                      <option value="amount">Fixed Amount</option>
                      <option value="percentage">Percentage</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-brown mb-2">
                      Discount {discountType === 'percentage' ? '(%)' : `(${invoiceCurrency})`}
                    </label>
                    <input
                      type="number"
                      value={discountValue}
                      onChange={(e) => setDiscountValue(Math.max(0, parseFloat(e.target.value) || 0))}
                      min="0"
                      max={discountType === 'percentage' ? 100 : undefined}
                      step="0.01"
                      className="w-full px-3 py-2 border-2 border-brown-light rounded-lg focus:outline-none focus:border-brown"
                      placeholder={discountType === 'percentage' ? '0' : '0.00'}
                    />
                  </div>
                  <div className="flex items-end">
                    {(() => {
                      const { subtotal, tax, discount } = calculateTotals()
                      const subtotalAfterTax = subtotal + tax
                      const discountAmount = discountType === 'percentage' && discountValue > 0
                        ? subtotalAfterTax * (discountValue / 100)
                        : discountValue
                      
                      if (discountValue > 0) {
                        return (
                          <div className="w-full px-3 py-2 bg-green-50 border-2 border-green-300 rounded-lg">
                            <p className="text-xs text-green-700 font-semibold mb-1">Discount Applied:</p>
                            <p className="text-lg font-bold text-green-800">
                              {formatCurrency(Math.min(discountAmount, subtotalAfterTax), selectedConsultation?.currency || 'KES')}
                            </p>
                          </div>
                        )
                      }
                      return (
                        <div className="w-full px-3 py-2 bg-gray-50 border-2 border-gray-300 rounded-lg">
                          <p className="text-sm text-gray-600">No discount applied</p>
                        </div>
                      )
                    })()}
                  </div>
                </div>
              </div>

              {/* Invoice Totals Summary */}
              <div className="bg-[#F3E6DC] border-2 border-brown-light rounded-lg p-4">
                <h3 className="text-lg font-semibold text-brown mb-3">Invoice Summary</h3>
                {(() => {
                  const { subtotal, tax, discount, total } = calculateTotals()
                  const currency = selectedConsultation?.currency || 'KES'
                  return (
                    <div className="space-y-2">
                      <div className="flex justify-between text-sm">
                        <span className="text-[#6B4A3B]">Subtotal:</span>
                        <span className="font-semibold text-[#7C4B31]">{formatCurrency(subtotal, currency)}</span>
                      </div>
                      {tax > 0 && (
                        <div className="flex justify-between text-sm">
                          <span className="text-[#6B4A3B]">Tax ({taxRate}%):</span>
                          <span className="font-semibold text-[#7C4B31]">{formatCurrency(tax, currency)}</span>
                        </div>
                      )}
                      {discount > 0 && (
                        <div className="flex justify-between text-sm text-green-700">
                          <span>Discount {discountType === 'percentage' ? `(${discountValue}%)` : ''}:</span>
                          <span className="font-semibold">-{formatCurrency(discount, currency)}</span>
                        </div>
                      )}
                      <div className="flex justify-between text-lg pt-2 border-t-2 border-brown-light">
                        <span className="font-bold text-[#7C4B31]">Total:</span>
                        <span className="font-bold text-[#7C4B31]">{formatCurrency(total, currency)}</span>
                      </div>
                    </div>
                  )
                })()}
              </div>

              <div>
                <label className="block text-sm font-semibold text-brown mb-2">
                  Notes (Optional)
                </label>
                <textarea
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  rows={3}
                  className="w-full px-3 py-2 border-2 border-brown-light rounded-lg focus:outline-none focus:border-brown"
                  placeholder="Additional notes for the invoice..."
                />
              </div>

              {/* Payment Split Configuration */}
              <div className="border-t-2 border-brown-light pt-6 space-y-4">
                <h3 className="text-lg font-semibold text-brown">Payment Split</h3>
                
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-semibold text-brown mb-2">
                      Downpayment (%)
                    </label>
                    <input
                      type="number"
                      value={downpaymentPercent}
                      onChange={(e) => {
                        const value = Math.max(0, Math.min(100, parseFloat(e.target.value) || 0))
                        setDownpaymentPercent(value)
                        setFinalPaymentPercent(100 - value)
                      }}
                      min="0"
                      max="100"
                      step="1"
                      className="w-full px-3 py-2 border-2 border-brown-light rounded-lg focus:outline-none focus:border-brown"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-brown mb-2">
                      Final Payment (%)
                    </label>
                    <input
                      type="number"
                      value={finalPaymentPercent}
                      onChange={(e) => {
                        const value = Math.max(0, Math.min(100, parseFloat(e.target.value) || 0))
                        setFinalPaymentPercent(value)
                        setDownpaymentPercent(100 - value)
                      }}
                      min="0"
                      max="100"
                      step="1"
                      className="w-full px-3 py-2 border-2 border-brown-light rounded-lg focus:outline-none focus:border-brown"
                    />
                  </div>
                </div>

                <div className="bg-blue-50 border-2 border-blue-200 rounded-lg p-4">
                  <label className="block text-sm font-semibold text-blue-800 mb-3">
                    Which invoice would you like to send?
                  </label>
                  <div className="space-y-2">
                    <label className="flex items-center cursor-pointer">
                      <input
                        type="radio"
                        name="invoiceType"
                        value="downpayment"
                        checked={invoiceType === 'downpayment'}
                        onChange={(e) => setInvoiceType(e.target.value as 'downpayment' | 'final')}
                        className="mr-3 w-4 h-4 text-brown-dark focus:ring-brown-dark"
                      />
                      <div>
                        <span className="font-semibold text-blue-900">Downpayment ({downpaymentPercent}%)</span>
                        <span className="ml-2 text-sm text-blue-700">
                          - Client will pay {downpaymentPercent}% of the total amount
                        </span>
                      </div>
                    </label>
                    <label className="flex items-center cursor-pointer">
                      <input
                        type="radio"
                        name="invoiceType"
                        value="final"
                        checked={invoiceType === 'final'}
                        onChange={(e) => setInvoiceType(e.target.value as 'downpayment' | 'final')}
                        className="mr-3 w-4 h-4 text-brown-dark focus:ring-brown-dark"
                      />
                      <div>
                        <span className="font-semibold text-blue-900">Final Payment ({finalPaymentPercent}%)</span>
                        <span className="ml-2 text-sm text-blue-700">
                          - Client will pay {finalPaymentPercent}% of the total amount
                        </span>
                      </div>
                    </label>
                  </div>
                </div>

                {/* Show calculated amount based on selection */}
                {(() => {
                  const { total } = calculateTotals()
                  const selectedPercent = invoiceType === 'downpayment' ? downpaymentPercent : finalPaymentPercent
                  const invoiceAmount = Math.round((total * selectedPercent) / 100)
                  return (
                    <div className="bg-yellow-50 border-2 border-yellow-300 rounded-lg p-4">
                      <div className="flex justify-between items-center">
                        <span className="font-semibold text-yellow-900">
                          Invoice Amount ({invoiceType === 'downpayment' ? 'Downpayment' : 'Final Payment'}):
                        </span>
                        <span className="text-xl font-bold text-yellow-900">
                          {formatCurrency(invoiceAmount, selectedConsultation?.currency || 'KES')}
                        </span>
                      </div>
                      <div className="text-sm text-yellow-700 mt-1">
                        ({selectedPercent}% of {formatCurrency(total, selectedConsultation?.currency || 'KES')} total)
                      </div>
                    </div>
                  )
                })()}
              </div>

              {/* Tier Price Comparison */}
              {selectedTierForInvoice && (() => {
                const tier = availableTiers.find(t => t.name === selectedTierForInvoice)
                if (tier) {
                  const { subtotal, tax, total } = calculateTotals()
                  const consultationCurrency = selectedConsultation?.currency || 'KES'
                  
                  // Tier price is always in KES - convert to consultation currency for comparison
                  let tierTotalInCurrency = tier.priceKES
                  if (consultationCurrency === 'USD') {
                    if (exchangeRates) {
                      tierTotalInCurrency = tier.priceKES / exchangeRates.usdToKes
                    } else {
                      const defaultRate = 130
                      tierTotalInCurrency = tier.priceKES / defaultRate
                    }
                  }
                  
                  // Calculate difference in the consultation's currency (direct comparison)
                  const difference = total - tierTotalInCurrency
                  
                  // Tolerance for rounding differences (0.01 for USD, 1 for KES)
                  const tolerance = consultationCurrency === 'USD' ? 0.01 : 1
                  
                  return (
                    <div className="bg-blue-50 border-2 border-blue-400 rounded-lg p-4">
                      <h4 className="text-sm font-semibold text-blue-800 mb-2">Tier Price Comparison</h4>
                      <div className="space-y-1 text-sm">
                        <div className="flex justify-between">
                          <span className="text-blue-700">Selected Tier Price:</span>
                          <span className="font-semibold text-blue-800">{formatCurrency(tierTotalInCurrency, consultationCurrency)}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-blue-700">Current Invoice Total:</span>
                          <span className="font-semibold text-blue-800">{formatCurrency(total, consultationCurrency)}</span>
                        </div>
                        <div className="flex justify-between pt-2 border-t border-blue-300">
                          <span className="text-blue-700 font-semibold">Difference:</span>
                          <span className={`font-bold ${Math.abs(difference) < tolerance ? 'text-green-600' : difference > 0 ? 'text-orange-600' : 'text-blue-600'}`}>
                            {Math.abs(difference) < tolerance ? '✓ Match' : difference > 0 ? `+${formatCurrency(difference, consultationCurrency)}` : formatCurrency(difference, consultationCurrency)}
                          </span>
                        </div>
                        {Math.abs(difference) >= tolerance && (
                          <p className="text-xs text-blue-600 mt-2 italic">
                            {difference > 0 
                              ? 'Invoice total is higher than tier price. Adjust item prices if needed.'
                              : 'Invoice total is lower than tier price. You may want to add more services or adjust prices.'}
                          </p>
                        )}
                      </div>
                    </div>
                  )
                }
                return null
              })()}

              {/* Totals Preview */}
              {(() => {
                const { subtotal, tax, total } = calculateTotals()
                return (
                  <div className="bg-brown-light/20 p-4 rounded-lg">
                    <div className="flex justify-between mb-2">
                      <span className="text-gray-700">Subtotal:</span>
                      <span className="font-semibold">{formatCurrency(subtotal, selectedConsultation?.currency || 'KES')}</span>
                    </div>
                    {tax > 0 && (
                      <div className="flex justify-between mb-2">
                        <span className="text-gray-700">Tax ({taxRate}%):</span>
                        <span className="font-semibold">{formatCurrency(tax, selectedConsultation?.currency || 'KES')}</span>
                      </div>
                    )}
                    <div className="flex justify-between pt-2 border-t-2 border-brown-light">
                      <span className="text-lg font-bold text-brown">Total:</span>
                      <span className="text-lg font-bold text-brown">{formatCurrency(total, selectedConsultation?.currency || 'KES')}</span>
                    </div>
                  </div>
                )
              })()}

              {/* Existing Invoices */}
              {existingInvoices.length > 0 && (
                <div>
                  <h3 className="text-lg font-semibold text-brown mb-3">Existing Invoices</h3>
                  <div className="space-y-2">
                    {existingInvoices.map((inv) => {
                      // Check if this is a downpayment invoice (80%) and can send remaining balance
                      const isDownpayment = inv.invoiceType === 'downpayment'
                      const isPaid = inv.status === 'paid'
                      const remainingBalance = isDownpayment && !isPaid ? Math.round(inv.total * 0.2) : null
                      const canSendRemainingBalance = isDownpayment && !isPaid
                      
                      return (
                        <div key={inv.invoiceId} className="flex justify-between items-center p-3 bg-gray-50 rounded-lg gap-3">
                          <div className="flex-1">
                            <span className="font-semibold">{inv.invoiceNumber}</span>
                            <span className="ml-3 text-sm text-gray-600">
                              {formatCurrency(inv.total, inv.currency)} - {inv.status}
                            </span>
                            {isDownpayment && (
                              <span className="ml-3 text-xs text-blue-600 font-semibold">
                                {isPaid 
                                  ? '(80% Downpayment - Paid)' 
                                  : `(80% Downpayment - ${formatCurrency(remainingBalance || 0, inv.currency)} remaining)`}
                              </span>
                            )}
                          </div>
                          <div className="flex gap-2">
                            <button
                              onClick={() => handleSendInvoice(inv.invoiceId)}
                              disabled={sendingInvoiceId === inv.invoiceId || sendingRemainingBalanceId === inv.invoiceId}
                              className="bg-green-600 text-white px-4 py-1.5 rounded-lg text-sm font-semibold hover:bg-green-700 transition-colors disabled:opacity-50"
                            >
                              {sendingInvoiceId === inv.invoiceId ? 'Sending...' : 'Send Email'}
                            </button>
                            {canSendRemainingBalance && (
                              <button
                                onClick={() => handleSendRemainingBalance(inv.invoiceId)}
                                disabled={sendingRemainingBalanceId === inv.invoiceId || sendingInvoiceId === inv.invoiceId}
                                className="bg-blue-600 text-white px-4 py-1.5 rounded-lg text-sm font-semibold hover:bg-blue-700 transition-colors disabled:opacity-50"
                                title={`Send remaining balance (20%): ${formatCurrency(remainingBalance || 0, inv.currency)}`}
                              >
                                {sendingRemainingBalanceId === inv.invoiceId ? 'Sending...' : 'Send 20% Balance'}
                              </button>
                            )}
                            <a
                              href={`/api/admin/labs/invoices/${inv.invoiceId}/pdf`}
                              target="_blank"
                              className="bg-brown-dark text-white px-4 py-1.5 rounded-lg text-sm font-semibold hover:bg-brown transition-colors"
                            >
                              View PDF
                            </a>
                          </div>
                        </div>
                      )
                    })}
                  </div>
                </div>
              )}

              {/* Action Buttons */}
              <div className="flex gap-4 pt-4 border-t-2 border-brown-light">
                {(() => {
                  if (!selectedConsultation) return null
                  const consultationId = selectedConsultation.consultationId || selectedConsultation.submittedAt
                  const contractStatus = contractStatuses[consultationId]
                  const isContractSigned = contractStatus?.hasContract && contractStatus.contractStatus === 'signed'
                  const canCreateInvoice = isContractSigned
                  
                  return (
                    <button
                      onClick={handleCreateInvoice}
                      disabled={creatingInvoice || !canCreateInvoice}
                      className={`flex-1 px-6 py-3 rounded-lg font-semibold transition-colors ${
                        canCreateInvoice
                          ? 'bg-brown-dark text-white hover:bg-brown'
                          : 'bg-gray-400 text-white cursor-not-allowed'
                      } disabled:opacity-50`}
                      title={!canCreateInvoice ? 'Contract must be signed before creating invoice' : 'Create Invoice'}
                    >
                      {creatingInvoice 
                        ? 'Creating...' 
                        : canCreateInvoice 
                        ? 'Create Invoice' 
                        : 'Contract Must Be Signed First'}
                    </button>
                  )
                })()}
                <button
                  onClick={() => setShowInvoiceModal(false)}
                  className="px-6 py-3 border-2 border-brown-light text-brown rounded-lg font-semibold hover:bg-brown-light/20 transition-colors"
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Build Email Modal */}
      {showBuildEmailModal && selectedConsultation && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-2xl max-w-2xl w-full">
            <div className="p-6 border-b-2 border-brown-light">
              <div className="flex justify-between items-center">
                <h2 className="text-2xl font-semibold text-brown">Send Build Email</h2>
                <button
                  onClick={() => setShowBuildEmailModal(false)}
                  className="text-gray-500 hover:text-gray-700 text-2xl"
                >
                  ×
                </button>
              </div>
              <p className="text-gray-600 mt-2">
                For: <strong>{selectedConsultation.businessName}</strong> ({selectedConsultation.contactName})
              </p>
            </div>

            <div className="p-6 space-y-6">
              <div>
                <label className="block text-sm font-semibold text-brown mb-2">
                  Select Tier <span className="text-red-500">*</span>
                </label>
                <select
                  value={selectedTierForBuild}
                  onChange={(e) => setSelectedTierForBuild(e.target.value)}
                  className="w-full px-3 py-2 border-2 border-brown-light rounded-lg focus:outline-none focus:border-brown"
                  required
                >
                  <option value="">Select a tier</option>
                  {availableTiers.map((tier) => {
                    const consultationCurrency = selectedConsultation.currency || 'KES'
                    let tierPriceInCurrency = tier.priceKES
                    if (consultationCurrency === 'USD') {
                      if (exchangeRates) {
                        tierPriceInCurrency = tier.priceKES / exchangeRates.usdToKes
                      } else {
                        const defaultRate = 130
                        tierPriceInCurrency = tier.priceKES / defaultRate
                      }
                    }
                    return (
                      <option key={tier.id} value={tier.name}>
                        {tier.name} - {formatCurrency(tierPriceInCurrency, consultationCurrency)}
                      </option>
                    )
                  })}
                </select>
                {selectedConsultation.interestedTier && (
                  <p className="text-sm text-gray-600 mt-1">
                    Originally interested in: <strong>{selectedConsultation.interestedTier}</strong>
                  </p>
                )}
              </div>

              {existingInvoices.length > 0 && (
                <div>
                  <label className="block text-sm font-semibold text-brown mb-2">
                    Select Invoice (Optional)
                  </label>
                  <select
                    value={selectedInvoiceForBuild}
                    onChange={(e) => setSelectedInvoiceForBuild(e.target.value)}
                    className="w-full px-3 py-2 border-2 border-brown-light rounded-lg focus:outline-none focus:border-brown"
                  >
                    <option value="">Use most recent invoice</option>
                    {existingInvoices.map((inv) => (
                      <option key={inv.invoiceId} value={inv.invoiceId}>
                        {inv.invoiceNumber} - {formatCurrency(inv.total, inv.currency)} ({inv.status})
                      </option>
                    ))}
                  </select>
                  <p className="text-xs text-gray-500 mt-1">
                    If no invoice is selected, the most recent invoice will be used.
                  </p>
                </div>
              )}

              {existingInvoices.length === 0 && (
                <div className="bg-yellow-50 border-2 border-yellow-400 rounded-lg p-4">
                  <p className="text-sm text-yellow-800">
                    <strong>Note:</strong> No invoices found for this consultation. Please create an invoice first before sending the build email.
                  </p>
                </div>
              )}

              <div className="bg-blue-50 border-2 border-blue-400 rounded-lg p-4">
                <p className="text-sm text-blue-800 mb-2">
                  <strong>What this email will include:</strong>
                </p>
                <ul className="text-sm text-blue-800 list-disc list-inside space-y-1">
                  <li>Tier selected and total cost</li>
                  <li>Payment structure (100% upfront for Tier 1/2, 50/50 split for Tier 3)</li>
                  <li>What payment unlocks</li>
                  <li>Timeline and next steps</li>
                  <li>Invoice with 7-day expiration notice</li>
                </ul>
              </div>

              <div className="flex gap-4 pt-4 border-t-2 border-brown-light">
                <button
                  onClick={handleSendBuildEmail}
                  disabled={sendingBuildEmail || !selectedTierForBuild || existingInvoices.length === 0}
                  className="flex-1 bg-blue-600 text-white px-6 py-3 rounded-lg font-semibold hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {sendingBuildEmail ? 'Sending...' : 'Send Build Email'}
                </button>
                <button
                  onClick={() => setShowBuildEmailModal(false)}
                  className="px-6 py-3 border-2 border-brown-light text-brown rounded-lg font-semibold hover:bg-brown-light/20 transition-colors"
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Send Contract Modal */}
      {showContractModal && selectedConsultation && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-2xl max-w-3xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b-2 border-brown-light">
              <div className="flex justify-between items-center">
                <h2 className="text-2xl font-semibold text-brown">Send Contract</h2>
                <button
                  onClick={() => setShowContractModal(false)}
                  className="text-gray-500 hover:text-gray-700 text-2xl"
                >
                  ×
                </button>
              </div>
              <p className="text-gray-600 mt-2">
                For: <strong>{selectedConsultation.businessName}</strong> ({selectedConsultation.contactName})
              </p>
            </div>

            <div className="p-6 space-y-6">
              {/* Tier Selection */}
              <div>
                <label className="block text-sm font-semibold text-brown mb-2">
                  Select Tier <span className="text-red-500">*</span>
                </label>
                <select
                  value={selectedTierForContract}
                  onChange={(e) => handleTierChangeForContract(e.target.value, selectedConsultation)}
                  className="w-full px-3 py-2 border-2 border-brown-light rounded-lg focus:outline-none focus:border-brown"
                >
                  <option value="">Select a tier</option>
                  {availableTiers.map((tier) => {
                    const consultationCurrency = selectedConsultation.currency || 'KES'
                    let tierPriceInCurrency = tier.priceKES
                    if (consultationCurrency === 'USD') {
                      if (exchangeRates) {
                        tierPriceInCurrency = tier.priceKES / exchangeRates.usdToKes
                      } else {
                        const defaultRate = 130
                        tierPriceInCurrency = tier.priceKES / defaultRate
                      }
                    }
                    return (
                      <option key={tier.id} value={tier.name}>
                        {tier.name} - {formatCurrency(tierPriceInCurrency, consultationCurrency)}
                      </option>
                    )
                  })}
                </select>
                {selectedConsultation.interestedTier && !selectedTierForContract && (
                  <p className="text-sm text-gray-600 mt-1">
                    Client interested in: <strong>{selectedConsultation.interestedTier}</strong>
                  </p>
                )}
              </div>

              <div>
                <label className="block text-sm font-semibold text-brown mb-2">
                  Project Description <span className="text-red-500">*</span>
                </label>
                <textarea
                  value={contractProjectDescription}
                  onChange={(e) => setContractProjectDescription(e.target.value)}
                  rows={3}
                  className="w-full px-3 py-2 border-2 border-brown-light rounded-lg focus:outline-none focus:border-brown"
                  placeholder="Describe the project/services..."
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-brown mb-2">
                  Project Cost ({selectedConsultation.currency || 'KES'}) <span className="text-red-500">*</span>
                </label>
                <input
                  type="number"
                  value={contractProjectCost}
                  onChange={(e) => {
                    const newCost = parseFloat(e.target.value) || 0
                    setContractProjectCost(newCost)
                    // Recalculate payment terms with tax
                    if (contractTerms) {
                      const upfrontPercent = 80
                      const finalPercent = 20
                      const taxAmount = contractTaxRate ? (newCost * contractTaxRate / 100) : 0
                      const totalWithTax = newCost + taxAmount
                      setContractTerms({
                        ...contractTerms,
                        paymentTerms: {
                          ...contractTerms.paymentTerms,
                          upfrontAmount: Math.round(totalWithTax * (upfrontPercent / 100)),
                          finalAmount: Math.round(totalWithTax * (finalPercent / 100)),
                        },
                      })
                    }
                  }}
                  min="0"
                  step="0.01"
                  className="w-full px-3 py-2 border-2 border-brown-light rounded-lg focus:outline-none focus:border-brown"
                />
                <p className="text-xs text-gray-500 mt-1">
                  This is the project cost excluding consultation fee and tax
                </p>
              </div>

              {/* Tax Rate */}
              <div>
                <label className="block text-sm font-semibold text-brown mb-2">
                  Tax Rate (%)
                </label>
                <input
                  type="number"
                  value={contractTaxRate}
                  onChange={(e) => {
                    const newTaxRate = parseFloat(e.target.value) || 0
                    setContractTaxRate(newTaxRate)
                    // Recalculate payment terms with new tax
                    if (contractTerms && contractProjectCost) {
                      const upfrontPercent = 80
                      const finalPercent = 20
                      const taxAmount = newTaxRate ? (contractProjectCost * newTaxRate / 100) : 0
                      const totalWithTax = contractProjectCost + taxAmount
                      setContractTerms({
                        ...contractTerms,
                        paymentTerms: {
                          ...contractTerms.paymentTerms,
                          upfrontAmount: Math.round(totalWithTax * (upfrontPercent / 100)),
                          finalAmount: Math.round(totalWithTax * (finalPercent / 100)),
                        },
                      })
                    }
                  }}
                  min="0"
                  max="100"
                  step="0.01"
                  className="w-full px-3 py-2 border-2 border-brown-light rounded-lg focus:outline-none focus:border-brown"
                  placeholder="0"
                />
              </div>

              {/* Payment Breakdown */}
              {contractTerms && contractProjectCost > 0 && (
                <div className="p-4 bg-gray-50 rounded-lg border-2 border-brown-light">
                  <h4 className="text-sm font-semibold text-brown mb-3">Payment Breakdown</h4>
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-gray-700">Project Cost:</span>
                      <span className="font-semibold">{formatCurrency(contractProjectCost, selectedConsultation.currency || 'KES')}</span>
                    </div>
                    {contractTaxRate > 0 && (
                      <>
                        <div className="flex justify-between">
                          <span className="text-gray-700">Tax ({contractTaxRate}%):</span>
                          <span className="font-semibold">{formatCurrency(Math.round(contractProjectCost * contractTaxRate / 100), selectedConsultation.currency || 'KES')}</span>
                        </div>
                        <div className="border-t border-gray-300 pt-2 flex justify-between">
                          <span className="text-gray-700 font-semibold">Total (with tax):</span>
                          <span className="font-bold text-brown">{formatCurrency(Math.round(contractProjectCost + (contractProjectCost * contractTaxRate / 100)), selectedConsultation.currency || 'KES')}</span>
                        </div>
                      </>
                    )}
                    <div className="border-t-2 border-brown-light pt-3 mt-3 space-y-1">
                      <div className="flex justify-between">
                        <span className="text-gray-700">Upfront Payment (80%):</span>
                        <span className="font-semibold text-green-700">{formatCurrency(contractTerms.paymentTerms.upfrontAmount, selectedConsultation.currency || 'KES')}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-700">Final Payment (20%):</span>
                        <span className="font-semibold text-green-700">{formatCurrency(contractTerms.paymentTerms.finalAmount, selectedConsultation.currency || 'KES')}</span>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Deliverables Section - Read-only from Tier */}
              <div className="border-t-2 border-brown-light pt-6">
                <h3 className="text-lg font-semibold text-brown mb-4">Deliverables</h3>
                <div className="bg-blue-50 border-2 border-blue-400 rounded-lg p-4 mb-4">
                  <p className="text-sm text-blue-800 font-semibold mb-1">
                    ℹ️ Deliverables are automatically generated from the selected tier
                  </p>
                  <p className="text-sm text-blue-700">
                    These cannot be edited here as they come from the tier configuration. To change deliverables, update the tier settings in LashDiary Labs.
                  </p>
                </div>
                
                {/* What's Included - Display Only */}
                <div className="mb-4">
                  <label className="block text-sm font-semibold text-brown mb-2">
                    What's Included
                  </label>
                  <div className="bg-gray-50 rounded-lg p-3 border-2 border-gray-300">
                    {contractTerms?.deliverables.included.length > 0 && contractTerms.deliverables.included.some((item: string) => item.trim()) ? (
                      <ul className="list-disc list-inside space-y-1 text-sm text-gray-700">
                        {contractTerms.deliverables.included.filter((item: string) => item.trim()).map((item: string, index: number) => (
                          <li key={index}>{item}</li>
                        ))}
                      </ul>
                    ) : (
                      <p className="text-sm text-gray-500 italic">No items (will be populated from tier)</p>
                    )}
                  </div>
                </div>

                {/* What's Not Included - Display Only */}
                <div className="mb-4">
                  <label className="block text-sm font-semibold text-brown mb-2">
                    What's Not Included
                  </label>
                  <div className="bg-gray-50 rounded-lg p-3 border-2 border-gray-300">
                    {contractTerms?.deliverables.notIncluded.length > 0 && contractTerms.deliverables.notIncluded.some((item: string) => item.trim()) ? (
                      <ul className="list-disc list-inside space-y-1 text-sm text-gray-700">
                        {contractTerms.deliverables.notIncluded.filter((item: string) => item.trim()).map((item: string, index: number) => (
                          <li key={index}>{item}</li>
                        ))}
                      </ul>
                    ) : (
                      <p className="text-sm text-gray-500 italic">No items (will be populated from tier)</p>
                    )}
                  </div>
                </div>

                {/* What Counts as Extra - Display Only */}
                <div>
                  <label className="block text-sm font-semibold text-brown mb-2">
                    What Counts as Extra
                  </label>
                  <div className="bg-gray-50 rounded-lg p-3 border-2 border-gray-300">
                    {contractTerms?.deliverables.extras.length > 0 && contractTerms.deliverables.extras.some((item: string) => item.trim()) ? (
                      <ul className="list-disc list-inside space-y-1 text-sm text-gray-700">
                        {contractTerms.deliverables.extras.filter((item: string) => item.trim()).map((item: string, index: number) => (
                          <li key={index}>{item}</li>
                        ))}
                      </ul>
                    ) : (
                      <p className="text-sm text-gray-500 italic">No items (will be populated from tier)</p>
                    )}
                  </div>
                </div>
              </div>

              {/* Payment Terms - Editable */}
              <div className="border-t-2 border-brown-light pt-6">
                <h3 className="text-lg font-semibold text-brown mb-4">Payment Terms</h3>
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-semibold text-brown mb-2">Upfront Percentage (%)</label>
                    <input
                      type="number"
                      value={contractTerms?.paymentTerms.upfrontPercentage || 80}
                      onChange={(e) => {
                        const upfrontPercent = parseInt(e.target.value) || 80
                        const finalPercent = 100 - upfrontPercent
                        const taxAmount = contractTaxRate ? (contractProjectCost * contractTaxRate / 100) : 0
                        const totalWithTax = contractProjectCost + taxAmount
                        setContractTerms({
                          ...contractTerms!,
                          paymentTerms: {
                            ...contractTerms!.paymentTerms,
                            upfrontPercentage: upfrontPercent,
                            finalPercentage: finalPercent,
                            upfrontAmount: Math.round(totalWithTax * (upfrontPercent / 100)),
                            finalAmount: Math.round(totalWithTax * (finalPercent / 100)),
                          },
                        })
                      }}
                      min="0"
                      max="100"
                      className="w-full px-3 py-2 border-2 border-brown-light rounded-lg focus:outline-none focus:border-brown"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-brown mb-2">Final Payment Due</label>
                    <input
                      type="text"
                      value={contractTerms?.paymentTerms.finalPaymentDue || ''}
                      onChange={(e) => {
                        setContractTerms({
                          ...contractTerms!,
                          paymentTerms: {
                            ...contractTerms!.paymentTerms,
                            finalPaymentDue: e.target.value,
                          },
                        })
                      }}
                      className="w-full px-3 py-2 border-2 border-brown-light rounded-lg focus:outline-none focus:border-brown"
                      placeholder="e.g., before launch"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-brown mb-2">Invoice Expiry Days</label>
                    <input
                      type="number"
                      value={contractTerms?.paymentTerms.invoiceExpiryDays || 7}
                      onChange={(e) => {
                        setContractTerms({
                          ...contractTerms!,
                          paymentTerms: {
                            ...contractTerms!.paymentTerms,
                            invoiceExpiryDays: parseInt(e.target.value) || 7,
                          },
                        })
                      }}
                      min="1"
                      className="w-full px-3 py-2 border-2 border-brown-light rounded-lg focus:outline-none focus:border-brown"
                    />
                  </div>
                  <div className="flex items-center gap-3">
                    <input
                      type="checkbox"
                      checked={contractTerms?.paymentTerms.consultationFeeNonRefundable ?? true}
                      onChange={(e) => {
                        setContractTerms({
                          ...contractTerms!,
                          paymentTerms: {
                            ...contractTerms!.paymentTerms,
                            consultationFeeNonRefundable: e.target.checked,
                          },
                        })
                      }}
                      className="w-5 h-5 text-brown-dark border-brown-light rounded focus:ring-brown"
                    />
                    <label className="text-sm font-semibold text-brown">
                      Consultation Fee is Non-Refundable
                    </label>
                  </div>
                  <div className="flex items-center gap-3">
                    <input
                      type="checkbox"
                      checked={contractTerms?.paymentTerms.noWorkWithoutPayment ?? true}
                      onChange={(e) => {
                        setContractTerms({
                          ...contractTerms!,
                          paymentTerms: {
                            ...contractTerms!.paymentTerms,
                            noWorkWithoutPayment: e.target.checked,
                          },
                        })
                      }}
                      className="w-5 h-5 text-brown-dark border-brown-light rounded focus:ring-brown"
                    />
                    <label className="text-sm font-semibold text-brown">
                      No Work Without Payment
                    </label>
                  </div>
                </div>
              </div>

              {/* Timelines - Editable */}
              <div className="border-t-2 border-brown-light pt-6">
                <h3 className="text-lg font-semibold text-brown mb-4">Timelines</h3>
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-semibold text-brown mb-2">Client Responsibilities</label>
                    {contractTerms?.timelines.clientResponsibilities.map((item: string, index: number) => (
                      <div key={`responsibility-${index}`} className="flex items-center mb-2">
                        <textarea
                          value={item}
                          onChange={(e) => {
                            const newResponsibilities = [...(contractTerms?.timelines.clientResponsibilities || [])]
                            newResponsibilities[index] = e.target.value
                            setContractTerms({
                              ...contractTerms!,
                              timelines: {
                                ...contractTerms!.timelines,
                                clientResponsibilities: newResponsibilities,
                              },
                            })
                          }}
                          rows={1}
                          className="flex-1 px-3 py-2 border-2 border-brown-light rounded-lg focus:outline-none focus:border-brown resize-none"
                          placeholder="e.g., Provide content and materials"
                        />
                        <button
                          type="button"
                          onClick={() => {
                            const newResponsibilities = contractTerms?.timelines.clientResponsibilities.filter((_: string, i: number) => i !== index) || []
                            setContractTerms({
                              ...contractTerms!,
                              timelines: {
                                ...contractTerms!.timelines,
                                clientResponsibilities: newResponsibilities,
                              },
                            })
                          }}
                          className="ml-2 text-red-600 hover:text-red-800 font-bold text-lg"
                        >
                          ×
                        </button>
                      </div>
                    ))}
                    <button
                      type="button"
                      onClick={() => {
                        const newResponsibilities = [...(contractTerms?.timelines.clientResponsibilities || []), '']
                        setContractTerms({
                          ...contractTerms!,
                          timelines: {
                            ...contractTerms!.timelines,
                            clientResponsibilities: newResponsibilities,
                          },
                        })
                      }}
                      className="mt-2 px-4 py-2 bg-brown-dark text-white rounded-lg font-semibold hover:bg-brown transition-colors text-sm"
                    >
                      + Add Client Responsibility
                    </button>
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-brown mb-2">Client Delays Policy</label>
                    <textarea
                      value={contractTerms?.timelines.clientDelays || ''}
                      onChange={(e) => {
                        setContractTerms({
                          ...contractTerms!,
                          timelines: {
                            ...contractTerms!.timelines,
                            clientDelays: e.target.value,
                          },
                        })
                      }}
                      rows={3}
                      className="w-full px-3 py-2 border-2 border-brown-light rounded-lg focus:outline-none focus:border-brown"
                      placeholder="e.g., Project timeline may be extended if client delays in providing required materials"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-brown mb-2">Provider Delays Policy</label>
                    <textarea
                      value={contractTerms?.timelines.providerDelays || ''}
                      onChange={(e) => {
                        setContractTerms({
                          ...contractTerms!,
                          timelines: {
                            ...contractTerms!.timelines,
                            providerDelays: e.target.value,
                          },
                        })
                      }}
                      rows={3}
                      className="w-full px-3 py-2 border-2 border-brown-light rounded-lg focus:outline-none focus:border-brown"
                      placeholder="e.g., We will communicate any delays promptly"
                    />
                  </div>
                </div>
              </div>

              {/* Boundaries - Editable */}
              <div className="border-t-2 border-brown-light pt-6">
                <h3 className="text-lg font-semibold text-brown mb-4">Boundaries</h3>
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-semibold text-brown mb-2">Revision Limit</label>
                    <input
                      type="number"
                      value={contractTerms?.boundaries.revisionLimit || 2}
                      onChange={(e) => {
                        setContractTerms({
                          ...contractTerms!,
                          boundaries: {
                            ...contractTerms!.boundaries,
                            revisionLimit: parseInt(e.target.value) || 2,
                          },
                        })
                      }}
                      min="0"
                      className="w-full px-3 py-2 border-2 border-brown-light rounded-lg focus:outline-none focus:border-brown"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-brown mb-2">Revision Type</label>
                    <input
                      type="text"
                      value={contractTerms?.boundaries.revisionType || ''}
                      onChange={(e) => {
                        setContractTerms({
                          ...contractTerms!,
                          boundaries: {
                            ...contractTerms!.boundaries,
                            revisionType: e.target.value,
                          },
                        })
                      }}
                      className="w-full px-3 py-2 border-2 border-brown-light rounded-lg focus:outline-none focus:border-brown"
                      placeholder="e.g., rounds"
                    />
                  </div>
                  <div className="flex items-center gap-3">
                    <input
                      type="checkbox"
                      checked={contractTerms?.boundaries.noRefundsAfterStart ?? true}
                      onChange={(e) => {
                        setContractTerms({
                          ...contractTerms!,
                          boundaries: {
                            ...contractTerms!.boundaries,
                            noRefundsAfterStart: e.target.checked,
                          },
                        })
                      }}
                      className="w-5 h-5 text-brown-dark border-brown-light rounded focus:ring-brown"
                    />
                    <label className="text-sm font-semibold text-brown">
                      No Refunds After Work Starts
                    </label>
                  </div>
                  <div className="flex items-center gap-3">
                    <input
                      type="checkbox"
                      checked={contractTerms?.boundaries.noEndlessChanges ?? true}
                      onChange={(e) => {
                        setContractTerms({
                          ...contractTerms!,
                          boundaries: {
                            ...contractTerms!.boundaries,
                            noEndlessChanges: e.target.checked,
                          },
                        })
                      }}
                      className="w-5 h-5 text-brown-dark border-brown-light rounded focus:ring-brown"
                    />
                    <label className="text-sm font-semibold text-brown">
                      No Endless Changes (Revision Limit Applies)
                    </label>
                  </div>
                </div>
              </div>

              {/* Confidentiality - Editable */}
              <div className="border-t-2 border-brown-light pt-6">
                <h3 className="text-lg font-semibold text-brown mb-4">Confidentiality & Intellectual Property</h3>
                <div className="space-y-3">
                  <div className="flex items-center gap-3">
                    <input
                      type="checkbox"
                      checked={contractTerms?.confidentiality.providerRetainsIPUntilPayment ?? true}
                      onChange={(e) => {
                        setContractTerms({
                          ...contractTerms!,
                          confidentiality: {
                            ...contractTerms!.confidentiality,
                            providerRetainsIPUntilPayment: e.target.checked,
                          },
                        })
                      }}
                      className="w-5 h-5 text-brown-dark border-brown-light rounded focus:ring-brown"
                    />
                    <label className="text-sm font-semibold text-brown">
                      Provider Retains IP Until Full Payment
                    </label>
                  </div>
                  <div className="flex items-center gap-3">
                    <input
                      type="checkbox"
                      checked={contractTerms?.confidentiality.clientReceivesIPOnFullPayment ?? true}
                      onChange={(e) => {
                        setContractTerms({
                          ...contractTerms!,
                          confidentiality: {
                            ...contractTerms!.confidentiality,
                            clientReceivesIPOnFullPayment: e.target.checked,
                          },
                        })
                      }}
                      className="w-5 h-5 text-brown-dark border-brown-light rounded focus:ring-brown"
                    />
                    <label className="text-sm font-semibold text-brown">
                      Client Receives IP Upon Full Payment
                    </label>
                  </div>
                  <div className="flex items-center gap-3">
                    <input
                      type="checkbox"
                      checked={contractTerms?.confidentiality.mutualNDA ?? true}
                      onChange={(e) => {
                        setContractTerms({
                          ...contractTerms!,
                          confidentiality: {
                            ...contractTerms!.confidentiality,
                            mutualNDA: e.target.checked,
                          },
                        })
                      }}
                      className="w-5 h-5 text-brown-dark border-brown-light rounded focus:ring-brown"
                    />
                    <label className="text-sm font-semibold text-brown">
                      Mutual NDA (Non-Disclosure Agreement)
                    </label>
                  </div>
                </div>
              </div>

              {/* Cancellation - Editable */}
              <div className="border-t-2 border-brown-light pt-6">
                <h3 className="text-lg font-semibold text-brown mb-4">Cancellation</h3>
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-semibold text-brown mb-2">Client Cancellation Policy</label>
                    <textarea
                      value={contractTerms?.cancellation.clientCancellationPolicy || ''}
                      onChange={(e) => {
                        setContractTerms({
                          ...contractTerms!,
                          cancellation: {
                            ...contractTerms!.cancellation,
                            clientCancellationPolicy: e.target.value,
                          },
                        })
                      }}
                      rows={3}
                      className="w-full px-3 py-2 border-2 border-brown-light rounded-lg focus:outline-none focus:border-brown"
                      placeholder="e.g., Consultation fee is non-refundable. If client cancels after work begins, no refund will be provided."
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-brown mb-2">Provider Cancellation Policy</label>
                    <textarea
                      value={contractTerms?.cancellation.providerCancellationPolicy || ''}
                      onChange={(e) => {
                        setContractTerms({
                          ...contractTerms!,
                          cancellation: {
                            ...contractTerms!.cancellation,
                            providerCancellationPolicy: e.target.value,
                          },
                        })
                      }}
                      rows={3}
                      className="w-full px-3 py-2 border-2 border-brown-light rounded-lg focus:outline-none focus:border-brown"
                      placeholder="e.g., Full refund if we cancel the project"
                    />
                  </div>
                </div>
              </div>

              {/* Liability - Editable */}
              <div className="border-t-2 border-brown-light pt-6">
                <h3 className="text-lg font-semibold text-brown mb-4">Liability</h3>
                <div className="space-y-3">
                  <div className="flex items-center gap-3">
                    <input
                      type="checkbox"
                      checked={contractTerms?.liability.noIndirectDamages ?? true}
                      onChange={(e) => {
                        setContractTerms({
                          ...contractTerms!,
                          liability: {
                            ...contractTerms!.liability,
                            noIndirectDamages: e.target.checked,
                          },
                        })
                      }}
                      className="w-5 h-5 text-brown-dark border-brown-light rounded focus:ring-brown"
                    />
                    <label className="text-sm font-semibold text-brown">
                      No Liability for Indirect Damages
                    </label>
                  </div>
                  <div className="flex items-center gap-3">
                    <input
                      type="checkbox"
                      checked={contractTerms?.liability.noThirdPartyResponsibility ?? true}
                      onChange={(e) => {
                        setContractTerms({
                          ...contractTerms!,
                          liability: {
                            ...contractTerms!.liability,
                            noThirdPartyResponsibility: e.target.checked,
                          },
                        })
                      }}
                      className="w-5 h-5 text-brown-dark border-brown-light rounded focus:ring-brown"
                    />
                    <label className="text-sm font-semibold text-brown">
                      No Responsibility for Third-Party Issues
                    </label>
                  </div>
                </div>
              </div>

              <div className="bg-blue-50 border-2 border-blue-400 rounded-lg p-4">
                <p className="text-sm text-blue-800 mb-2">
                  <strong>Contract Workflow:</strong>
                </p>
                <ol className="text-xs text-blue-700 list-decimal list-inside space-y-1">
                  <li>Contract will be sent via email to the client</li>
                  <li>Client receives a unique link to review and sign the contract</li>
                  <li>Once signed, you'll see a "✓ Contract Signed" status</li>
                  <li>After signing, you can create and send invoices</li>
                </ol>
                <p className="text-xs text-blue-700 mt-2">
                  <strong>Note:</strong> Contracts expire 7 days after being sent. All contract terms above can be customized before sending.
                </p>
              </div>

              <div className="flex gap-4 pt-4 border-t-2 border-brown-light">
                <button
                  onClick={handleSendContract}
                  disabled={sendingContract || !selectedTierForContract || !contractProjectDescription.trim() || !contractProjectCost}
                  className="flex-1 bg-purple-600 text-white px-6 py-3 rounded-lg font-semibold hover:bg-purple-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  title={!selectedTierForContract ? 'Please select a tier first' : !contractProjectDescription.trim() ? 'Please enter project description' : !contractProjectCost ? 'Please enter project cost' : 'Send Contract'}
                >
                  {sendingContract ? 'Sending...' : 'Send Contract'}
                </button>
                <button
                  onClick={() => setShowContractModal(false)}
                  className="px-6 py-3 border-2 border-brown-light text-brown rounded-lg font-semibold hover:bg-brown-light/20 transition-colors"
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Delete All Confirmation Modal */}
      {showDeleteConfirm && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-2xl max-w-md w-full">
            <div className="p-6 border-b-2 border-red-200">
              <h2 className="text-2xl font-semibold text-red-600">⚠️ Delete All Consultations?</h2>
            </div>
            <div className="p-6">
              <p className="text-gray-700 mb-4">
                Are you sure you want to delete <strong>all {consultations.length} consultations</strong>? This action cannot be undone.
              </p>
              <p className="text-sm text-gray-600 mb-4">
                This will permanently remove:
              </p>
              <ul className="text-sm text-gray-600 mb-6 list-disc list-inside space-y-1">
                <li>All consultation requests</li>
                <li>All invoices (to reset invoice numbering)</li>
              </ul>
              <p className="text-sm text-orange-600 font-semibold mb-6">
                ⚠️ Invoice numbering will start from the beginning (INV-YYYYMMDD-001) after deletion.
              </p>
              <div className="flex gap-4">
                <button
                  onClick={handleDeleteAll}
                  disabled={deletingAll}
                  className="flex-1 bg-red-600 text-white px-6 py-3 rounded-lg font-semibold hover:bg-red-700 transition-colors disabled:opacity-50"
                >
                  {deletingAll ? 'Deleting...' : 'Yes, Delete All'}
                </button>
                <button
                  onClick={() => setShowDeleteConfirm(false)}
                  disabled={deletingAll}
                  className="px-6 py-3 border-2 border-gray-300 text-gray-700 rounded-lg font-semibold hover:bg-gray-50 transition-colors disabled:opacity-50"
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

