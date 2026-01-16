'use client'

import { useState, useEffect } from 'react'
import { useParams, useRouter } from 'next/navigation'

export default function ShowcaseMeetPage() {
  const params = useParams()
  const router = useRouter()
  const bookingId = params?.bookingId as string

  const [loading, setLoading] = useState(true)
  const [canJoin, setCanJoin] = useState(false)
  const [message, setMessage] = useState('')
  const [timeRemaining, setTimeRemaining] = useState('')
  const [meetingHasPassed, setMeetingHasPassed] = useState(false)
  const [booking, setBooking] = useState<{
    bookingId: string
    clientName: string
    appointmentDate: string
    appointmentTime: string
    meetingType: string
    meetLink?: string | null
  } | null>(null)

  useEffect(() => {
    if (!bookingId) {
      setMessage('Invalid meeting link. Please check your email for the correct link.')
      setLoading(false)
      return
    }

    const checkAccess = async () => {
      try {
        const response = await fetch(`/api/labs/showcase/meet-access?bookingId=${bookingId}`)
        const data = await response.json()

        if (!response.ok) {
          setMessage(data.error || 'Failed to verify meeting access')
          setLoading(false)
          return
        }

        setBooking(data.booking)
        setCanJoin(data.canJoin)
        setMessage(data.message)
        setTimeRemaining(data.timeRemaining || '')
        setMeetingHasPassed(data.meetingHasPassed || false)

        if (data.canJoin && data.booking.meetLink) {
          // Store meetLink in a const to ensure type narrowing works inside setTimeout
          const meetLink = data.booking.meetLink
          
          // Auto-redirect after 2 seconds
          setTimeout(() => {
            if (meetLink) {
              // Open in new window
              window.open(
                meetLink,
                '_blank',
                'noopener,noreferrer'
              )
              setMessage('Meeting opened in new window. Please do not share the meeting link.')
            } else {
              window.location.href = meetLink
            }
          }, 2000)
        }
      } catch (error) {
        console.error('Error checking meeting access:', error)
        setMessage('Failed to verify meeting access. Please try again or contact us.')
      } finally {
        setLoading(false)
      }
    }

    checkAccess()
  }, [bookingId])

  if (loading) {
    return (
      <div className="min-h-screen bg-[#FDF9F4] flex items-center justify-center">
        <div className="text-center">
          <div className="text-[#7C4B31] text-xl mb-4">Loading...</div>
          <div className="text-gray-600">Verifying your meeting access...</div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-[#FDF9F4] py-12 px-4">
      <div className="max-w-2xl mx-auto">
        <div className="bg-white rounded-xl shadow-lg p-8">
          {canJoin && booking?.meetLink ? (
            <>
              <h1 className="text-3xl font-bold text-[#7C4B31] mb-4">Joining Your Showcase Meeting</h1>
              <div className="bg-green-50 border-2 border-green-400 rounded-lg p-6 mb-6">
                <p className="text-green-800 font-semibold mb-2">✓ Access Granted</p>
                <p className="text-green-700">{message}</p>
              </div>
              <div className="bg-blue-50 border-2 border-blue-300 rounded-lg p-6 mb-6">
                <p className="text-blue-800 font-semibold mb-2">
                  Opening your meeting in a new window...
                </p>
                <p className="text-blue-700 text-sm">
                  If the meeting doesn't open automatically, click the button below.
                </p>
              </div>
              <div className="space-y-4">
                <button
                  onClick={() => {
                    if (booking.meetLink) {
                      window.open(
                        booking.meetLink,
                        '_blank',
                        'noopener,noreferrer'
                      )
                    }
                  }}
                  className="w-full bg-[#7C4B31] text-white px-6 py-3 rounded-lg font-semibold hover:bg-[#6B3E26] transition-colors"
                >
                  Open Meeting
                </button>
                <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                  <p className="text-yellow-800 text-sm">
                    <strong>Security Notice:</strong>
                    <br />
                    • This meeting link is unique to your showcase meeting<br/>
                    • Do not share this link with anyone<br/>
                    • The link will only work during your scheduled time slot
                  </p>
                </div>
              </div>
            </>
          ) : (
            <>
              <h1 className="text-3xl font-bold text-[#7C4B31] mb-4">Meeting Access</h1>
              <div className={`border-2 rounded-lg p-6 mb-6 ${
                meetingHasPassed 
                  ? 'bg-red-50 border-red-400' 
                  : 'bg-yellow-50 border-yellow-400'
              }`}>
                <p className={`font-semibold mb-2 ${
                  meetingHasPassed ? 'text-red-800' : 'text-yellow-800'
                }`}>
                  {meetingHasPassed ? '⚠️ Meeting Time Has Passed' : '⏰ Meeting Not Available Yet'}
                </p>
                <p className={meetingHasPassed ? 'text-red-700' : 'text-yellow-700'}>
                  {message}
                </p>
                {timeRemaining && (
                  <p className="text-yellow-700 mt-2">
                    {timeRemaining}
                  </p>
                )}
              </div>
              {booking && (
                <div className="bg-gray-50 rounded-lg p-6 mb-6">
                  <h2 className="text-lg font-semibold text-[#7C4B31] mb-3">Your Meeting Details</h2>
                  <div className="space-y-2 text-gray-700">
                    <p><strong>Client:</strong> {booking.clientName}</p>
                    <p><strong>Date:</strong> {new Date(booking.appointmentDate).toLocaleDateString('en-US', {
                      weekday: 'long',
                      year: 'numeric',
                      month: 'long',
                      day: 'numeric',
                    })}</p>
                    <p><strong>Time:</strong> {booking.appointmentTime}</p>
                  </div>
                </div>
              )}
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <p className="text-blue-800 text-sm">
                  <strong>Note:</strong> This meeting link is only active during your scheduled time slot. 
                  {!meetingHasPassed && ' Please wait until your scheduled time to join.'}
                  {meetingHasPassed && ' If you need to reschedule, please contact us at hello@lashdiary.co.ke'}
                </p>
              </div>
              <button
                onClick={() => router.push('/')}
                className="w-full mt-6 bg-gray-200 text-gray-800 px-6 py-3 rounded-lg font-semibold hover:bg-gray-300 transition-colors"
              >
                Return Home
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  )
}









