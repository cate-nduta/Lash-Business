/**
 * MODULE 3 EXAMPLE: Simplified Services API
 * 
 * This is a simplified version of the services API that follows
 * the step-by-step approach from Module 3.
 * 
 * Use this as a reference when learning Module 3.
 */

import { NextResponse } from 'next/server'
import { readDataFile } from '@/lib/data-utils'

export async function GET() {
  try {
    // Read services from data file
    const data = await readDataFile<{ services?: any[], categories?: any[] }>('services.json', {})
    
    // If services are in a flat array (Module 3 format)
    if (Array.isArray(data.services)) {
      return NextResponse.json(data.services)
    }
    
    // If services are in categories (current format)
    if (Array.isArray(data.categories)) {
      // Flatten categories into a simple services array for Module 3
      const allServices: any[] = []
      data.categories.forEach((category: any) => {
        if (Array.isArray(category.services)) {
          category.services.forEach((service: any) => {
            allServices.push({
              id: service.id,
              name: service.name,
              description: service.description || '',
              price: service.price || 0,
              duration: service.duration || 60,
              category: category.name || 'Other'
            })
          })
        }
      })
      return NextResponse.json(allServices)
    }
    
    // Return empty array if no services found
    return NextResponse.json([])
  } catch (error) {
    console.error('Error fetching services:', error)
    return NextResponse.json(
      { error: 'Failed to fetch services' },
      { status: 500 }
    )
  }
}

