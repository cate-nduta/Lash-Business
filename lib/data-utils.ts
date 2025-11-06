import fs from 'fs'
import path from 'path'

const dataDir = path.join(process.cwd(), 'data')

export function readDataFile<T>(filename: string): T {
  const filePath = path.join(dataDir, filename)
  if (!fs.existsSync(filePath)) {
    return {} as T
  }
  const fileContent = fs.readFileSync(filePath, 'utf-8')
  return JSON.parse(fileContent) as T
}

export function writeDataFile<T>(filename: string, data: T): void {
  const filePath = path.join(dataDir, filename)
  // Ensure data directory exists
  if (!fs.existsSync(dataDir)) {
    fs.mkdirSync(dataDir, { recursive: true })
  }
  fs.writeFileSync(filePath, JSON.stringify(data, null, 2), 'utf-8')
}

