# Lesson 7: Adding Payment Receipts

## Introduction

Let's generate and send payment receipts to clients after successful payment. This provides proof of payment and professional service.

**Estimated Time**: 30 minutes

---

## Receipt Requirements

### What to Include

- Receipt number
- Payment date
- Amount paid
- Payment method
- Booking details
- Business information

---

## Step 1: Create Receipt Component

### Create components/PaymentReceipt.tsx

```typescript
interface PaymentReceiptProps {
  receipt: {
    receiptNumber: string
    date: string
    amount: number
    paymentMethod: string
    bookingId: string
    customerName: string
    customerEmail: string
    services: Array<{ name: string; price: number }>
  }
}

export default function PaymentReceipt({ receipt }: PaymentReceiptProps) {
  return (
    <div className="max-w-2xl mx-auto bg-white border border-gray-200 rounded-lg p-8">
      <div className="text-center mb-8">
        <h1 className="text-3xl font-bold mb-2">Payment Receipt</h1>
        <p className="text-gray-600">Receipt #{receipt.receiptNumber}</p>
      </div>

      <div className="space-y-4 mb-8">
        <div className="flex justify-between">
          <span className="text-gray-600">Date:</span>
          <span className="font-semibold">{new Date(receipt.date).toLocaleDateString()}</span>
        </div>
        
        <div className="flex justify-between">
          <span className="text-gray-600">Booking ID:</span>
          <span className="font-semibold">{receipt.bookingId}</span>
        </div>
        
        <div className="flex justify-between">
          <span className="text-gray-600">Customer:</span>
          <span className="font-semibold">{receipt.customerName}</span>
        </div>
        
        <div className="flex justify-between">
          <span className="text-gray-600">Email:</span>
          <span className="font-semibold">{receipt.customerEmail}</span>
        </div>
      </div>

      <div className="border-t border-b border-gray-200 py-4 mb-4">
        <h3 className="font-semibold mb-2">Services:</h3>
        {receipt.services.map((service, index) => (
          <div key={index} className="flex justify-between mb-1">
            <span>{service.name}</span>
            <span>${service.price}</span>
          </div>
        ))}
      </div>

      <div className="flex justify-between items-center mb-8">
        <span className="text-xl font-semibold">Total Paid:</span>
        <span className="text-2xl font-bold text-blue-600">${receipt.amount}</span>
      </div>

      <div className="text-center text-sm text-gray-500 border-t pt-4">
        <p>Payment Method: {receipt.paymentMethod}</p>
        <p className="mt-2">Thank you for your payment!</p>
      </div>
    </div>
  )
}
```

---

## Step 2: Generate Receipt Function

### Create lib/receipt-utils.ts

```typescript
export function generateReceiptNumber(): string {
  const timestamp = Date.now()
  const random = Math.floor(Math.random() * 1000)
  return `RCP-${timestamp}-${random}`
}

export function createReceipt(booking: any, paymentInfo: any) {
  return {
    receiptNumber: generateReceiptNumber(),
    date: new Date().toISOString(),
    amount: booking.totalAmount,
    paymentMethod: paymentInfo.method || 'Pesapal',
    bookingId: booking.id,
    customerName: booking.clientName,
    customerEmail: booking.clientEmail,
    services: booking.services,
    businessName: process.env.NEXT_PUBLIC_BUSINESS_NAME || 'Your Business',
    businessAddress: process.env.NEXT_PUBLIC_BUSINESS_ADDRESS || '',
    businessPhone: process.env.NEXT_PUBLIC_BUSINESS_PHONE || ''
  }
}
```

---

## Step 3: Send Receipt Email

### Update payment callback

```typescript
import { createReceipt } from '@/lib/receipt-utils'
import { sendEmail } from '@/lib/email-utils'

// After payment confirmed
const receipt = createReceipt(booking, paymentInfo)

// Save receipt to booking
booking.receipt = receipt
updateBooking(booking)

// Send email with receipt
await sendEmail({
  to: booking.clientEmail,
  subject: 'Payment Receipt - Your Booking',
  html: generateReceiptEmailHTML(receipt)
})
```

---

## Step 4: Receipt Email Template

### Create email template

```typescript
function generateReceiptEmailHTML(receipt: any): string {
  return `
    <!DOCTYPE html>
    <html>
    <head>
      <style>
        body { font-family: Arial, sans-serif; }
        .receipt { max-width: 600px; margin: 0 auto; padding: 20px; }
        .header { text-align: center; margin-bottom: 30px; }
        .details { margin: 20px 0; }
        .total { font-size: 24px; font-weight: bold; color: #2563eb; }
      </style>
    </head>
    <body>
      <div class="receipt">
        <div class="header">
          <h1>Payment Receipt</h1>
          <p>Receipt #${receipt.receiptNumber}</p>
        </div>
        <div class="details">
          <p><strong>Date:</strong> ${new Date(receipt.date).toLocaleDateString()}</p>
          <p><strong>Amount:</strong> $${receipt.amount}</p>
          <p><strong>Booking ID:</strong> ${receipt.bookingId}</p>
        </div>
        <p class="total">Total: $${receipt.amount}</p>
        <p>Thank you for your payment!</p>
      </div>
    </body>
    </html>
  `
}
```

---

## Step 5: Display Receipt Page

### Create app/booking/receipt/page.tsx

```typescript
'use client'

import { useEffect, useState } from 'react'
import { useSearchParams } from 'next/navigation'
import PaymentReceipt from '@/components/PaymentReceipt'

export default function ReceiptPage() {
  const searchParams = useSearchParams()
  const [receipt, setReceipt] = useState(null)

  useEffect(() => {
    const bookingId = searchParams.get('id')
    if (bookingId) {
      fetch(`/api/bookings/${bookingId}/receipt`)
        .then(res => res.json())
        .then(data => setReceipt(data.receipt))
    }
  }, [searchParams])

  if (!receipt) return <div>Loading receipt...</div>

  return (
    <div className="min-h-screen bg-gray-50 py-12">
      <PaymentReceipt receipt={receipt} />
      <div className="text-center mt-6">
        <button
          onClick={() => window.print()}
          className="bg-blue-600 text-white px-6 py-2 rounded-lg"
        >
          Print Receipt
        </button>
      </div>
    </div>
  )
}
```

---

## Key Takeaways

✅ **Payment receipts** provide proof of payment

✅ **Receipt generation** creates unique receipt numbers

✅ **Email receipts** sent automatically

✅ **Receipt page** for viewing/printing

---

## Module 5 Complete!

Congratulations! Payment integration is complete.

**You've built:**
- ✅ Pesapal account setup
- ✅ API configuration
- ✅ Payment endpoints
- ✅ Booking flow integration
- ✅ Callback handling
- ✅ Payment receipts

**Next Module**: Client Accounts & Authentication!

**Ready to continue?** Click "Next Module" to proceed!

