'use client'

import { useState, useEffect } from 'react'
import { useParams, useRouter } from 'next/navigation'
import type { Contract } from '@/types/consultation-workflow'

export default function ContractSigningPage() {
  const params = useParams()
  const router = useRouter()
  const token = params.token as string
  
  const [contract, setContract] = useState<Contract | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [signing, setSigning] = useState(false)
  
  // Signature state
  const [signatureType, setSignatureType] = useState<'typed' | 'drawn'>('typed')
  const [typedName, setTypedName] = useState('')
  const [signatureCanvas, setSignatureCanvas] = useState<HTMLCanvasElement | null>(null)
  const [isDrawing, setIsDrawing] = useState(false)
  const [agreed, setAgreed] = useState(false)
  
  useEffect(() => {
    loadContract()
  }, [token])

  useEffect(() => {
    // Initialize canvas for signature drawing
    if (signatureCanvas && signatureType === 'drawn') {
      const ctx = signatureCanvas.getContext('2d')
      if (ctx) {
        ctx.strokeStyle = '#000000'
        ctx.lineWidth = 2
        ctx.lineCap = 'round'
        ctx.lineJoin = 'round'
        // Set canvas background to white
        ctx.fillStyle = '#FFFFFF'
        ctx.fillRect(0, 0, signatureCanvas.width, signatureCanvas.height)
      }
    }
  }, [signatureCanvas, signatureType])

  const loadContract = async () => {
    try {
      const response = await fetch(`/api/contracts/token/${token}`)
      if (!response.ok) {
        throw new Error('Contract not found or expired')
      }
      const data = await response.json()
      setContract(data.contract)
    } catch (err: any) {
      setError(err.message || 'Failed to load contract')
    } finally {
      setLoading(false)
    }
  }

  const getCanvasCoordinates = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    const canvas = signatureCanvas
    if (!canvas) return null
    
    const rect = canvas.getBoundingClientRect()
    const clientX = 'touches' in e ? e.touches[0]?.clientX : e.clientX
    const clientY = 'touches' in e ? e.touches[0]?.clientY : e.clientY
    
    if (clientX === undefined || clientY === undefined) return null
    
    return {
      x: clientX - rect.left,
      y: clientY - rect.top,
    }
  }

  const handleCanvasStart = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    e.preventDefault()
    setIsDrawing(true)
    const canvas = signatureCanvas
    if (!canvas) return
    
    const coords = getCanvasCoordinates(e)
    if (!coords) return
    
    const ctx = canvas.getContext('2d')
    if (!ctx) return
    
    ctx.beginPath()
    ctx.moveTo(coords.x, coords.y)
  }

  const handleCanvasMove = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    e.preventDefault()
    if (!isDrawing || !signatureCanvas) return
    
    const coords = getCanvasCoordinates(e)
    if (!coords) return
    
    const ctx = signatureCanvas.getContext('2d')
    if (!ctx) return
    
    ctx.lineTo(coords.x, coords.y)
    ctx.stroke()
  }

  const handleCanvasEnd = () => {
    setIsDrawing(false)
  }

  const clearSignature = () => {
    if (!signatureCanvas) return
    const ctx = signatureCanvas.getContext('2d')
    if (!ctx) return
    ctx.clearRect(0, 0, signatureCanvas.width, signatureCanvas.height)
  }

  const handleSubmit = async () => {
    if (!contract) return

    // Validation
    if (signatureType === 'typed' && !typedName.trim()) {
      setError('Please enter your full legal name')
      return
    }

    if (signatureType === 'drawn') {
      if (!signatureCanvas) {
        setError('Please draw your signature')
        return
      }
      const ctx = signatureCanvas.getContext('2d')
      if (!ctx) return
      const imageData = ctx.getImageData(0, 0, signatureCanvas.width, signatureCanvas.height)
      const hasSignature = imageData.data.some((val, idx) => idx % 4 !== 3 && val !== 0)
      if (!hasSignature) {
        setError('Please draw your signature')
        return
      }
    }

    if (!agreed) {
      setError('Please agree to the terms of this contract')
      return
    }

    setSigning(true)
    setError(null)

    try {
      let signatureData = ''
      if (signatureType === 'typed') {
        signatureData = typedName.trim()
      } else if (signatureCanvas) {
        signatureData = signatureCanvas.toDataURL('image/png')
      }

      const response = await fetch(`/api/contracts/${contract.id}/sign`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          signatureType,
          signatureData,
          signedByName: signatureType === 'typed' ? typedName.trim() : undefined,
        }),
      })

      if (!response.ok) {
        const data = await response.json()
        throw new Error(data.error || 'Failed to sign contract')
      }

      const data = await response.json()
      
      // Show success and redirect
      alert('Contract signed successfully! You will receive a confirmation email shortly.')
      router.push(`/contract/${token}/signed`)
    } catch (err: any) {
      setError(err.message || 'Failed to sign contract')
    } finally {
      setSigning(false)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#FDF9F4]">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#7C4B31] mx-auto"></div>
          <p className="mt-4 text-[#6B4A3B]">Loading contract...</p>
        </div>
      </div>
    )
  }

  if (error && !contract) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#FDF9F4]">
        <div className="max-w-md w-full bg-white rounded-lg shadow-lg p-8 text-center">
          <h1 className="text-2xl font-bold text-[#7C4B31] mb-4">Contract Not Found</h1>
          <p className="text-[#6B4A3B] mb-6">{error}</p>
          <button
            onClick={() => router.push('/')}
            className="px-6 py-2 bg-[#7C4B31] text-white rounded hover:bg-[#6B3E26]"
          >
            Return Home
          </button>
        </div>
      </div>
    )
  }

  if (!contract) return null

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr)
    return date.toLocaleDateString('en-US', { 
      year: 'numeric', 
      month: 'long', 
      day: 'numeric' 
    })
  }

  return (
    <div className="min-h-screen bg-[#FDF9F4] py-12 px-4">
      <div className="max-w-4xl mx-auto">
        <div className="bg-white rounded-lg shadow-lg p-8 mb-6">
          <h1 className="text-3xl font-bold text-[#7C4B31] mb-2">Service Agreement</h1>
          <p className="text-[#6B4A3B] mb-6">
            Date: {formatDate(contract.contractDate)}
          </p>

          {/* Contract Parties */}
          <div className="mb-8 border-b pb-6">
            <p className="text-[#3E2A20] mb-2">
              <strong>Client:</strong> {contract.clientName}
            </p>
            <p className="text-[#3E2A20]">
              <strong>Service Provider:</strong> The LashDiary
            </p>
          </div>

          {/* Contract Terms */}
          <div className="mb-8 space-y-6">
            {/* Deliverables */}
            <section>
              <h2 className="text-xl font-semibold text-[#7C4B31] mb-3">1. Deliverables</h2>
              <div className="space-y-3 text-[#3E2A20]">
                <div>
                  <strong>What's Included:</strong>
                  <ul className="list-disc list-inside ml-4 mt-1">
                    {contract.contractTerms.deliverables.included.map((item, idx) => (
                      <li key={idx}>{item}</li>
                    ))}
                  </ul>
                </div>
                <div>
                  <strong>What's Not Included:</strong>
                  <ul className="list-disc list-inside ml-4 mt-1">
                    {contract.contractTerms.deliverables.notIncluded.map((item, idx) => (
                      <li key={idx}>{item}</li>
                    ))}
                  </ul>
                </div>
                <div>
                  <strong>What Counts as Extra:</strong>
                  <ul className="list-disc list-inside ml-4 mt-1">
                    {contract.contractTerms.deliverables.extras.map((item, idx) => (
                      <li key={idx}>{item}</li>
                    ))}
                  </ul>
                </div>
              </div>
            </section>

            {/* Payment Terms */}
            <section>
              <h2 className="text-xl font-semibold text-[#7C4B31] mb-3">2. Payment Terms</h2>
              <div className="space-y-2 text-[#3E2A20]">
                {contract.contractTerms.paymentTerms.consultationFee > 0 && (
                  <p>
                    <strong>Consultation Fee:</strong> KES {contract.contractTerms.paymentTerms.consultationFee.toLocaleString()}
                    {contract.contractTerms.paymentTerms.consultationFeeNonRefundable && ' (Non-refundable)'}
                  </p>
                )}
                <p>
                  <strong>Upfront Payment:</strong> {contract.contractTerms.paymentTerms.upfrontPercentage}% 
                  (KES {contract.contractTerms.paymentTerms.upfrontAmount.toLocaleString()})
                </p>
                <p>
                  <strong>Final Payment:</strong> {contract.contractTerms.paymentTerms.finalPercentage}% 
                  (KES {contract.contractTerms.paymentTerms.finalAmount.toLocaleString()}) 
                  {contract.contractTerms.paymentTerms.finalPaymentDue}
                </p>
                <p>
                  <strong>Invoice Expiry:</strong> {contract.contractTerms.paymentTerms.invoiceExpiryDays} days from issue
                </p>
                {contract.contractTerms.paymentTerms.noWorkWithoutPayment && (
                  <p className="font-semibold text-[#7C4B31]">
                    Work begins only after payment is received.
                  </p>
                )}
              </div>
            </section>

            {/* Timelines & Responsibilities */}
            <section>
              <h2 className="text-xl font-semibold text-[#7C4B31] mb-3">3. Timelines & Responsibilities</h2>
              <div className="space-y-3 text-[#3E2A20]">
                <div>
                  <strong>What We Need From You:</strong>
                  <ul className="list-disc list-inside ml-4 mt-1">
                    {contract.contractTerms.timelines.clientResponsibilities.map((item, idx) => (
                      <li key={idx}>{item}</li>
                    ))}
                  </ul>
                </div>
                <p><strong>If You Delay:</strong> {contract.contractTerms.timelines.clientDelays}</p>
                <p><strong>If We Delay:</strong> {contract.contractTerms.timelines.providerDelays}</p>
              </div>
            </section>

            {/* Boundaries */}
            <section>
              <h2 className="text-xl font-semibold text-[#7C4B31] mb-3">4. Boundaries</h2>
              <div className="space-y-2 text-[#3E2A20]">
                <p>
                  <strong>Revisions:</strong> {contract.contractTerms.boundaries.revisionLimit} {contract.contractTerms.boundaries.revisionType}
                </p>
                {contract.contractTerms.boundaries.noRefundsAfterStart && (
                  <p>No refunds after work starts.</p>
                )}
                {contract.contractTerms.boundaries.noEndlessChanges && (
                  <p>No endless changes without additional cost.</p>
                )}
              </div>
            </section>

            {/* Confidentiality / IP */}
            <section>
              <h2 className="text-xl font-semibold text-[#7C4B31] mb-3">5. Confidentiality & Intellectual Property</h2>
              <div className="space-y-2 text-[#3E2A20]">
                {contract.contractTerms.confidentiality.providerRetainsIPUntilPayment && (
                  <p>Service provider retains intellectual property until full payment is received.</p>
                )}
                {contract.contractTerms.confidentiality.clientReceivesIPOnFullPayment && (
                  <p>Upon full payment, client receives agreed deliverables' ownership/license.</p>
                )}
                {contract.contractTerms.confidentiality.mutualNDA && (
                  <p>Both parties agree not to disclose sensitive project information.</p>
                )}
              </div>
            </section>

            {/* Cancellation */}
            <section>
              <h2 className="text-xl font-semibold text-[#7C4B31] mb-3">6. Cancellation</h2>
              <div className="space-y-2 text-[#3E2A20]">
                <p><strong>Client Cancellation:</strong> {contract.contractTerms.cancellation.clientCancellationPolicy}</p>
                <p><strong>Provider Cancellation:</strong> {contract.contractTerms.cancellation.providerCancellationPolicy}</p>
              </div>
            </section>

            {/* Liability */}
            <section>
              <h2 className="text-xl font-semibold text-[#7C4B31] mb-3">7. Liability Limitation</h2>
              <div className="space-y-2 text-[#3E2A20]">
                {contract.contractTerms.liability.noIndirectDamages && (
                  <p>Service provider is not liable for indirect damages.</p>
                )}
                {contract.contractTerms.liability.noThirdPartyResponsibility && (
                  <p>Service provider is not responsible for client's third-party platforms or content failures.</p>
                )}
              </div>
            </section>
          </div>

          {/* Signature Section */}
          <div className="border-t pt-6 mt-8">
            <h2 className="text-xl font-semibold text-[#7C4B31] mb-4">Signature</h2>
            
            {/* Signature Type Selection */}
            <div className="mb-4">
              <label className="block text-sm font-medium text-[#3E2A20] mb-2">
                Signature Method
              </label>
              <div className="flex gap-4">
                <label className="flex items-center">
                  <input
                    type="radio"
                    value="typed"
                    checked={signatureType === 'typed'}
                    onChange={(e) => setSignatureType(e.target.value as 'typed' | 'drawn')}
                    className="mr-2"
                  />
                  Type Name
                </label>
                <label className="flex items-center">
                  <input
                    type="radio"
                    value="drawn"
                    checked={signatureType === 'drawn'}
                    onChange={(e) => setSignatureType(e.target.value as 'typed' | 'drawn')}
                    className="mr-2"
                  />
                  Draw Signature
                </label>
              </div>
            </div>

            {/* Typed Signature */}
            {signatureType === 'typed' && (
              <div className="mb-4">
                <label className="block text-sm font-medium text-[#3E2A20] mb-2">
                  Full Legal Name <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={typedName}
                  onChange={(e) => setTypedName(e.target.value)}
                  placeholder="Enter your full legal name"
                  className="w-full px-4 py-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-[#7C4B31]"
                />
              </div>
            )}

            {/* Drawn Signature */}
            {signatureType === 'drawn' && (
              <div className="mb-4">
                <label className="block text-sm font-medium text-[#3E2A20] mb-2">
                  Draw Your Signature <span className="text-red-500">*</span>
                </label>
                <div className="border-2 border-gray-300 rounded bg-white">
                  <canvas
                    ref={setSignatureCanvas}
                    width={600}
                    height={200}
                    className="w-full cursor-crosshair"
                    onMouseDown={handleCanvasStart}
                    onMouseMove={handleCanvasMove}
                    onMouseUp={handleCanvasEnd}
                    onMouseLeave={handleCanvasEnd}
                    onTouchStart={handleCanvasStart}
                    onTouchMove={handleCanvasMove}
                    onTouchEnd={handleCanvasEnd}
                    style={{ touchAction: 'none' }}
                  />
                </div>
                <button
                  type="button"
                  onClick={clearSignature}
                  className="mt-2 text-sm text-[#7C4B31] hover:underline"
                >
                  Clear Signature
                </button>
              </div>
            )}

            {/* Agreement Checkbox */}
            <div className="mb-6">
              <label className="flex items-start">
                <input
                  type="checkbox"
                  checked={agreed}
                  onChange={(e) => setAgreed(e.target.checked)}
                  className="mt-1 mr-2"
                />
                <span className="text-[#3E2A20]">
                  I agree to the terms of this contract <span className="text-red-500">*</span>
                </span>
              </label>
            </div>

            {/* Error Message */}
            {error && (
              <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded text-red-700">
                {error}
              </div>
            )}

            {/* Submit Button */}
            <button
              onClick={handleSubmit}
              disabled={signing}
              className="w-full py-3 bg-[#7C4B31] text-white rounded-lg font-semibold hover:bg-[#6B3E26] disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {signing ? 'Signing Contract...' : 'Sign Contract'}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

