'use client'

import { useEffect, useRef } from 'react'
import { type Course } from '@/types/course'

interface CourseCertificateProps {
  course: Course
  studentName: string
  completionDate: string
  certificateId: string
}

export default function CourseCertificate({
  course,
  studentName,
  completionDate,
  certificateId,
}: CourseCertificateProps) {
  const certificateRef = useRef<HTMLDivElement>(null)

  const handlePrint = () => {
    if (!certificateRef.current) return
    
    const printWindow = window.open('', '_blank')
    if (!printWindow) return

    const printContent = certificateRef.current.innerHTML
    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>Certificate of Completion - ${course.title}</title>
          <style>
            @page {
              size: A4 landscape;
              margin: 0;
            }
            * {
              margin: 0;
              padding: 0;
              box-sizing: border-box;
            }
            body {
              font-family: 'Georgia', 'Times New Roman', serif;
              background: linear-gradient(135deg, #f5f7fa 0%, #c3cfe2 100%);
              display: flex;
              justify-content: center;
              align-items: center;
              min-height: 100vh;
              padding: 20px;
            }
            .certificate-container {
              width: 11in;
              height: 8.5in;
              background: #ffffff;
              border: 8px solid #733D26;
              box-shadow: 0 10px 40px rgba(0,0,0,0.2);
              position: relative;
              padding: 60px;
              display: flex;
              flex-direction: column;
              justify-content: center;
              align-items: center;
            }
            .certificate-border {
              position: absolute;
              top: 20px;
              left: 20px;
              right: 20px;
              bottom: 20px;
              border: 2px solid #d4af37;
              pointer-events: none;
            }
            .certificate-header {
              text-align: center;
              margin-bottom: 40px;
            }
            .certificate-logo {
              font-size: 48px;
              font-weight: bold;
              color: #733D26;
              margin-bottom: 10px;
              letter-spacing: 2px;
            }
            .certificate-title {
              font-size: 42px;
              font-weight: bold;
              color: #2c3e50;
              margin-bottom: 60px;
              text-transform: uppercase;
              letter-spacing: 4px;
            }
            .certificate-body {
              text-align: center;
              margin-bottom: 50px;
            }
            .certificate-text {
              font-size: 20px;
              color: #34495e;
              line-height: 1.8;
              margin-bottom: 30px;
            }
            .student-name {
              font-size: 36px;
              font-weight: bold;
              color: #733D26;
              margin: 30px 0;
              text-decoration: underline;
              text-decoration-color: #d4af37;
              text-underline-offset: 10px;
            }
            .course-name {
              font-size: 24px;
              font-style: italic;
              color: #555;
              margin: 20px 0;
            }
            .certificate-footer {
              margin-top: 60px;
              display: flex;
              justify-content: space-between;
              width: 100%;
              padding: 0 40px;
            }
            .signature-section {
              text-align: center;
              flex: 1;
            }
            .signature-line {
              border-top: 2px solid #333;
              width: 200px;
              margin: 60px auto 10px;
            }
            .signature-name {
              font-size: 18px;
              font-weight: bold;
              color: #733D26;
              margin-top: 5px;
            }
            .signature-title {
              font-size: 14px;
              color: #666;
              margin-top: 5px;
            }
            .certificate-id {
              position: absolute;
              bottom: 20px;
              right: 30px;
              font-size: 10px;
              color: #999;
            }
            .date {
              font-size: 16px;
              color: #555;
              margin-top: 10px;
            }
            @media print {
              body {
                background: white;
                padding: 0;
              }
              .certificate-container {
                width: 100%;
                height: 100vh;
                border: 8px solid #733D26;
                box-shadow: none;
              }
            }
          </style>
        </head>
        <body>
          ${printContent}
        </body>
      </html>
    `)
    printWindow.document.close()
    printWindow.focus()
    setTimeout(() => {
      printWindow.print()
    }, 250)
  }

  const handleDownload = () => {
    if (!certificateRef.current) return
    
    // Create a canvas to render the certificate
    const canvas = document.createElement('canvas')
    canvas.width = 3300 // 11in at 300dpi
    canvas.height = 2550 // 8.5in at 300dpi
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    // For now, trigger print which allows saving as PDF
    handlePrint()
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-100 to-gray-200 py-12 px-4">
      <div className="max-w-6xl mx-auto">
        {/* Certificate Display */}
        <div 
          ref={certificateRef}
          className="bg-white border-8 border-brown-dark shadow-2xl relative"
          style={{
            width: '100%',
            maxWidth: '11in',
            aspectRatio: '11/8.5',
            margin: '0 auto',
            padding: '60px',
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'center',
            alignItems: 'center',
          }}
        >
          {/* Decorative Border */}
          <div 
            className="absolute border-2 border-yellow-600"
            style={{
              top: '20px',
              left: '20px',
              right: '20px',
              bottom: '20px',
              pointerEvents: 'none',
            }}
          />

          {/* Header */}
          <div className="text-center mb-10">
            <div className="text-5xl font-bold text-brown-dark mb-2 tracking-wider">
              LashDiary Labs
            </div>
            <div className="text-4xl font-bold text-gray-800 mt-8 mb-12 uppercase tracking-widest">
              Certificate of Completion
            </div>
          </div>

          {/* Body */}
          <div className="text-center mb-12">
            <p className="text-xl text-gray-700 leading-relaxed mb-6">
              This is to certify that
            </p>
            <div className="text-4xl font-bold text-brown-dark my-6 underline decoration-yellow-600 decoration-2 underline-offset-8">
              {studentName}
            </div>
            <p className="text-xl text-gray-700 leading-relaxed mb-4">
              has successfully completed the course
            </p>
            <div className="text-2xl italic text-gray-600 my-4">
              {course.title}
            </div>
            <p className="text-xl text-gray-700 leading-relaxed mt-6">
              and is hereby awarded this Certificate of Completion
            </p>
          </div>

          {/* Footer with Signatures */}
          <div className="mt-16 w-full flex justify-between px-10">
            <div className="text-center flex-1">
              <div 
                className="border-t-2 border-gray-800 mx-auto mb-2"
                style={{ width: '200px', marginTop: '60px' }}
              />
              <div className="text-lg font-bold text-brown-dark mt-2">
                Catherine Kuria
              </div>
              <div className="text-sm text-gray-600 mt-1">
                Founder, LashDiary Labs
              </div>
              {/* Signature Image */}
              <div className="mt-4" style={{ height: '80px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <img 
                  src="/signature.png" 
                  alt="Catherine Kuria Signature" 
                  className="h-16 object-contain opacity-90"
                  style={{ maxWidth: '200px' }}
                  onError={(e) => {
                    // If signature image not found, just show the name (signature will be added later)
                    console.log('Signature image not found - will display name only')
                  }}
                />
              </div>
            </div>
            <div className="text-center flex-1">
              <div className="text-base text-gray-600 mt-16">
                Date of Completion
              </div>
              <div className="text-lg font-semibold text-gray-800 mt-2">
                {new Date(completionDate).toLocaleDateString('en-US', { 
                  year: 'numeric', 
                  month: 'long', 
                  day: 'numeric' 
                })}
              </div>
            </div>
          </div>

          {/* Certificate ID */}
          <div 
            className="absolute text-xs text-gray-400"
            style={{ bottom: '20px', right: '30px' }}
          >
            Certificate ID: {certificateId}
          </div>
        </div>

        {/* Action Buttons */}
        <div className="mt-8 text-center space-x-4">
          <button
            onClick={handlePrint}
            className="bg-brown-dark text-white px-8 py-3 rounded-lg font-semibold hover:bg-brown transition-colors shadow-lg"
          >
            🖨️ Print Certificate
          </button>
          <button
            onClick={handleDownload}
            className="bg-purple-600 text-white px-8 py-3 rounded-lg font-semibold hover:bg-purple-700 transition-colors shadow-lg"
          >
            📥 Download PDF
          </button>
        </div>
      </div>
    </div>
  )
}

