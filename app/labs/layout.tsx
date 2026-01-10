import type { Metadata } from 'next'
import LabsFAQButtonWrapper from './faq-button-wrapper'

export const metadata: Metadata = {
  title: 'Website Labs',
  description: 'Professional website building services',
}

export default function LabsLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <>
      {children}
      <LabsFAQButtonWrapper />
    </>
  )
}

