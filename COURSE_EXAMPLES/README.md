# Course Examples - Module 3: Booking System Core

This folder contains simplified example implementations that follow the step-by-step approach from Module 3 of the course.

## Files

### 1. `module-3-simple-booking-page.tsx`
A simplified booking page component that demonstrates:
- Step-by-step booking flow (Date → Time → Service → Form)
- Progressive disclosure (each step appears after the previous)
- Service loading from API
- Form submission

**How to use:**
- This is a reference implementation
- Compare it with the existing `app/booking/page.tsx` to see the differences
- Use it as a learning tool to understand the basic booking flow

### 2. `module-3-simple-services-api.ts`
A simplified services API endpoint that:
- Reads services from `data/services.json`
- Handles both flat array and categorized formats
- Returns a simple array of services

**How to use:**
- This demonstrates the basic API structure from Module 3
- The actual API at `app/api/services/route.ts` is more complex
- Use this to understand the core concept

### 3. `module-3-simple-availability-api.ts`
A simplified availability API that:
- Returns time slots for a specific date
- Filters out already-booked times
- Uses business hours from `data/availability.json`

**How to use:**
- Compare with `app/api/calendar/available-slots/route.ts`
- Shows the basic logic for checking availability

### 4. `module-3-simple-bookings-api.ts`
A simplified bookings API that:
- Creates new bookings
- Saves to `data/bookings.json`
- Validates required fields

**How to use:**
- Compare with `app/api/calendar/book/route.ts`
- Shows the basic booking creation flow

## Purpose

These examples are designed to:
1. **Teach the concepts** - Show how the booking system works step-by-step
2. **Provide reference** - Help you understand the existing complex implementation
3. **Enable learning** - Allow you to see simplified versions before diving into the full system

## Next Steps

After reviewing these examples:
1. Read `MODULE_03_BOOKING_SYSTEM_CORE.md` for detailed explanations
2. Compare these examples with the actual implementation
3. Try modifying the examples to add your own features
4. Move on to Module 4: Payment Integration

## Note

These are **educational examples**, not production code. The actual implementation in the codebase is more robust and includes:
- Error handling
- Authentication
- Payment processing
- Email notifications
- Calendar integration
- And much more!

Use these examples to understand the fundamentals, then explore the full implementation.

