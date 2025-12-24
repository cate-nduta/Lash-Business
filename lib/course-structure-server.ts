/**
 * Server-side course structure loader
 * This file handles loading custom course structure from data files
 * Only use this in server components or API routes
 */

import { readFileSync } from 'fs'
import path from 'path'
import { courseStructure as defaultCourseStructure, type Module } from './course-structure'
import { aiCourseStructure } from './course-structure-ai'

/**
 * Load course structure based on course ID
 * @param courseId - Optional course ID to load course-specific structure
 * @returns Array of modules for the course
 */
export function loadCourseStructure(courseId?: string): Module[] {
  // Course-specific structures
  if (courseId === 'course-ai-booking-website') {
    // Try to load custom structure from file first
    try {
      const structureFile = path.join(process.cwd(), 'data', 'course-structure-ai.json')
      const data = readFileSync(structureFile, 'utf-8')
      const parsed = JSON.parse(data)
      if (Array.isArray(parsed) && parsed.length > 0) {
        return parsed
      }
    } catch (error) {
      // File doesn't exist, use default AI course structure
    }
    return aiCourseStructure
  }

  // Default course structure (for course-booking-website and others)
  try {
    const structureFile = path.join(process.cwd(), 'data', 'course-structure.json')
    const data = readFileSync(structureFile, 'utf-8')
    const parsed = JSON.parse(data)
    if (Array.isArray(parsed) && parsed.length > 0) {
      return parsed
    }
  } catch (error) {
    // File doesn't exist or is invalid, use default structure
    // This is expected on first run
  }
  return defaultCourseStructure
}

