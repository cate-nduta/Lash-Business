'use client'

import { useEffect, useState } from 'react'
import { useParams } from 'next/navigation'

interface ConsultationDetails {
  consultationId: string
  businessName: string
  contactName: string
  preferredDate: string
  preferredTime: string
  meetingType: 'online' | 'physical'
  meetLink?: string
}

export default function TimeGatedMeetPage() {
  const params = useParams()
  const consultationId = params?.consultationId as string
  const [loading, setLoading] = useState(true)
  const [consultation, setConsultation] = useState<ConsultationDetails | null>(null)
  const [canJoin, setCanJoin] = useState(false)
  const [message, setMessage] = useState('')
  const [timeRemaining, setTimeRemaining] = useState<string>('')

  useEffect(() => {
    if (!consultationId) {
      setMessage('Invalid meeting link. Please check your email for the correct link.')
      setLoading(false)
      return
    }

    const checkAccess = async () => {
      try {
        const response = await fetch(`/api/labs/consultation/meet-access?consultationId=${encodeURIComponent(consultationId)}`)
        const data = await response.json()

        if (!response.ok) {
          setMessage(data.error || 'Unable to verify meeting access')
          setLoading(false)
          return
        }

        setConsultation(data.consultation)
        setCanJoin(data.canJoin)
        setMessage(data.message || '')
        setTimeRemaining(data.timeRemaining || '')

        // If access is granted, open Meet in new window with security features
        if (data.canJoin && data.consultation.meetLink) {
          // Show security warning first
          setTimeout(() => {
            // Open in new window to reduce URL visibility
            // Use window.open with specific features to minimize URL bar visibility
            const meetWindow = window.open(
              data.consultation.meetLink,
              '_blank',
              'noopener,noreferrer,width=1280,height=720,menubar=no,toolbar=no,location=no,status=no'
            )
            
            if (meetWindow) {
              // Focus the new window
              meetWindow.focus()
              // Show warning on current page
              setMessage('Meeting opened in new window. Please do not share the meeting link.')
            } else {
              // If popup blocked, redirect normally
              window.location.href = data.consultation.meetLink
            }
          }, 3000) // 3 second delay to show security message
        }
      } catch (error) {
        console.error('Error checking meeting access:', error)
        setMessage('Unable to verify meeting access. Please try again or contact support.')
      } finally {
        setLoading(false)
      }
    }

    checkAccess()

    // Update countdown every second if there's time remaining
    const interval = setInterval(() => {
      if (consultation && !canJoin) {
        checkAccess()
      }
    }, 1000)

    return () => clearInterval(interval)
  }, [consultationId, canJoin, consultation])

  const formatDate = (dateStr: string) => {
    try {
      const date = new Date(dateStr)
      return date.toLocaleDateString('en-US', {
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric',
      })
    } catch {
      return dateStr
    }
  }

  const formatTime = (timeStr: string) => {
    const timeMap: Record<string, string> = {
      morning: '9:00 AM - 12:00 PM',
      afternoon: '12:00 PM - 4:00 PM',
      evening: '4:00 PM - 7:00 PM',
    }
    return timeMap[timeStr] || timeStr
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-baby-pink-light flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-brown border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-brown text-lg">Verifying meeting access...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-baby-pink-light flex items-center justify-center p-4">
      <div className="max-w-2xl w-full bg-white rounded-2xl shadow-soft border-2 border-brown-light p-8 md:p-12">
        {canJoin ? (
          <div className="text-center">
            <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-6">
              <svg className="w-12 h-12 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
            </div>
            <h1 className="text-3xl font-display text-brown mb-4">Meeting Access Granted!</h1>
            <p className="text-gray-700 text-lg mb-4">
              Opening your Google Meet session in a new window...
            </p>
            
            <div className="bg-yellow-50 border-2 border-yellow-400 rounded-lg p-4 mb-6 max-w-md mx-auto">
              <p className="text-yellow-800 text-sm font-semibold mb-2">🔒 Security Reminder:</p>
              <p className="text-yellow-700 text-xs leading-relaxed">
                • This meeting link is unique to your consultation<br/>
                • Do NOT copy or share the meeting URL<br/>
                • The link only works during your scheduled time<br/>
                • If popup was blocked, click the button below
              </p>
            </div>

            {consultation?.meetLink && (
              <div className="space-y-3">
                <button
                  onClick={() => {
                    const meetWindow = window.open(
                      consultation.meetLink,
                      '_blank',
                      'noopener,noreferrer,width=1280,height=720,menubar=no,toolbar=no,location=no,status=no'
                    )
                    if (meetWindow) {
                      meetWindow.focus()
                    }
                  }}
                  className="inline-block bg-brown-dark text-white px-8 py-4 rounded-lg font-semibold text-lg hover:bg-brown transition-colors"
                >
                  Open Meeting in New Window →
                </button>
                <p className="text-gray-600 text-sm">
                  (Opens in a new window to protect meeting security)
                </p>
              </div>
            )}
          </div>
        ) : (
          <div className="text-center">
            <div className="w-20 h-20 bg-yellow-100 rounded-full flex items-center justify-center mx-auto mb-6">
              <svg className="w-12 h-12 text-yellow-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <h1 className="text-3xl font-display text-brown mb-4">Meeting Not Available Yet</h1>
            <p className="text-gray-700 text-lg mb-6">
              {message || 'Your meeting is scheduled for a specific time slot.'}
            </p>
            
            {consultation && (
              <div className="bg-brown-light/20 rounded-lg p-6 mb-6">
                <h2 className="text-xl font-semibold text-brown mb-4">Your Scheduled Consultation</h2>
                <div className="text-left space-y-3">
                  <div>
                    <span className="font-semibold text-gray-700">Business:</span>{' '}
                    <span className="text-gray-600">{consultation.businessName}</span>
                  </div>
                  <div>
                    <span className="font-semibold text-gray-700">Contact:</span>{' '}
                    <span className="text-gray-600">{consultation.contactName}</span>
                  </div>
                  <div>
                    <span className="font-semibold text-gray-700">Date:</span>{' '}
                    <span className="text-gray-600">{formatDate(consultation.preferredDate)}</span>
                  </div>
                  <div>
                    <span className="font-semibold text-gray-700">Time:</span>{' '}
                    <span className="text-gray-600">{formatTime(consultation.preferredTime)}</span>
                  </div>
                </div>
              </div>
            )}

            {timeRemaining && (
              <div className="bg-blue-50 border-2 border-blue-400 rounded-lg p-4 mb-6">
                <p className="text-blue-800 font-semibold">
                  {timeRemaining}
                </p>
              </div>
            )}

            <div className="bg-gray-50 rounded-lg p-4">
              <p className="text-sm text-gray-600">
                <strong>Note:</strong> This meeting link is only active during your scheduled time slot. 
                This ensures privacy and prevents unauthorized access to other consultations.
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

