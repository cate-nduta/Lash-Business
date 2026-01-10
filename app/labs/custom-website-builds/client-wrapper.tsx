'use client'

import { LabsCartProvider } from './cart-context'
import CustomWebsiteBuildsBanner from '@/components/CustomWebsiteBuildsBanner'

export default function ClientWrapper({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <LabsCartProvider>
      <CustomWebsiteBuildsBanner />
      {children}
    </LabsCartProvider>
  )
}

