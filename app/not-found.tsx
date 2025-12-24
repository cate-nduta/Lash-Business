import Link from 'next/link'

export default function NotFound() {
  return (
    <div className="min-h-screen bg-baby-pink-light flex items-center justify-center px-4">
      <div className="max-w-md w-full text-center">
        <h1 className="text-6xl font-display text-brown-dark mb-4">404</h1>
        <h2 className="text-2xl font-display text-brown-dark mb-4">🤎 Page Not Found</h2>
        <p className="text-brown mb-6">
          The page you're looking for doesn't exist or has been moved.
        </p>
        <div className="space-y-3">
          <Link
            href="/"
            className="block w-full px-6 py-3 bg-brown-dark text-white rounded-lg font-semibold hover:bg-brown transition-colors"
          >
            Go Home
          </Link>
          <Link
            href="/services"
            className="block w-full px-6 py-3 bg-brown-light text-brown-dark rounded-lg font-semibold hover:bg-brown-light/80 transition-colors"
          >
            View Services
          </Link>
        </div>
      </div>
    </div>
  )
}










