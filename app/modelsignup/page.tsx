'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'

type ModelQuestionType = 'single' | 'multiple' | 'text'

interface ModelApplicationQuestion {
  id: string
  label: string
  type: ModelQuestionType
  required: boolean
  options: string[]
}

const DEFAULT_MODEL_QUESTIONS: ModelApplicationQuestion[] = [
  { id: 'availability', label: 'Availability (Afternoon)', type: 'multiple', required: true, options: ['Monday (afternoon)', 'Tuesday (afternoon)', 'Wednesday (afternoon)', 'Thursday (afternoon)', 'Friday (afternoon)'] },
  { id: 'hasLashExtensions', label: 'Have you had lash extensions before?', type: 'single', required: true, options: ['Yes', 'No'] },
  { id: 'hasAppointmentBefore', label: 'Have you been a client at LashDiary before?', type: 'single', required: true, options: ['Yes', 'No'] },
  { id: 'allergies', label: 'Do you have any known allergies, sensitivities or eye conditions?', type: 'text', required: false, options: [] },
  { id: 'comfortableLongSessions', label: 'Are you comfortable with long sessions? (3-4 hours)', type: 'single', required: true, options: ['Yes', 'No'] },
]

export default function ModelSignupPage() {
  const [modelSignupEnabled, setModelSignupEnabled] = useState<boolean | null>(null)
  const [modelQuestions, setModelQuestions] = useState<ModelApplicationQuestion[]>(DEFAULT_MODEL_QUESTIONS)
  const [customAnswers, setCustomAnswers] = useState<Record<string, string | string[]>>({})
  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    email: '',
    phone: '',
    instagram: '',
    availability: '',
    hasLashExtensions: '',
    hasAppointmentBefore: '',
    allergies: '',
    comfortableLongSessions: '',
  })
  const [consent, setConsent] = useState({
    freeModelSet: false,
    longSessions: false,
    photosVideos: false,
    noInfills: false,
    onTime: false,
    styleChoice: false,
  })
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [showSuccessModal, setShowSuccessModal] = useState(false)

  useEffect(() => {
    const checkModelSignup = async () => {
      try {
        const [homepageResponse, questionsResponse] = await Promise.all([
          fetch('/api/homepage'),
          fetch('/api/model-application-settings'),
        ])
        if (homepageResponse.ok) {
          const data = await homepageResponse.json()
          setModelSignupEnabled(data.modelSignup?.enabled || false)
        } else {
          setModelSignupEnabled(false)
        }
        if (questionsResponse.ok) {
          const settings = await questionsResponse.json()
          if (Array.isArray(settings.questions) && settings.questions.length > 0) {
            setModelQuestions(settings.questions)
          }
        }
      } catch (error) {
        console.error('Error checking model signup status:', error)
        setModelSignupEnabled(false)
      }
    }
    checkModelSignup()
  }, [])

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target
    setFormData({ ...formData, [name]: value })
  }

  const handleConsentChange = (field: keyof typeof consent) => {
    setConsent({ ...consent, [field]: !consent[field] })
  }

  const handleQuestionAnswer = (question: ModelApplicationQuestion, optionOrValue: string, checked?: boolean) => {
    setCustomAnswers((prev) => {
      if (question.type === 'multiple') {
        const current = Array.isArray(prev[question.id]) ? (prev[question.id] as string[]) : []
        const next = checked
          ? Array.from(new Set([...current, optionOrValue]))
          : current.filter((item) => item !== optionOrValue)
        return { ...prev, [question.id]: next }
      }

      return { ...prev, [question.id]: optionOrValue }
    })
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')

    // Validate required fields
    if (!formData.firstName || !formData.email || !formData.phone) {
      setError('Please fill in all required fields')
      return
    }

    const missingQuestion = modelQuestions.find((question) => {
      if (!question.required) return false
      const answer = customAnswers[question.id]
      if (Array.isArray(answer)) return answer.length === 0
      return typeof answer !== 'string' || answer.trim().length === 0
    })
    if (missingQuestion) {
      setError(`Please answer: ${missingQuestion.label}`)
      return
    }

    // Validate all consent checkboxes
    const allConsented = Object.values(consent).every(value => value === true)
    if (!allConsented) {
      setError('Please check all consent boxes to proceed')
      return
    }

    setLoading(true)

    try {
      const answerString = (id: string) => {
        const answer = customAnswers[id]
        return Array.isArray(answer) ? answer.join(', ') : answer || ''
      }
      
      const formDataToSend = new FormData()
      formDataToSend.append('firstName', formData.firstName)
      formDataToSend.append('lastName', formData.lastName)
      formDataToSend.append('email', formData.email)
      formDataToSend.append('phone', formData.phone || '')
      formDataToSend.append('instagram', formData.instagram || '')
      formDataToSend.append('availability', answerString('availability'))
      formDataToSend.append('hasLashExtensions', answerString('hasLashExtensions'))
      formDataToSend.append('hasAppointmentBefore', answerString('hasAppointmentBefore'))
      formDataToSend.append('allergies', answerString('allergies'))
      formDataToSend.append('comfortableLongSessions', answerString('comfortableLongSessions'))
      formDataToSend.append('customAnswers', JSON.stringify(customAnswers))
      formDataToSend.append('modelQuestions', JSON.stringify(modelQuestions))

      const response = await fetch('/api/model-application', {
        method: 'POST',
        body: formDataToSend,
      })

      const data = await response.json()

      if (!response.ok) {
        setError(data.error || 'Failed to submit application')
        setLoading(false)
        return
      }

      // Success - stop loading and show success modal
      setLoading(false)
      setShowSuccessModal(true)
    } catch (err: any) {
      setError('An error occurred. Please try again.')
      setLoading(false)
    }
  }

  if (modelSignupEnabled === null) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-pink-50 via-white to-amber-50 flex items-center justify-center px-4 py-12">
        <div className="text-brown">Loading...</div>
      </div>
    )
  }

  if (!modelSignupEnabled) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-pink-50 via-white to-amber-50 flex items-center justify-center px-4 py-12">
        <div className="max-w-md w-full text-center">
          <div className="bg-white/80 backdrop-blur-sm rounded-2xl shadow-xl border border-brown/10 p-8">
            <h1 className="text-3xl font-display text-brown-dark mb-4">Model Applications Currently Closed</h1>
            <p className="text-brown/80 mb-6">
              We are currently not accepting lash extension model applications at this time. 
              Please check back later for future opportunities.
            </p>
            <Link
              href="/"
              className="inline-block bg-brown-dark hover:bg-brown text-white font-semibold py-3 px-6 rounded-lg transition-all duration-300 transform hover:scale-[1.02] shadow-lg hover:shadow-xl"
            >
              Back to Home
            </Link>
          </div>
        </div>
      </div>
    )
  }


  return (
    <>
      {/* Success Modal */}
      {showSuccessModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[9999] p-4" onClick={() => setShowSuccessModal(false)}>
          <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full p-6" onClick={(e) => e.stopPropagation()}>
            <div className="text-center">
              <h2 className="text-2xl font-display text-brown-dark mb-4">Application Submitted!</h2>
              <p className="text-brown/80 mb-4">
                Your information has been sent successfully. We've received your application and will review it carefully.
              </p>
              <p className="text-brown/80 mb-4">
                <strong>What happens next?</strong> When a slot becomes available that matches your availability, you will receive an email notification, WhatsApp text, or a call to confirm your booking with the location and pre appointment guidelines.
              </p>
              <p className="text-brown/80 mb-4 text-sm">
                Please note that submitting an application does not guarantee an appointment. Models will be selected based on availability and how many spots we have open for each model round.
              </p>
              <button
                onClick={() => {
                  setShowSuccessModal(false)
                  // Reset form
                  setFormData({
                    firstName: '',
                    lastName: '',
                    email: '',
                    phone: '',
                    instagram: '',
                    availability: '',
                    hasLashExtensions: '',
                    hasAppointmentBefore: '',
                    allergies: '',
                    comfortableLongSessions: '',
                  })
                  setCustomAnswers({})
                  setConsent({
                    freeModelSet: false,
                    longSessions: false,
                    photosVideos: false,
                    noInfills: false,
                    onTime: false,
                    styleChoice: false,
                  })
                }}
                className="w-full bg-brown-dark hover:bg-brown text-white font-semibold py-3 px-6 rounded-lg transition-all duration-300 transform hover:scale-[1.02] shadow-lg hover:shadow-xl"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

    <div className="min-h-screen bg-gradient-to-br from-pink-50 via-white to-amber-50 py-12 px-4">
      <div className="max-w-3xl mx-auto">
        {/* Hero Section */}
        <div className="text-center mb-12">
          <h1 className="text-4xl md:text-5xl font-display text-brown-dark mb-4">
            LashDiary Model Casting — Free Full Sets
          </h1>
          <p className="text-lg text-brown/70 max-w-2xl mx-auto">
            A limited number of spots are open for models who want to try new lash styles in exchange for content.
          </p>
        </div>

        {/* Description */}
        <div className="bg-white/80 backdrop-blur-sm rounded-2xl shadow-xl border border-brown/10 p-8 mb-8">
          <p className="text-brown/80 leading-relaxed mb-4">
            I'm currently building my lash portfolio and practicing new lash mapping techniques as part of my ongoing training. 
            I'm offering a limited number of free lash sets to selected models in exchange for photos and videos of the final look.
          </p>
          <p className="text-brown/80 leading-relaxed mb-4">
            Because these sets involve practice and filming, the appointment may take longer than a regular session.
          </p>
          <p className="text-brown/80 leading-relaxed">
            Submitting this form does not guarantee a booking. Models will be selected based on availability and how many spots I have open for each model round.
          </p>
        </div>

        {/* Application Form */}
        <div className="bg-white/80 backdrop-blur-sm rounded-2xl shadow-xl border border-brown/10 p-8">
          <form onSubmit={handleSubmit} className="space-y-6">
            {error && (
              <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm">
                {error}
              </div>
            )}

            {/* Name */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label htmlFor="firstName" className="block text-sm font-medium text-brown-dark mb-2">
                  First Name <span className="text-red-500">*</span>
                </label>
                <input
                  id="firstName"
                  name="firstName"
                  type="text"
                  value={formData.firstName}
                  onChange={handleChange}
                  required
                  className="w-full px-4 py-3 border border-brown/20 rounded-lg focus:ring-2 focus:ring-brown/30 focus:border-brown transition-all bg-white/50"
                />
              </div>
              <div>
                <label htmlFor="lastName" className="block text-sm font-medium text-brown-dark mb-2">
                  Last Name <span className="text-gray-400 text-xs">(optional)</span>
                </label>
                <input
                  id="lastName"
                  name="lastName"
                  type="text"
                  value={formData.lastName}
                  onChange={handleChange}
                  className="w-full px-4 py-3 border border-brown/20 rounded-lg focus:ring-2 focus:ring-brown/30 focus:border-brown transition-all bg-white/50"
                />
              </div>
            </div>

            {/* Email */}
            <div>
              <label htmlFor="email" className="block text-sm font-medium text-brown-dark mb-2">
                Email Address <span className="text-red-500">*</span>
              </label>
              <input
                id="email"
                name="email"
                type="email"
                value={formData.email}
                onChange={handleChange}
                required
                className="w-full px-4 py-3 border border-brown/20 rounded-lg focus:ring-2 focus:ring-brown/30 focus:border-brown transition-all bg-white/50"
                placeholder="example@example.com"
              />
            </div>

            {/* Phone */}
            <div>
              <label htmlFor="phone" className="block text-sm font-medium text-brown-dark mb-2">
                Phone Number <span className="text-red-500">*</span>
              </label>
              <input
                id="phone"
                name="phone"
                type="tel"
                value={formData.phone}
                onChange={handleChange}
                required
                className="w-full px-4 py-3 border border-brown/20 rounded-lg focus:ring-2 focus:ring-brown/30 focus:border-brown transition-all bg-white/50"
                placeholder="+254 700 000 000"
              />
              <p className="text-xs text-brown/60 mt-1">
                Please provide a WhatsApp number if possible, as we may contact you via WhatsApp when a slot becomes available.
              </p>
            </div>

            {/* Instagram */}
            <div>
              <label htmlFor="instagram" className="block text-sm font-medium text-brown-dark mb-2">
                Instagram Handle <span className="text-gray-400 text-xs">(optional)</span>
              </label>
              <input
                id="instagram"
                name="instagram"
                type="text"
                value={formData.instagram}
                onChange={handleChange}
                className="w-full px-4 py-3 border border-brown/20 rounded-lg focus:ring-2 focus:ring-brown/30 focus:border-brown transition-all bg-white/50"
                placeholder="@example1234"
              />
            </div>

            {/* Model Application Questions */}
            <div className="space-y-4 border-t border-brown/20 pt-6">
              <h3 className="text-lg font-semibold text-brown-dark mb-4">Application Questions</h3>
              {modelQuestions.map((question) => (
                <div key={question.id}>
                  <label className="block text-sm font-medium text-brown-dark mb-2">
                    {question.label} {question.required && <span className="text-red-500">*</span>}
                  </label>
                  {question.type === 'text' ? (
                    <textarea
                      value={(customAnswers[question.id] as string) || ''}
                      onChange={(event) => handleQuestionAnswer(question, event.target.value)}
                      rows={3}
                      required={question.required}
                      className="w-full px-4 py-3 border border-brown/20 rounded-lg focus:ring-2 focus:ring-brown/30 focus:border-brown transition-all bg-white/50"
                    />
                  ) : (
                    <div className="space-y-2">
                      {question.options.map((option) => (
                        <label key={option} className="flex items-center cursor-pointer hover:bg-brown/5 p-2 rounded-lg transition-colors">
                          <input
                            type={question.type === 'multiple' ? 'checkbox' : 'radio'}
                            name={question.id}
                            value={option}
                            checked={
                              question.type === 'multiple'
                                ? Array.isArray(customAnswers[question.id]) && (customAnswers[question.id] as string[]).includes(option)
                                : customAnswers[question.id] === option
                            }
                            onChange={(event) => handleQuestionAnswer(question, option, event.target.checked)}
                            required={question.required && question.type === 'single' && !customAnswers[question.id]}
                            className="mr-3 w-4 h-4 text-brown-dark border-brown/30 focus:ring-brown/30"
                          />
                          <span className="text-sm text-brown/80">{option}</span>
                        </label>
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </div>

            {/* Consent & Agreement */}
            <div className="space-y-3 border-t border-brown/20 pt-6">
              <h3 className="text-lg font-semibold text-brown-dark mb-4">Consent & Agreement</h3>
              
              <label className="flex items-start">
                <input
                  type="checkbox"
                  checked={consent.freeModelSet}
                  onChange={() => handleConsentChange('freeModelSet')}
                  className="mt-1 mr-3"
                  required
                />
                <span className="text-sm text-brown/80">
                  I understand this is a free model set provided for training/content creation.
                </span>
              </label>

              <label className="flex items-start">
                <input
                  type="checkbox"
                  checked={consent.longSessions}
                  onChange={() => handleConsentChange('longSessions')}
                  className="mt-1 mr-3"
                  required
                />
                <span className="text-sm text-brown/80">
                  I understand the appointment may take up to 3–4 hours.
                </span>
              </label>

              <label className="flex items-start">
                <input
                  type="checkbox"
                  checked={consent.photosVideos}
                  onChange={() => handleConsentChange('photosVideos')}
                  className="mt-1 mr-3"
                  required
                />
                <span className="text-sm text-brown/80">
                  I consent to photos/videos of my lashes being used for marketing purposes.
                </span>
              </label>

              <label className="flex items-start">
                <input
                  type="checkbox"
                  checked={consent.noInfills}
                  onChange={() => handleConsentChange('noInfills')}
                  className="mt-1 mr-3"
                  required
                />
                <span className="text-sm text-brown/80">
                  I understand infills are not included in this offer.
                </span>
              </label>

              <label className="flex items-start">
                <input
                  type="checkbox"
                  checked={consent.onTime}
                  onChange={() => handleConsentChange('onTime')}
                  className="mt-1 mr-3"
                  required
                />
                <span className="text-sm text-brown/80">
                  I agree to arrive on time; late arrivals may forfeit the appointment.
                </span>
              </label>

              <label className="flex items-start">
                <input
                  type="checkbox"
                  checked={consent.styleChoice}
                  onChange={() => handleConsentChange('styleChoice')}
                  className="mt-1 mr-3"
                  required
                />
                <span className="text-sm text-brown/80">
                  I understand the lash style will be chosen based on the model call needs.
                </span>
              </label>
            </div>

            {/* Submit Button */}
            <button
              type="submit"
              disabled={loading || !Object.values(consent).every(value => value === true)}
              className="w-full bg-brown-dark hover:bg-brown text-white font-semibold py-3 px-6 rounded-lg transition-all duration-300 transform hover:scale-[1.02] disabled:opacity-50 disabled:cursor-not-allowed shadow-lg hover:shadow-xl"
            >
              {loading ? 'Submitting...' : 'Apply Now'}
            </button>
            {!Object.values(consent).every(value => value === true) && (
              <p className="text-sm text-red-600 text-center mt-2">
                Please check all consent boxes to proceed
              </p>
            )}
          </form>
        </div>
      </div>
    </div>
    </>
  )
}

