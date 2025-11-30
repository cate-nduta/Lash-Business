import { readDataFile, writeDataFile } from './data-utils'

export interface EmailSubscriber {
  email: string
  name?: string | null
  subscribedAt?: string
}

export interface EmailSubscribersData {
  subscribers: EmailSubscriber[]
}

const DEFAULT_SUBSCRIBERS_DATA: EmailSubscribersData = {
  subscribers: [],
}

/**
 * Add a subscriber to the email list if they don't already exist
 * @param email - The email address to add
 * @param name - Optional name for the subscriber
 * @returns true if added, false if already exists
 */
export async function addEmailSubscriber(
  email: string,
  name?: string | null,
): Promise<boolean> {
  try {
    if (!email || typeof email !== 'string') {
      return false
    }

    const normalizedEmail = email.trim().toLowerCase()
    if (!normalizedEmail || !normalizedEmail.includes('@')) {
      return false
    }

    const data = await readDataFile<EmailSubscribersData>(
      'email-subscribers.json',
      DEFAULT_SUBSCRIBERS_DATA,
    )

    const subscribers = data?.subscribers || []

    // Check if email already exists
    const existingIndex = subscribers.findIndex(
      (sub) => sub.email?.trim().toLowerCase() === normalizedEmail,
    )

    if (existingIndex >= 0) {
      // Update name if provided and different
      if (name && name.trim().length > 0) {
        const existing = subscribers[existingIndex]
        if (!existing.name || existing.name.trim() !== name.trim()) {
          subscribers[existingIndex] = {
            ...existing,
            name: name.trim(),
          }
          await writeDataFile<EmailSubscribersData>('email-subscribers.json', {
            subscribers,
          })
        }
      }
      return false // Already exists
    }

    // Add new subscriber
    const newSubscriber: EmailSubscriber = {
      email: normalizedEmail,
      name: name && name.trim().length > 0 ? name.trim() : null,
      subscribedAt: new Date().toISOString(),
    }

    subscribers.push(newSubscriber)
    await writeDataFile<EmailSubscribersData>('email-subscribers.json', {
      subscribers,
    })

    return true
  } catch (error) {
    console.error('Error adding email subscriber:', error)
    return false
  }
}

/**
 * Get all email subscribers
 */
export async function getEmailSubscribers(): Promise<EmailSubscriber[]> {
  try {
    const data = await readDataFile<EmailSubscribersData>(
      'email-subscribers.json',
      DEFAULT_SUBSCRIBERS_DATA,
    )
    return data?.subscribers || []
  } catch (error) {
    console.error('Error loading email subscribers:', error)
    return []
  }
}

