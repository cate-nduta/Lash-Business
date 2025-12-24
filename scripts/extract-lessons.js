/**
 * Script to extract lessons from module markdown files
 * and create individual lesson files in the course-content directory
 * 
 * Usage: node scripts/extract-lessons.js [module-number]
 * Example: node scripts/extract-lessons.js 1
 */

const fs = require('fs')
const path = require('path')

// Lesson extraction patterns for each module
const lessonPatterns = {
  '1': {
    pattern: /## Lesson 1\.(\d+):\s*(.+?)(?=## Lesson 1\.\d+:|## Module 1 Checkpoint|$)/gs,
    titlePattern: /## Lesson 1\.(\d+):\s*(.+?)$/m
  },
  '2': {
    pattern: /## Lesson 1\.(\d+):\s*(.+?)(?=## Lesson 1\.\d+:|## Module 2 Checkpoint|$)/gs,
    titlePattern: /## Lesson 1\.(\d+):\s*(.+?)$/m
  },
  // Add patterns for other modules as needed
}

function extractLessons(moduleNumber) {
  const moduleFile = path.join(__dirname, '..', `MODULE_0${moduleNumber}_*.md`)
  const moduleFiles = fs.readdirSync(path.join(__dirname, '..')).filter(f => 
    f.startsWith(`MODULE_0${moduleNumber}_`) && f.endsWith('.md')
  )
  
  if (moduleFiles.length === 0) {
    console.error(`No module file found for module ${moduleNumber}`)
    return
  }
  
  const moduleFilePath = path.join(__dirname, '..', moduleFiles[0])
  const content = fs.readFileSync(moduleFilePath, 'utf-8')
  
  // Create output directory
  const outputDir = path.join(__dirname, '..', 'course-content', `module-${moduleNumber}`)
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true })
  }
  
  // Extract lessons based on pattern
  const pattern = new RegExp(`## Lesson ${moduleNumber === '1' ? '1' : moduleNumber}\\.(\\d+):\\s*(.+?)(?=## Lesson ${moduleNumber === '1' ? '1' : moduleNumber}\\.\\d+:|## Module ${moduleNumber} Checkpoint|## What's Next|$)`, 'gs')
  const matches = [...content.matchAll(pattern)]
  
  console.log(`Found ${matches.length} lessons in module ${moduleNumber}`)
  
  matches.forEach((match, index) => {
    const lessonNumber = match[1]
    const lessonContent = match[0]
    
    // Extract title
    const titleMatch = lessonContent.match(/## Lesson \d+\.\d+:\s*(.+?)$/m)
    const title = titleMatch ? titleMatch[1].trim() : `Lesson ${lessonNumber}`
    
    // Clean up the content
    let cleanContent = lessonContent
      .replace(/^## Lesson \d+\.\d+:\s*/m, `# ${title}\n\n`)
      .trim()
    
    // Add metadata
    const metadata = `**Estimated Time**: See course structure\n\n**Module**: ${moduleNumber}\n\n**Lesson**: ${lessonNumber}\n\n---\n\n`
    cleanContent = metadata + cleanContent
    
    // Write lesson file
    const lessonFile = path.join(outputDir, `lesson-${lessonNumber}.md`)
    fs.writeFileSync(lessonFile, cleanContent, 'utf-8')
    console.log(`Created: ${lessonFile}`)
  })
  
  console.log(`\nExtracted ${matches.length} lessons to ${outputDir}`)
}

// Get module number from command line
const moduleNumber = process.argv[2]

if (!moduleNumber) {
  console.error('Usage: node scripts/extract-lessons.js [module-number]')
  console.error('Example: node scripts/extract-lessons.js 1')
  process.exit(1)
}

extractLessons(moduleNumber)

