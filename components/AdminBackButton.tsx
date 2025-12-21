'use client'

import Link from 'next/link'

interface AdminBackButtonProps {
  href?: string
  label?: string
}

export default function AdminBackButton({ href = '/admin/dashboard', label = 'Back to Dashboard' }: AdminBackButtonProps) {
  return (
    <div className="mb-4">
      <Link
        href={href}
        className="text-brown-dark hover:text-brown transition-colors"
      >
        {label}
      </Link>
    </div>
  )
}

