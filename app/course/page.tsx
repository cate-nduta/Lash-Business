import Link from 'next/link'
import { readFile } from 'fs/promises'
import path from 'path'
import { readDataFile } from '@/lib/data-utils'
import { getCourseSlug } from '@/lib/courses-utils'

interface Module {
  id: string
  title: string
  description: string
  estimatedTime: string
  status: 'completed' | 'pending'
  file: string
}

const modules: Module[] = [
  {
    id: '1',
    title: 'Why Service Providers Need Booking Websites',
    description: 'Understand why having a booking website is crucial for your business. Learn about the benefits, ROI, and real-world impact.',
    estimatedTime: '1-2 hours',
    status: 'completed',
    file: 'MODULE_01_WHY_BOOKING_WEBSITE.md'
  },
  {
    id: '2',
    title: 'Introduction and Setup',
    description: 'Set up your development environment and create your first Next.js project. Learn the basics of the tools you\'ll use.',
    estimatedTime: '2-3 hours',
    status: 'completed',
    file: 'MODULE_02_INTRODUCTION_AND_SETUP.md'
  },
  {
    id: '3',
    title: 'Building the Foundation',
    description: 'Create your homepage, navigation bar, and footer. Learn Tailwind CSS and build a professional website structure.',
    estimatedTime: '3-4 hours',
    status: 'completed',
    file: 'MODULE_03_BUILDING_THE_FOUNDATION.md'
  },
  {
    id: '4',
    title: 'Booking System Core',
    description: 'Build the heart of your booking website - calendar interface, time slots, service selection, and booking form.',
    estimatedTime: '4-5 hours',
    status: 'completed',
    file: 'MODULE_04_BOOKING_SYSTEM_CORE.md'
  },
  {
    id: '5',
    title: 'Payment Integration',
    description: 'Add payment processing to accept deposits and full payments. Integrate Pesapal for secure transactions.',
    estimatedTime: '3-4 hours',
    status: 'completed',
    file: 'MODULE_05_PAYMENT_INTEGRATION.md'
  },
  {
    id: '6',
    title: 'Client Accounts & Authentication',
    description: 'Create user registration, login system, and client dashboard. Let clients manage their bookings.',
    estimatedTime: '3-4 hours',
    status: 'completed',
    file: 'MODULE_06_CLIENT_ACCOUNTS.md'
  },
  {
    id: '7',
    title: 'Admin Dashboard',
    description: 'Build an admin panel to manage bookings, clients, and services. View analytics and statistics.',
    estimatedTime: '4-5 hours',
    status: 'completed',
    file: 'MODULE_07_ADMIN_DASHBOARD.md'
  },
  {
    id: '8',
    title: 'Email & Notifications',
    description: 'Set up email confirmations and automated reminders. Send professional HTML emails to clients.',
    estimatedTime: '2-3 hours',
    status: 'completed',
    file: 'MODULE_08_EMAIL_NOTIFICATIONS.md'
  },
  {
    id: '9',
    title: 'Deployment & Launch',
    description: 'Deploy your website to the internet. Set up custom domain and go live with your booking system.',
    estimatedTime: '2-3 hours',
    status: 'completed',
    file: 'MODULE_09_DEPLOYMENT_LAUNCH.md'
  },
  {
    id: '10',
    title: 'Bonus: Upgrading & Working with Developers',
    description: 'Learn when to upgrade, when to hire a developer, what to ask for, and what to avoid. Protect your investment.',
    estimatedTime: '1-2 hours',
    status: 'completed',
    file: 'MODULE_10_BONUS_UPGRADING_AND_DEVELOPERS.md'
  },
]

export default async function CoursePage() {
  // Redirect to courses listing or default course
  // For now, redirect to the booking website course if it exists
  const catalog = await readDataFile<{ courses: any[] }>('courses.json', { courses: [] })
  const bookingCourse = catalog.courses.find(c => 
    c.title.toLowerCase().includes('booking website') || 
    c.id === 'course-booking-website'
  )

  if (bookingCourse) {
    // Redirect to the specific course page using slug
    const redirect = await import('next/navigation')
    redirect.default.redirect(`/course/${getCourseSlug(bookingCourse)}`)
  }

  // Fallback: Load course info from data file (for backward compatibility)
  const courseInfo = await readDataFile('course-info.json', {
    title: 'How to Build a Client-Booking Website',
    subtitle: 'That Accepts Payments (Without a Developer)',
    description: 'A complete step-by-step text-based course that teaches you how to build a professional booking website from scratch. No coding experience required!',
    overview: {
      modules: 10,
      hours: '25-35',
      format: '100% Text-Based (No Videos)',
    },
    introText: 'This course will teach you how to build a complete booking website similar to this one. You\'ll learn step-by-step, starting with the basics and building up to a fully functional website with payment processing, email notifications, and admin dashboard.',
    perfectFor: 'Business owners, service providers, entrepreneurs, and anyone who wants to accept online bookings without hiring a developer.',
    cta: {
      title: 'Ready to Start Learning?',
      subtitle: 'Begin with Module 1 and follow along step-by-step',
      buttonText: 'Start Course Now',
      buttonSubtext: 'Begin with Module 1 to understand why booking websites are essential for service providers',
    },
    features: [
      {
        icon: '📅',
        title: 'Online Booking System',
        description: 'Clients can book appointments 24/7',
      },
      {
        icon: '💳',
        title: 'Payment Processing',
        description: 'Accept deposits and full payments',
      },
      {
        icon: '📧',
        title: 'Email Notifications',
        description: 'Automated confirmations and reminders',
      },
      {
        icon: '👥',
        title: 'Client Accounts',
        description: 'Registration and booking history',
      },
      {
        icon: '🎨',
        title: 'Admin Dashboard',
        description: 'Manage bookings and clients',
      },
      {
        icon: '📱',
        title: 'Responsive Design',
        description: 'Works on all devices',
      },
    ],
  })

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Hero Section */}
      <section className="bg-gradient-to-r from-blue-600 to-purple-600 text-white py-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center">
            <h1 className="text-4xl md:text-5xl font-bold mb-4">
              {courseInfo.title}
            </h1>
            <p className="text-xl md:text-2xl mb-6 text-blue-100">
              {courseInfo.subtitle}
            </p>
            <p className="text-lg text-blue-100 max-w-3xl mx-auto">
              {courseInfo.description}
            </p>
          </div>
        </div>
      </section>

      {/* Course Overview */}
      <section className="py-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="bg-white rounded-lg shadow-lg p-8 mb-12">
            <h2 className="text-3xl font-bold mb-6">Course Overview</h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
              <div className="text-center p-6 bg-blue-50 rounded-lg">
                <div className="text-4xl font-bold text-blue-600 mb-2">{courseInfo.overview.modules}</div>
                <div className="text-gray-700">Comprehensive Modules</div>
              </div>
              <div className="text-center p-6 bg-purple-50 rounded-lg">
                <div className="text-4xl font-bold text-purple-600 mb-2">{courseInfo.overview.hours}</div>
                <div className="text-gray-700">Hours of Content</div>
              </div>
              <div className="text-center p-6 bg-green-50 rounded-lg">
                <div className="text-4xl font-bold text-green-600 mb-2">100%</div>
                <div className="text-gray-700">{courseInfo.overview.format}</div>
              </div>
            </div>
            <div className="prose max-w-none">
              {courseInfo.introText && (
                <p className="text-lg text-gray-700 mb-4">
                  {courseInfo.introText}
                </p>
              )}
              {courseInfo.perfectFor && (
                <p className="text-lg text-gray-700">
                  <strong>Perfect for:</strong> {courseInfo.perfectFor}
                </p>
              )}
            </div>
          </div>

          {/* Modules List */}
          <div className="mb-8">
            <h2 className="text-3xl font-bold mb-8 text-center">Course Modules</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {modules.map((module, index) => (
                <Link
                  key={module.id}
                  href={`/course/module-${module.id}`}
                  className={`block rounded-lg shadow-md hover:shadow-xl transition-shadow p-6 border-l-4 ${
                    module.id === '10' 
                      ? 'bg-gradient-to-r from-purple-50 to-pink-50 border-purple-500' 
                      : 'bg-white border-blue-500'
                  }`}
                >
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex items-center">
                      <div className={`w-10 h-10 rounded-full flex items-center justify-center font-bold mr-4 ${
                        module.id === '10' 
                          ? 'bg-gradient-to-r from-purple-600 to-pink-600 text-white' 
                          : 'bg-blue-600 text-white'
                      }`}>
                        {module.id === '10' ? '🎁' : module.id}
                      </div>
                      <div>
                        <h3 className="text-xl font-bold text-gray-900">
                          {module.id === '10' && 'BONUS: '}
                          {module.title}
                        </h3>
                        <span className="inline-block mt-1 px-3 py-1 text-xs bg-green-100 text-green-800 rounded-full">
                          {module.status === 'completed' ? '✓ Complete' : 'Coming Soon'}
                        </span>
                        {module.id === '10' && (
                          <span className="inline-block mt-1 ml-2 px-3 py-1 text-xs bg-purple-100 text-purple-800 rounded-full">
                            Bonus Module
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                  <p className="text-gray-600 mb-4">{module.description}</p>
                  <div className="flex items-center justify-between text-sm text-gray-500">
                    <span>⏱️ {module.estimatedTime}</span>
                    <span className="text-blue-600 font-semibold">Start Module →</span>
                  </div>
                </Link>
              ))}
            </div>
          </div>

          {/* What You'll Build */}
          {courseInfo.features && courseInfo.features.length > 0 && (
            <div className="bg-white rounded-lg shadow-lg p-8 mb-12">
              <h2 className="text-3xl font-bold mb-6">What You'll Build</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {courseInfo.features.map((feature, index) => (
                  <div key={index} className="p-4 border border-gray-200 rounded-lg">
                    <div className="text-2xl mb-2">{feature.icon}</div>
                    <h3 className="font-semibold mb-2">{feature.title}</h3>
                    <p className="text-sm text-gray-600">{feature.description}</p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* CTA Section */}
          {(courseInfo.cta.title || courseInfo.cta.subtitle) && (
            <div className="bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-lg shadow-lg p-8 text-center">
              {courseInfo.cta.title && (
                <h2 className="text-3xl font-bold mb-4">{courseInfo.cta.title}</h2>
              )}
              {courseInfo.cta.subtitle && (
                <p className="text-xl mb-6 text-blue-100">
                  {courseInfo.cta.subtitle}
                </p>
              )}
              {courseInfo.cta.buttonText && (
                <Link
                  href="/course/module-1"
                  className="inline-block bg-white text-blue-600 px-8 py-3 rounded-lg font-semibold hover:bg-blue-50 transition"
                >
                  {courseInfo.cta.buttonText}
                </Link>
              )}
              {courseInfo.cta.buttonSubtext && (
                <p className="text-sm text-blue-100 mt-4">
                  {courseInfo.cta.buttonSubtext}
                </p>
              )}
            </div>
          )}
        </div>
      </section>
    </div>
  )
}

