'use client'

import { useEffect, useState } from 'react'

interface PaystackInlinePaymentProps {
  publicKey: string
  email: string
  amount: number // Amount in main currency (e.g., 5000 for 5000 KES)
  currency: string // 'KES' or 'USD'
  reference: string
  onSuccess: (reference: string) => void
  onClose: () => void
  metadata?: Record<string, any>
  customerName?: string
  phone?: string
}

declare global {
  interface Window {
    PaystackPop: {
      setup: (options: {
        key: string
        email: string
        amount: number // Amount in subunits (kobo/cents)
        currency: string
        ref: string
        metadata?: Record<string, any>
        callback: (response: { reference: string; status: string; message: string }) => void
        onClose: () => void
        channels?: string[]
      }) => {
        openIframe: () => void
      }
    }
  }
}

export default function PaystackInlinePayment({
  publicKey,
  email,
  amount,
  currency,
  reference,
  onSuccess,
  onClose,
  metadata,
  customerName,
  phone,
}: PaystackInlinePaymentProps) {
  const [isScriptLoaded, setIsScriptLoaded] = useState(false)
  const [isProcessing, setIsProcessing] = useState(false)

  // Load Paystack inline script
  useEffect(() => {
    // Check if script is already loaded
    if (window.PaystackPop) {
      setIsScriptLoaded(true)
      return
    }

    // Check if script tag already exists
    const existingScript = document.querySelector('script[src*="paystack"]')
    if (existingScript) {
      setIsScriptLoaded(true)
      return
    }

    // Load Paystack inline script
    const script = document.createElement('script')
    script.src = 'https://js.paystack.co/v1/inline.js'
    script.async = true
    script.onload = () => {
      setIsScriptLoaded(true)
    }
    script.onerror = () => {
      console.error('Failed to load Paystack inline script')
      onClose()
    }
    document.body.appendChild(script)

    return () => {
      // Cleanup: remove script if component unmounts
      const scriptTag = document.querySelector('script[src*="paystack"]')
      if (scriptTag) {
        scriptTag.remove()
      }
    }
  }, [onClose])

  // Initialize payment when script is loaded
  useEffect(() => {
    if (!isScriptLoaded || !window.PaystackPop || isProcessing) return

    setIsProcessing(true)

    // Convert amount to subunits (kobo/cents)
    // KES and USD use 100 subunits
    const amountInSubunits = Math.round(amount * 100)

    // Prepare metadata
    const paymentMetadata: Record<string, any> = {
      ...metadata,
    }

    if (customerName) {
      paymentMetadata.custom_fields = [
        {
          display_name: 'Customer Name',
          variable_name: 'customer_name',
          value: customerName,
        },
      ]
    }

    if (phone) {
      if (!paymentMetadata.custom_fields) {
        paymentMetadata.custom_fields = []
      }
      paymentMetadata.custom_fields.push({
        display_name: 'Phone Number',
        variable_name: 'phone',
        value: phone,
      })
    }

    try {
      // Format phone number for mobile money (Paystack requires phone in international format without +)
      let formattedPhone: string | undefined = undefined
      if (phone) {
        // Remove all non-digit characters
        let cleaned = phone.replace(/\D/g, '')
        // Remove leading + if present (already handled by replace)
        // Ensure it starts with country code (e.g., 254 for Kenya)
        if (cleaned.length >= 9 && cleaned.length <= 15) {
          formattedPhone = cleaned
        } else {
          console.warn('Phone number format invalid for mobile money:', phone, 'cleaned:', cleaned)
        }
      }

      // Determine available channels based on phone availability and currency
      // mobile_money requires a valid phone number and is only available for certain currencies
      const baseChannels = ['card', 'bank', 'ussd', 'qr', 'bank_transfer']
      const channels = formattedPhone && (currency.toUpperCase() === 'KES' || currency.toUpperCase() === 'GHS' || currency.toUpperCase() === 'UGX')
        ? [...baseChannels, 'mobile_money']
        : baseChannels

      // PaystackPop.setup() creates a transaction directly from frontend
      // We use the reference from backend initialization to track the payment
      // The amount and other details are provided here to create the payment form
      const setupOptions: any = {
        key: publicKey,
        email: email.toLowerCase().trim(),
        amount: amountInSubunits, // Amount in subunits (kobo/cents)
        currency: currency.toUpperCase(),
        ref: reference, // Use the reference from backend initialization
        metadata: Object.keys(paymentMetadata).length > 0 ? paymentMetadata : undefined,
        channels: channels,
        callback: (response: { reference: string; status: string; message: string }) => {
          setIsProcessing(false)
          if (response.status === 'success') {
            // Payment successful - verify with backend
            onSuccess(response.reference)
          } else {
            console.error('Payment failed:', response.message)
            onClose()
          }
        },
        onClose: () => {
          setIsProcessing(false)
          onClose()
        },
      }

      // Add phone to metadata for mobile money (Paystack uses metadata.phone for mobile money)
      if (formattedPhone) {
        if (!setupOptions.metadata) {
          setupOptions.metadata = {}
        }
        setupOptions.metadata.phone = formattedPhone
      }

      const handler = window.PaystackPop.setup(setupOptions)

      // Open payment popup/iframe
      handler.openIframe()
    } catch (error) {
      console.error('Error initializing Paystack payment:', error)
      setIsProcessing(false)
      onClose()
    }
  }, [isScriptLoaded, publicKey, email, amount, currency, reference, metadata, customerName, phone, onSuccess, onClose, isProcessing])

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-md w-full p-6">
        <div className="text-center">
          {!isScriptLoaded ? (
            <>
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[var(--color-primary)] mx-auto mb-4"></div>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">Loading Payment Gateway</h3>
              <p className="text-sm text-gray-600">Please wait while we load the secure payment form...</p>
            </>
          ) : isProcessing ? (
            <>
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[var(--color-primary)] mx-auto mb-4"></div>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">Processing Payment</h3>
              <p className="text-sm text-gray-600">Please complete your payment in the popup window.</p>
            </>
          ) : null}
        </div>
      </div>
    </div>
  )
}

