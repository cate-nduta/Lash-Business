import { randomBytes } from 'crypto'

/**
 * Generate a strong, secure password
 * Format: 3 random words (4-6 chars each) + 2 numbers + 1 special char
 * Example: "Cloud9#River2$"
 */
export function generateStrongPassword(): string {
  // Word parts (easy to remember but secure)
  const wordParts = [
    'Cloud', 'River', 'Ocean', 'Mountain', 'Forest', 'Valley',
    'Star', 'Moon', 'Sun', 'Sky', 'Wind', 'Wave',
    'Light', 'Shadow', 'Flame', 'Storm', 'Rain', 'Snow',
    'Spring', 'Summer', 'Autumn', 'Winter', 'Dawn', 'Dusk'
  ]
  
  // Special characters
  const specialChars = ['!', '@', '#', '$', '%', '&', '*']
  
  // Pick 3 random word parts
  const part1 = wordParts[Math.floor(Math.random() * wordParts.length)]
  const part2 = wordParts[Math.floor(Math.random() * wordParts.length)]
  const part3 = wordParts[Math.floor(Math.random() * wordParts.length)]
  
  // Generate 2 random numbers (0-9)
  const num1 = Math.floor(Math.random() * 10)
  const num2 = Math.floor(Math.random() * 10)
  
  // Pick a random special character
  const special = specialChars[Math.floor(Math.random() * specialChars.length)]
  
  // Combine: word1 + num1 + special + word2 + num2 + word3
  // This creates a strong password that's still somewhat memorable
  const password = `${part1}${num1}${special}${part2}${num2}${part3}`
  
  // Ensure minimum length of 16 characters
  if (password.length < 16) {
    // Add more random characters if needed
    const extraChars = randomBytes(4).toString('hex').substring(0, 16 - password.length)
    return password + extraChars
  }
  
  return password
}

/**
 * Validate password strength
 */
export function isPasswordStrong(password: string): boolean {
  // At least 16 characters
  if (password.length < 16) return false
  
  // Contains uppercase
  if (!/[A-Z]/.test(password)) return false
  
  // Contains lowercase
  if (!/[a-z]/.test(password)) return false
  
  // Contains number
  if (!/[0-9]/.test(password)) return false
  
  // Contains special character
  if (!/[!@#$%&*]/.test(password)) return false
  
  return true
}

