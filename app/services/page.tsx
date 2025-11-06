'use client'

import { useState, useEffect } from 'react'
import { useInView } from 'react-intersection-observer'

interface Service {
  name: string
  description: string
  price: string
  duration?: string
}

interface ServiceData {
  name: string
  price: number
  duration: number
}

interface ServicesData {
  fullSets: ServiceData[]
  lashFills: ServiceData[]
  otherServices: ServiceData[]
}

// Service descriptions (can be moved to JSON later if needed)
const serviceDescriptions: { [key: string]: string } = {
  'Classic Lashes': 'One extension applied to each natural lash for a natural, elegant look. Perfect for everyday wear.',
  'Subtle Hybrid Lashes': 'A subtle blend of classic and volume lashes for a natural yet enhanced appearance.',
  'Hybrid Lashes': 'A beautiful blend of classic and volume lashes, offering fullness with a natural appearance.',
  'Volume Lashes': 'Multiple lightweight extensions per natural lash for a fuller, more dramatic look.',
  'Mega Volume Lashes': 'Ultimate fullness with ultra-fine extensions creating maximum impact and glamour.',
  'Wispy Lashes': 'Feathery, textured lashes that create a soft, fluttery effect with varying lengths.',
  'Classic Infill': 'Maintain your classic lash set with a fill appointment every 2-3 weeks.',
  'Subtle Hybrid Infill': 'Refresh your subtle hybrid lashes to keep them looking perfect.',
  'Hybrid Infill': 'Maintain your hybrid lash set with a fill appointment every 2-3 weeks.',
  'Volume Infill': 'Refresh your volume lashes to maintain their full, dramatic appearance.',
  'Mega Volume Infill': 'Maintain your mega volume lashes with a fill appointment every 2-3 weeks.',
  'Wispy Infill': 'Refresh your wispy lashes to keep that soft, fluttery look.',
  'Lash Lift': 'Enhance your natural lashes with a perm that curls and lifts, no extensions needed.',
}

export default function Services() {
  const [servicesData, setServicesData] = useState<ServicesData>({
    fullSets: [],
    lashFills: [],
    otherServices: [],
  })
  const [loading, setLoading] = useState(true)
  const [ref, inView] = useInView({
    triggerOnce: true,
    threshold: 0.1,
  })

  useEffect(() => {
    // Fetch services from API
    fetch('/api/services')
      .then((res) => res.json())
      .then((data) => {
        setServicesData(data)
        setLoading(false)
      })
      .catch((error) => {
        console.error('Error loading services:', error)
        setLoading(false)
      })
  }, [])

  // Convert service data to display format
  const convertToDisplayFormat = (services: ServiceData[]): Service[] => {
    return services.map((service) => ({
      name: service.name,
      description: serviceDescriptions[service.name] || '',
      price: `KSH ${service.price.toLocaleString()}`,
      duration: `${service.duration} min`,
    }))
  }

  const fullSets = convertToDisplayFormat(servicesData.fullSets)
  const lashFills = convertToDisplayFormat(servicesData.lashFills)
  const otherServices = convertToDisplayFormat(servicesData.otherServices)

  if (loading) {
    return (
      <div className="min-h-screen bg-baby-pink-light flex items-center justify-center">
        <div className="text-brown">Loading services...</div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-baby-pink-light py-20">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="text-center mb-16">
          <h1 className="text-5xl md:text-6xl font-display text-brown mb-6">
            Our Services
          </h1>
          <p className="text-xl text-gray-600 max-w-2xl mx-auto">
            Discover our range of premium lash and beauty services, 
            each designed to enhance your natural beauty and make you feel fabulous!
          </p>
        </div>

        {/* Full Sets Section */}
        <div className="mb-16">
          <h2 className="text-4xl md:text-5xl font-display text-brown mb-8 text-center underline decoration-brown decoration-2 underline-offset-4">
            Full Sets
          </h2>
          <div 
            ref={ref}
            className={`space-y-6 ${
              inView ? 'animate-fade-in-up' : 'opacity-0'
            }`}
          >
            {fullSets.map((service, index) => (
              <div
                key={index}
                className="bg-brown-lighter rounded-2xl shadow-soft p-8 hover:shadow-soft-lg transition-all duration-300 hover:scale-[1.02] hover:-rotate-[0.5deg] transform cursor-pointer group"
              >
                <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                  <div className="flex-1">
                    <div className="flex items-center gap-4 mb-3 flex-wrap">
                        <h3 className="text-2xl md:text-3xl font-display text-brown group-hover:text-brown transition-colors">
                          {service.name}
                        </h3>
                      <span className="text-brown font-semibold text-xl bg-white px-3 py-1 rounded-full border-2 border-brown group-hover:scale-110 transform transition-transform">
                        {service.price}
                      </span>
                    </div>
                    <p className="text-gray-600 leading-relaxed mb-2 group-hover:text-gray-700 transition-colors">
                      {service.description}
                    </p>
                    {service.duration && (
                      <p className="text-sm text-brown-dark font-semibold">
                        Duration: {service.duration}
                      </p>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Lash Fills Section */}
        <div className="mb-16">
          <h2 className="text-4xl md:text-5xl font-display text-brown mb-8 text-center underline decoration-brown decoration-2 underline-offset-4">
            Lash Fills
          </h2>
          <div className="space-y-6">
            {lashFills.map((service, index) => (
              <div
                key={index}
                className="bg-brown-lighter rounded-2xl shadow-soft p-8 hover:shadow-soft-lg transition-all duration-300 hover:scale-[1.02] hover:-rotate-[0.5deg] transform cursor-pointer group"
              >
                <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                  <div className="flex-1">
                    <div className="flex items-center gap-4 mb-3 flex-wrap">
                        <h3 className="text-2xl md:text-3xl font-display text-brown group-hover:text-brown transition-colors">
                          {service.name}
                        </h3>
                        <span className="text-brown font-semibold text-xl bg-white px-3 py-1 rounded-full border-2 border-brown group-hover:scale-110 transform transition-transform">
                          {service.price}
                        </span>
                    </div>
                    <p className="text-gray-600 leading-relaxed mb-2 group-hover:text-gray-700 transition-colors">
                      {service.description}
                    </p>
                    {service.duration && (
                      <p className="text-sm text-brown-dark font-semibold">
                        Duration: {service.duration}
                      </p>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Other Services Section */}
        {otherServices.length > 0 && (
          <div className="mb-16">
          <h2 className="text-4xl md:text-5xl font-display text-brown mb-8 text-center underline decoration-brown decoration-2 underline-offset-4">
            Other Services
          </h2>
            <div className="space-y-6">
              {otherServices.map((service, index) => (
                <div
                  key={index}
                  className="bg-brown-lighter rounded-2xl shadow-soft p-8 hover:shadow-soft-lg transition-all duration-300 hover:scale-[1.02] hover:-rotate-[0.5deg] transform cursor-pointer group"
                >
                  <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                    <div className="flex-1">
                      <div className="flex items-center gap-4 mb-3 flex-wrap">
                        <h3 className="text-2xl md:text-3xl font-display text-brown group-hover:text-brown transition-colors">
                          {service.name}
                        </h3>
                        <span className="text-brown font-semibold text-xl bg-white px-3 py-1 rounded-full border-2 border-brown group-hover:scale-110 transform transition-transform">
                          {service.price}
                        </span>
                      </div>
                      <p className="text-gray-600 leading-relaxed mb-2 group-hover:text-gray-700 transition-colors">
                        {service.description}
                      </p>
                      {service.duration && (
                        <p className="text-sm text-brown-dark font-semibold">
                          Duration: {service.duration}
                        </p>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Additional Info */}
        <div className="mt-16 bg-white rounded-lg shadow-soft p-8 border-t-4 border-brown">
          <h3 className="text-2xl font-display text-brown mb-4">
            Additional Information
          </h3>
          <div className="space-y-3 text-gray-600">
            <p>
              <strong className="text-brown">Fill Appointments:</strong> Recommended every 2-3 weeks to maintain your lashes. Fill prices vary based on the type of lash set you have.
            </p>
            <p>
              <strong className="text-brown">Consultation:</strong> Free consultation available for first-time clients to help you choose the perfect lash style.
            </p>
            <p>
              <strong className="text-brown">Aftercare:</strong> Detailed aftercare instructions provided to ensure longevity and maintain the quality of your lashes.
            </p>
            <p>
              <strong className="text-brown">Pricing:</strong> All prices are in Kenyan Shillings (KSH). Contact us for any questions about our services or to book your appointment.
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}

