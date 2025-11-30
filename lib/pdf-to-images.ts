import * as pdfjsLib from 'pdfjs-dist'
import { readFileSync } from 'fs'
import path from 'path'
import { writeFile } from 'fs/promises'

// Try to import canvas, but handle if it's not available
let createCanvas: any
try {
  const canvasModule = require('canvas')
  createCanvas = canvasModule.createCanvas
} catch (error) {
  console.warn('Canvas module not available, PDF to image conversion will be limited')
  createCanvas = null
}

// Set up the worker for pdfjs-dist
if (typeof window === 'undefined') {
  pdfjsLib.GlobalWorkerOptions.workerSrc = `//cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjsLib.version}/pdf.worker.min.js`
}

export interface PDFImageResult {
  pageNumber: number
  imagePath: string
  imageUrl: string
  width: number
  height: number
}

export async function convertPDFToImages(
  pdfPath: string,
  outputDir: string,
  baseFileName: string
): Promise<PDFImageResult[]> {
  try {
    if (!createCanvas) {
      throw new Error('Canvas module not available. PDF to image conversion requires the canvas package.')
    }

    const data = readFileSync(pdfPath)
    const loadingTask = pdfjsLib.getDocument({ data })
    const pdf = await loadingTask.promise
    const numPages = pdf.numPages

    const results: PDFImageResult[] = []

    for (let pageNum = 1; pageNum <= numPages; pageNum++) {
      const page = await pdf.getPage(pageNum)
      const viewport = page.getViewport({ scale: 2.0 }) // Higher scale for better quality

      // Create canvas
      const canvas = createCanvas(viewport.width, viewport.height)
      const context = canvas.getContext('2d')

      // Render PDF page to canvas
      const renderContext = {
        canvasContext: context,
        viewport: viewport,
      }

      await page.render({
        ...renderContext,
        canvas: canvas as any,
      }).promise

      // Convert canvas to buffer
      const imageBuffer = canvas.toBuffer('image/png')

      // Save image
      const imageFileName = `${baseFileName}-page-${pageNum}.png`
      const imagePath = path.join(outputDir, imageFileName)
      await writeFile(imagePath, imageBuffer)

      results.push({
        pageNumber: pageNum,
        imagePath,
        imageUrl: `/uploads/newsletters/images/${imageFileName}`,
        width: viewport.width,
        height: viewport.height,
      })
    }

    return results
  } catch (error) {
    console.error('Error converting PDF to images:', error)
    throw new Error('Failed to convert PDF to images: ' + (error instanceof Error ? error.message : String(error)))
  }
}

