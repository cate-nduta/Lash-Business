import { randomBytes, scryptSync, timingSafeEqual } from 'crypto'

const KEY_LENGTH = 64

export function hashPassword(password: string) {
  const salt = randomBytes(16).toString('hex')
  const derivedKey = scryptSync(password, salt, KEY_LENGTH).toString('hex')
  return `${salt}:${derivedKey}`
}

export function verifyPassword(password: string, storedHash: string) {
  if (!storedHash || !storedHash.includes(':')) {
    return false
  }

  const [salt, key] = storedHash.split(':')
  if (!salt || !key) {
    return false
  }

  const hashedBuffer = scryptSync(password, salt, KEY_LENGTH)
  const keyBuffer = Buffer.from(key, 'hex')

  if (hashedBuffer.length !== keyBuffer.length) {
    return false
  }

  return timingSafeEqual(hashedBuffer, keyBuffer)
}

export function generateInviteToken() {
  return randomBytes(32).toString('hex')
}

export function hashInviteToken(token: string) {
  const salt = randomBytes(8).toString('hex')
  const key = scryptSync(token, salt, 32).toString('hex')
  return `${salt}:${key}`
}

export function verifyInviteToken(token: string, storedHash: string) {
  if (!storedHash || !storedHash.includes(':')) {
    return false
  }

  const [salt, key] = storedHash.split(':')
  if (!salt || !key) {
    return false
  }

  const derived = scryptSync(token, salt, 32)
  const stored = Buffer.from(key, 'hex')

  if (derived.length !== stored.length) {
    return false
  }

  return timingSafeEqual(derived, stored)
}

