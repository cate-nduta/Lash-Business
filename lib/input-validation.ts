const CONTROL_CHARS_REGEX = /[\u0000-\u001F\u007F]/g
const MULTIPLE_SPACES_REGEX = /\s+/g
const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
const PHONE_DIGITS_REGEX = /[^\d+]/g

export class ValidationError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'ValidationError'
  }
}

type SanitizeOptions = {
  fieldName?: string
  maxLength?: number
  minLength?: number
  allowNewLines?: boolean
  allowSymbols?: boolean
  optional?: boolean
  toLowerCase?: boolean
}

const defaultOptions: Required<Omit<SanitizeOptions, 'fieldName' | 'minLength'>> = {
  maxLength: 200,
  allowNewLines: false,
  allowSymbols: true,
  optional: false,
  toLowerCase: false,
}

const stripUnsafeSymbols = (value: string) =>
  value.replace(/[<>]/g, '')

export function sanitizeText(value: unknown, options?: SanitizeOptions): string {
  const resolved = { ...defaultOptions, ...options }
  const fieldName = resolved.fieldName || 'Field'

  if (value === undefined || value === null) {
    if (resolved.optional) {
      return ''
    }
    throw new ValidationError(`${fieldName} is required.`)
  }

  if (typeof value !== 'string') {
    throw new ValidationError(`${fieldName} must be a string.`)
  }

  let result = value.trim()
  if (!resolved.allowNewLines) {
    result = result.replace(/[\r\n]+/g, ' ')
  }

  result = result.replace(CONTROL_CHARS_REGEX, '')
  result = resolved.allowSymbols ? result : stripUnsafeSymbols(result)
  result = result.replace(MULTIPLE_SPACES_REGEX, ' ')

  if (resolved.minLength && result.length < resolved.minLength) {
    throw new ValidationError(`${fieldName} must be at least ${resolved.minLength} characters.`)
  }

  if (!result && !resolved.optional) {
    throw new ValidationError(`${fieldName} cannot be empty.`)
  }

  if (result.length > resolved.maxLength) {
    result = result.slice(0, resolved.maxLength)
  }

  if (resolved.toLowerCase) {
    result = result.toLowerCase()
  }

  return result
}

export function sanitizeOptionalText(value: unknown, options?: SanitizeOptions): string {
  return sanitizeText(value ?? '', { ...options, optional: true })
}

export function sanitizeEmail(value: unknown, fieldName = 'Email'): string {
  const email = sanitizeText(value, {
    fieldName,
    maxLength: 160,
    allowNewLines: false,
    allowSymbols: true,
    toLowerCase: true,
  })

  if (!EMAIL_REGEX.test(email)) {
    throw new ValidationError(`${fieldName} is not valid.`)
  }

  return email
}

export function sanitizePhone(value: unknown, fieldName = 'Phone'): string {
  if (typeof value !== 'string' && typeof value !== 'number') {
    throw new ValidationError(`${fieldName} is required.`)
  }

  const phone = String(value).replace(PHONE_DIGITS_REGEX, '')
  if (phone.length < 7 || phone.length > 20) {
    throw new ValidationError(`${fieldName} must be between 7 and 20 digits.`)
  }

  return phone
}

export function sanitizeStringArray(
  value: unknown,
  options?: SanitizeOptions & { maxItems?: number },
): string[] {
  if (!Array.isArray(value)) {
    return []
  }

  const maxItems = options?.maxItems ?? 10
  return value
    .filter((item): item is string => typeof item === 'string')
    .slice(0, maxItems)
    .map((item, index) =>
      sanitizeText(item, {
        ...options,
        fieldName: `${options?.fieldName || 'Item'} ${index + 1}`,
        optional: true,
      }),
    )
    .filter((item) => item.length > 0)
}

export function sanitizeNotes(value: unknown, fieldName = 'Notes', maxLength = 1000): string {
  return sanitizeText(value, {
    fieldName,
    maxLength,
    allowNewLines: true,
    optional: true,
  })
}


