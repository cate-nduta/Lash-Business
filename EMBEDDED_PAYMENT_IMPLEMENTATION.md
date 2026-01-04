# Embedded Paystack Payment Implementation (No Redirect)

## 🎯 Requirement
Payments must stay on the website - NO redirect to Paystack payment page.

## ✅ Solution: Paystack Inline Popup

### Method 1: React Paystack Hook (Recommended)

**Install:**
```bash
npm install react-paystack
```

**Implementation:**

```typescript
// components/paystack-embed.tsx
'use client'

import { usePaystackPayment } from 'react-paystack';
import { useState } from 'react';

interface PaystackEmbedProps {
  email: string;
  amount: number; // in dollars
  businessSubaccountCode: string;
  tier: 'free' | 'tier1' | 'tier2';
  onSuccess: (reference: string) => void;
  onClose: () => void;
}

export default function PaystackEmbed({
  email,
  amount,
  businessSubaccountCode,
  tier,
  onSuccess,
  onClose
}: PaystackEmbedProps) {
  const [loading, setLoading] = useState(false);

  // Calculate split percentages
  const getSplitConfig = () => {
    if (tier === 'tier1') {
      return {
        businessShare: 95,
        platformShare: 5
      };
    } else if (tier === 'tier2') {
      return {
        businessShare: 97,
        platformShare: 3
      };
    } else { // free tier
      return {
        businessShare: 93,
        platformShare: 7
      };
    }
  };

  const split = getSplitConfig();
  const YOUR_MAIN_SUBACCOUNT_CODE = process.env.NEXT_PUBLIC_PAYSTACK_MAIN_SUBACCOUNT!;

  const config = {
    reference: `txn_${Date.now()}`,
    email: email,
    amount: amount * 100, // Convert to kobo/cent
    publicKey: process.env.NEXT_PUBLIC_PAYSTACK_PUBLIC_KEY!,
    currency: 'NGN', // or 'KES' if available
    subaccount: businessSubaccountCode,
    split: {
      type: "percentage",
      currency: "NGN",
      subaccounts: [
        {
          subaccount: businessSubaccountCode,
          share: split.businessShare
        },
        {
          subaccount: YOUR_MAIN_SUBACCOUNT_CODE,
          share: split.platformShare
        }
      ]
    },
    metadata: {
      custom_fields: [
        {
          display_name: "Business Tier",
          variable_name: "tier",
          value: tier
        }
      ]
    },
    onSuccess: (reference: any) => {
      setLoading(false);
      onSuccess(reference.reference);
    },
    onClose: () => {
      setLoading(false);
      onClose();
    }
  };

  const initializePayment = usePaystackPayment(config);

  const handlePayment = () => {
    setLoading(true);
    initializePayment();
  };

  return (
    <div>
      <button
        onClick={handlePayment}
        disabled={loading}
        className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
      >
        {loading ? 'Processing...' : `Pay ${amount}`}
      </button>
    </div>
  );
}
```

### Method 2: Paystack Inline JS (Alternative)

**Direct Integration:**
```typescript
// components/paystack-inline.tsx
'use client'

import { useEffect } from 'react';

declare global {
  interface Window {
    PaystackPop: any;
  }
}

export default function PaystackInline({ config, onSuccess, onClose }: any) {
  useEffect(() => {
    // Load Paystack script
    const script = document.createElement('script');
    script.src = 'https://js.paystack.co/v1/inline.js';
    script.async = true;
    document.body.appendChild(script);

    return () => {
      document.body.removeChild(script);
    };
  }, []);

  const handlePayment = () => {
    if (window.PaystackPop) {
      const handler = window.PaystackPop.setup({
        ...config,
        callback: function(response: any) {
          onSuccess(response.reference);
        },
        onClose: function() {
          onClose();
        }
      });
      handler.openIframe();
    }
  };

  return (
    <button onClick={handlePayment}>
      Pay Now
    </button>
  );
}
```

## 📝 Usage in Booking Page

```typescript
// app/[business-slug]/book/page.tsx
'use client'

import { useState } from 'react';
import PaystackEmbed from '@/components/paystack-embed';

export default function BookingPage() {
  const [showPayment, setShowPayment] = useState(false);
  const [bookingData, setBookingData] = useState(null);

  const handlePaymentSuccess = async (reference: string) => {
    // Verify payment
    const response = await fetch('/api/paystack/verify', {
      method: 'POST',
      body: JSON.stringify({ reference })
    });

    const data = await response.json();
    
    if (data.success) {
      // Update booking status
      // Show success message
      // Redirect to confirmation page
    }
  };

  return (
    <div>
      {/* Booking form */}
      
      {showPayment && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white p-6 rounded-lg">
            <h2>Complete Payment</h2>
            <PaystackEmbed
              email={bookingData.email}
              amount={bookingData.amount}
              businessSubaccountCode={business.subaccountCode}
              tier={business.tier}
              onSuccess={handlePaymentSuccess}
              onClose={() => setShowPayment(false)}
            />
          </div>
        </div>
      )}
    </div>
  );
}
```

## 🔧 API Route for Payment Verification

```typescript
// app/api/paystack/verify/route.ts
import { NextRequest, NextResponse } from 'next/server';
import axios from 'axios';

export async function POST(request: NextRequest) {
  try {
    const { reference } = await request.json();

    // Verify with Paystack
    const response = await axios.get(
      `https://api.paystack.co/transaction/verify/${reference}`,
      {
        headers: {
          Authorization: `Bearer ${process.env.PAYSTACK_SECRET_KEY}`
        }
      }
    );

    if (response.data.status) {
      const transaction = response.data.data;

      // Update booking status
      // Record transaction
      // Update free tier transaction count if needed

      return NextResponse.json({
        success: true,
        transaction
      });
    }

    return NextResponse.json({
      success: false,
      error: 'Payment verification failed'
    });
  } catch (error) {
    return NextResponse.json({
      success: false,
      error: 'Payment verification error'
    });
  }
}
```

## ✅ Key Points

1. **No Redirect**: Payment opens in popup/iframe, stays on your site
2. **Split Payment**: Automatically splits between business subaccount and your main account
3. **Callback Handling**: Success/close callbacks handled on your page
4. **Verification**: Verify payment after success callback
5. **User Experience**: Smooth, no page reloads

## 🎨 UI Options

### Option 1: Modal Popup
- Payment form opens in modal overlay
- User stays on booking page
- Close modal after payment

### Option 2: Inline Form
- Payment form embedded directly in page
- No popup
- Seamless experience

### Option 3: Slide-in Panel
- Payment panel slides in from side
- Modern UX
- Easy to close

Choose based on your design preference!

