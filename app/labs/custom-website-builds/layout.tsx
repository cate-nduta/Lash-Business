import { LabsCartProvider } from './cart-context'
import CustomWebsiteBuildsBanner from '@/components/CustomWebsiteBuildsBanner'

export default function BuildOnYourOwnLayout({
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

