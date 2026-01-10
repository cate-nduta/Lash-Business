import type { Metadata } from 'next'
import ClientWrapper from './client-wrapper'

export const metadata: Metadata = {
  title: 'Website Labs - Custom Website Builds',
  description: 'Custom website building services - Build your own professional website',
}

export default function BuildOnYourOwnLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return <ClientWrapper>{children}</ClientWrapper>
}

