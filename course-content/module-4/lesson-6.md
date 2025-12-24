# Lesson 6: Building the Booking Form

## Introduction

Let's create a comprehensive booking form with validation to collect client information and complete the booking.

**Estimated Time**: 40 minutes

---

## Form Requirements

### Fields Needed

- Name (required)
- Email (required, valid format)
- Phone (required)
- Special requests (optional)
- Terms acceptance (required)

---

## Step 1: Create Booking Form Component

### Create components/BookingForm.tsx

```typescript
'use client'

import { useState } from 'react'

interface BookingFormProps {
  onSubmit: (data: FormData) => void
  loading?: boolean
}

interface FormData {
  name: string
  email: string
  phone: string
  specialRequests: string
  acceptTerms: boolean
}

export default function BookingForm({ onSubmit, loading }: BookingFormProps) {
  const [formData, setFormData] = useState<FormData>({
    name: '',
    email: '',
    phone: '',
    specialRequests: '',
    acceptTerms: false
  })
  const [errors, setErrors] = useState<Partial<FormData>>({})

  const validate = (): boolean => {
    const newErrors: Partial<FormData> = {}

    if (!formData.name.trim()) {
      newErrors.name = 'Name is required'
    }

    if (!formData.email.trim()) {
      newErrors.email = 'Email is required'
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      newErrors.email = 'Invalid email format'
    }

    if (!formData.phone.trim()) {
      newErrors.phone = 'Phone is required'
    }

    if (!formData.acceptTerms) {
      newErrors.acceptTerms = 'You must accept the terms'
    }

    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (validate()) {
      onSubmit(formData)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* Name */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Full Name *
        </label>
        <input
          type="text"
          value={formData.name}
          onChange={(e) => setFormData({ ...formData, name: e.target.value })}
          className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
        />
        {errors.name && <p className="text-red-500 text-sm mt-1">{errors.name}</p>}
      </div>

      {/* Email */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Email *
        </label>
        <input
          type="email"
          value={formData.email}
          onChange={(e) => setFormData({ ...formData, email: e.target.value })}
          className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
        />
        {errors.email && <p className="text-red-500 text-sm mt-1">{errors.email}</p>}
      </div>

      {/* Phone */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Phone *
        </label>
        <input
          type="tel"
          value={formData.phone}
          onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
          className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
        />
        {errors.phone && <p className="text-red-500 text-sm mt-1">{errors.phone}</p>}
      </div>

      {/* Special Requests */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Special Requests (Optional)
        </label>
        <textarea
          value={formData.specialRequests}
          onChange={(e) => setFormData({ ...formData, specialRequests: e.target.value })}
          rows={4}
          className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
        />
      </div>

      {/* Terms */}
      <div>
        <label className="flex items-center">
          <input
            type="checkbox"
            checked={formData.acceptTerms}
            onChange={(e) => setFormData({ ...formData, acceptTerms: e.target.checked })}
            className="mr-2"
          />
          <span className="text-sm">
            I accept the <a href="/terms" className="text-blue-600">terms and conditions</a> *
          </span>
        </label>
        {errors.acceptTerms && <p className="text-red-500 text-sm mt-1">{errors.acceptTerms}</p>}
      </div>

      {/* Submit */}
      <button
        type="submit"
        disabled={loading}
        className="w-full bg-blue-600 text-white py-3 rounded-lg font-semibold hover:bg-blue-700 disabled:opacity-50"
      >
        {loading ? 'Processing...' : 'Complete Booking'}
      </button>
    </form>
  )
}
```

---

## Step 2: Integrate with Booking Page

### Update booking page

```typescript
const [isSubmitting, setIsSubmitting] = useState(false)

const handleFormSubmit = async (formData: FormData) => {
  setIsSubmitting(true)
  
  const bookingData = {
    serviceIds: selectedServices,
    date: format(selectedDate!, 'yyyy-MM-dd'),
    time: selectedTime!,
    ...formData
  }

  try {
    const response = await fetch('/api/bookings', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(bookingData)
    })

    if (response.ok) {
      // Handle success
      router.push('/booking/confirmation')
    } else {
      // Handle error
      alert('Booking failed. Please try again.')
    }
  } finally {
    setIsSubmitting(false)
  }
}

return (
  <div>
    {/* ... other components ... */}
    {selectedDate && selectedTime && selectedServices.length > 0 && (
      <BookingForm onSubmit={handleFormSubmit} loading={isSubmitting} />
    )}
  </div>
)
```

---

## Key Takeaways

✅ **Booking form** collects client information

✅ **Validation** ensures data quality

✅ **Error messages** guide users

✅ **Terms acceptance** required

✅ **Loading state** during submission

---

## What's Next?

Perfect! The form is complete. Next, we'll create API endpoints to handle booking submissions.

**Ready to continue?** Click "Next Lesson" to proceed!

