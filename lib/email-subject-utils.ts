/**
 * Ensures all email subjects end with the brown heart emoji (🤎)
 * Removes any existing sparkles (✨) and adds the brown heart at the end
 */
export function formatEmailSubject(subject: string): string {
  if (!subject || typeof subject !== 'string') {
    return '🤎'
  }

  // Remove sparkles from beginning and end
  let cleaned = subject.trim().replace(/^✨\s*/, '').replace(/\s*✨$/, '').trim()

  // Remove brown heart if it already exists at the end
  cleaned = cleaned.replace(/\s*🤎\s*$/, '').trim()

  // Add brown heart at the end
  return `${cleaned} 🤎`
}

