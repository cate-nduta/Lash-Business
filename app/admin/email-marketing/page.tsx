'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import type { FC, Ref } from 'react'
import dynamic from 'next/dynamic'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import UnsavedChangesDialog from '@/components/UnsavedChangesDialog'
import Toast from '@/components/Toast'
import type { ReactQuillProps } from 'react-quill'
import 'react-quill/dist/quill.snow.css'
import type { CampaignAttachment, RecipientType } from '@/lib/email-campaign-utils'

const ReactQuill = dynamic(
  () => import('react-quill').then((mod) => mod.default),
  {
  ssr: false,
  loading: () => <div className="p-4 text-brown-dark bg-white">Loading editor...</div>,
  },
) as FC<ReactQuillProps & { ref?: Ref<any> }>

type Tab =
  | 'compose'
  | 'templates'
  | 'preview'
  | 'analytics'
  | 'campaigns'
  | 'customers'
  | 'unsubscribes'
  | 'automation'

type Metric = 'open' | 'click'

type ComposeState = {
  subject: string
  content: string
  recipientType: RecipientType
  attachments: CampaignAttachment[]
  selectedTemplateId?: string
  schedule: {
    enabled: boolean
    sendAt: string
  }
  abTest: {
    enabled: boolean
    samplePercentage: number
    metric: Metric
    variantA: {
      subject: string
      content: string
    }
    variantB: {
      subject: string
      content: string
    }
  }
}

interface EmailTemplate {
  id: string
  name: string
  subject: string
  content: string
  category: string
}

interface CustomerRow {
  email: string
  name: string
  totalBookings: number
  lastBookingDate: string | null
  nextBookingDate: string | null
  type: string
  unsubscribed: boolean
}

interface CampaignRow {
  id: string
  subject: string
  content: string
  recipientType: RecipientType
  sentAt: string | null
  createdAt: string
  totalRecipients: number
  opened: number
  clicked: number
  notOpened: number
  attachments?: CampaignAttachment[]
  scheduleStatus?: 'scheduled' | 'sent' | 'cancelled'
  scheduleSendAt?: string | null
  abParentId?: string
  variant?: 'A' | 'B'
}

interface ScheduledRow {
  id: string
  subject: string
  content: string
  recipientType: RecipientType
  recipients: Array<{ email: string; name: string }>
  attachments?: CampaignAttachment[]
  excludeUnsubscribed: boolean
  schedule: {
    enabled: boolean
    sendAt: string
  }
  abTest?: {
    enabled: boolean
    samplePercentage: number
    metric: Metric
    variantA: { subject: string; content: string }
    variantB: { subject: string; content: string }
  }
  createdAt: string
}

interface UnsubscribeRecord {
  email: string
  name?: string
  reason?: string
  token: string
  unsubscribedAt: string
}

interface DripCampaign {
  id: string
  name: string
  enabled: boolean
  trigger: string
  emails: Array<{ dayOffset: number; subject: string; content: string }>
}

const quillModules = {
  toolbar: [
    [{ header: 1 }, { header: 2 }, { header: 3 }, { header: 4 }, { header: 5 }, { header: false }],
    ['bold', 'italic', 'underline', 'strike'],
    [{ list: 'ordered' }, { list: 'bullet' }],
    [{ align: [] }],
    ['link'],
    ['clean'],
  ],
}

const quillFormats = [
  'header',
  'bold',
  'italic',
  'underline',
  'strike',
  'list',
  'bullet',
  'align',
  'link',
]

const personalizationTokens = [
  { token: '{name}', label: 'Client Name' },
  { token: '{email}', label: 'Client Email' },
  { token: '{phone}', label: 'Business Phone' },
  { token: '{businessName}', label: 'Business Name' },
  { token: '{lastVisit}', label: 'Last Visit Date' },
  { token: '{totalVisits}', label: 'Total Visits' },
  { token: '{appointmentDate}', label: 'Next Appointment Date' },
  { token: '{appointmentTime}', label: 'Next Appointment Time' },
  { token: '{serviceName}', label: 'Service Name' },
]

const formatDateInput = (date: Date) => {
  const iso = new Date(date.getTime() - date.getTimezoneOffset() * 60000).toISOString()
  return iso.slice(0, 16)
}

const defaultComposeState: ComposeState = {
  subject: '',
  content: '',
  recipientType: 'all',
  attachments: [],
  schedule: {
    enabled: false,
    sendAt: formatDateInput(new Date(Date.now() + 60 * 60 * 1000)),
  },
  abTest: {
    enabled: false,
    samplePercentage: 20,
    metric: 'open',
    variantA: {
      subject: 'Option A Subject',
      content: '<p>Variant A content...</p>',
    },
    variantB: {
      subject: 'Option B Subject',
      content: '<p>Variant B content...</p>',
    },
  },
}

export default function AdminEmailMarketing() {
  const router = useRouter()
  const quillRef = useRef<any>(null)
  const [activeTab, setActiveTab] = useState<Tab>('compose')
  const [compose, setCompose] = useState<ComposeState>(defaultComposeState)
  const [customRecipientsInput, setCustomRecipientsInput] = useState('')
  const [testEmail, setTestEmail] = useState('')
  const [customers, setCustomers] = useState<CustomerRow[]>([])
  const [campaigns, setCampaigns] = useState<CampaignRow[]>([])
  const [scheduledEmails, setScheduledEmails] = useState<ScheduledRow[]>([])
  const [templates, setTemplates] = useState<EmailTemplate[]>([])
  const [unsubscribes, setUnsubscribes] = useState<UnsubscribeRecord[]>([])
  const [dripCampaigns, setDripCampaigns] = useState<DripCampaign[]>([])
  const [loading, setLoading] = useState(true)
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null)
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false)
  const [showUnsavedDialog, setShowUnsavedDialog] = useState(false)
  const [pendingNavigation, setPendingNavigation] = useState<string | null>(null)
  const [sending, setSending] = useState(false)
  const [savingDrips, setSavingDrips] = useState(false)
  const fileInputRef = useRef<HTMLInputElement | null>(null)

  const parsedCustomRecipients = useMemo(() => {
    if (!customRecipientsInput.trim()) return []
    const lines = customRecipientsInput.split(/\n|,/).map((line) => line.trim()).filter(Boolean)
    const entries = lines
      .map((line) => {
        const [email, ...nameParts] = line.split('|').map((part) => part.trim())
        if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return null
        return {
          email: email.toLowerCase(),
          name: nameParts.join(' ') || 'Beautiful Soul',
        }
      })
      .filter(Boolean) as Array<{ email: string; name: string }>
    return entries
  }, [customRecipientsInput])

  const getRecipientCount = () => {
    if (compose.recipientType === 'custom') return parsedCustomRecipients.length
    if (compose.recipientType === 'all') return customers.length
    if (compose.recipientType === 'first-time') return customers.filter((c) => c.totalBookings === 1).length
    return customers.filter((c) => c.totalBookings > 1).length
  }

  const previewSubscriber = useMemo(() => {
    if (customers.length > 0) {
      return customers[0]
    }
    return {
      email: testEmail || 'guest@example.com',
      name: 'Catherine N.',
      totalBookings: 3,
      lastBookingDate: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString(),
      nextBookingDate: new Date(Date.now() + 5 * 24 * 60 * 60 * 1000).toISOString(),
      type: 'returning',
      unsubscribed: false,
    } as CustomerRow
  }, [customers, testEmail])

  const replaceTokensForPreview = (text: string) => {
    if (!text) return ''
    const replacements: Record<string, string> = {
      '{name}': previewSubscriber.name || 'Beautiful Soul',
      '{email}': previewSubscriber.email,
      '{phone}': '',
      '{businessName}': 'LashDiary',
      '{lastVisit}': previewSubscriber.lastBookingDate
        ? new Date(previewSubscriber.lastBookingDate).toLocaleDateString('en-US', {
            year: 'numeric',
            month: 'short',
            day: 'numeric',
          })
        : 'Not yet visited',
      '{totalVisits}': String(previewSubscriber.totalBookings || 0),
      '{appointmentDate}': previewSubscriber.nextBookingDate
        ? new Date(previewSubscriber.nextBookingDate).toLocaleDateString('en-US', {
            year: 'numeric',
            month: 'short',
            day: 'numeric',
          })
        : 'Not yet scheduled',
      '{appointmentTime}': previewSubscriber.nextBookingDate
        ? new Date(previewSubscriber.nextBookingDate).toLocaleTimeString('en-US', {
            hour: 'numeric',
            minute: '2-digit',
          })
        : 'TBD',
      '{serviceName}': 'Signature Lash Service',
    }
    return Object.entries(replacements).reduce((acc, [token, value]) => acc.replace(new RegExp(token, 'g'), value), text)
  }

  const previewHtml = useMemo(() => replaceTokensForPreview(compose.content), [compose.content, previewSubscriber])

  const analytics = useMemo(() => {
    if (campaigns.length === 0) {
      return {
        totalSent: 0,
        averageOpenRate: 0,
        averageClickRate: 0,
        bestCampaign: null as CampaignRow | null,
        recentCampaigns: [] as CampaignRow[],
      }
    }

    const totalSent = campaigns.reduce((sum, campaign) => sum + campaign.totalRecipients, 0)
    const totalOpened = campaigns.reduce((sum, campaign) => sum + campaign.opened, 0)
    const totalClicked = campaigns.reduce((sum, campaign) => sum + campaign.clicked, 0)

    const averageOpenRate = totalSent ? (totalOpened / totalSent) * 100 : 0
    const averageClickRate = totalSent ? (totalClicked / totalSent) * 100 : 0

    const bestCampaign = campaigns
      .filter((campaign) => campaign.sentAt)
      .reduce((best, current) => {
        const currentRate = current.totalRecipients ? current.opened / current.totalRecipients : 0
        if (!best) return current
        const bestRate = best.totalRecipients ? best.opened / best.totalRecipients : 0
        return currentRate > bestRate ? current : best
      }, null as CampaignRow | null)

    const recentCampaigns = campaigns
      .filter((campaign) => campaign.sentAt)
      .sort((a, b) => new Date(b.sentAt || b.createdAt).getTime() - new Date(a.sentAt || a.createdAt).getTime())
      .slice(0, 5)

    return {
      totalSent,
      averageOpenRate,
      averageClickRate,
      bestCampaign,
      recentCampaigns,
    }
  }, [campaigns])

  const loadAllData = async () => {
    try {
      setLoading(true)
      const [templatesRes, customersRes, campaignsRes, scheduledRes, unsubscribesRes, dripsRes] = await Promise.all([
        fetch('/api/admin/email-marketing/templates'),
        fetch('/api/admin/email-marketing/customers'),
        fetch('/api/admin/email-marketing/campaigns'),
        fetch('/api/admin/email-marketing/schedule'),
        fetch('/api/admin/email-marketing/unsubscribes'),
        fetch('/api/admin/email-marketing/drips'),
      ])

      if (templatesRes.ok) {
        const data = await templatesRes.json()
        setTemplates(data.templates || [])
      }

      if (customersRes.ok) {
        const data = await customersRes.json()
        setCustomers(data.customers || [])
      }

      if (campaignsRes.ok) {
        const data = await campaignsRes.json()
        setCampaigns(data.campaigns || [])
      }

      if (scheduledRes.ok) {
        const data = await scheduledRes.json()
        setScheduledEmails(data.scheduled || [])
      }

      if (unsubscribesRes.ok) {
        const data = await unsubscribesRes.json()
        setUnsubscribes(data.unsubscribes || [])
      }

      if (dripsRes.ok) {
        const data = await dripsRes.json()
        setDripCampaigns(data.campaigns || [])
      }
    } catch (error) {
      console.error('Error loading email marketing data:', error)
      setMessage({ type: 'error', text: 'Failed to load email marketing data' })
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    const verifyAuthAndLoad = async () => {
      const authRes = await fetch('/api/admin/current-user')
      const authData = await authRes.json()
      if (!authData.authenticated) {
        router.push('/admin/login')
        return
      }
      loadAllData()
    }

    verifyAuthAndLoad()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const handleUnsavedNavigation = (e: React.MouseEvent<HTMLAnchorElement>, href: string) => {
    if (hasUnsavedChanges) {
      e.preventDefault()
      setPendingNavigation(href)
      setShowUnsavedDialog(true)
    }
  }

  const handleCancelUnsaved = () => {
    setShowUnsavedDialog(false)
    setPendingNavigation(null)
  }

  const handleLeaveWithoutSaving = () => {
    setShowUnsavedDialog(false)
    setHasUnsavedChanges(false)
    setCompose(defaultComposeState)
    setCustomRecipientsInput('')
    setTestEmail('')
    if (pendingNavigation) {
      router.push(pendingNavigation)
    }
  }

  const handleComposeChange = <K extends keyof ComposeState>(key: K, value: ComposeState[K]) => {
    setCompose((prev) => ({ ...prev, [key]: value }))
    setHasUnsavedChanges(true)
  }

  const handleInsertToken = (token: string) => {
    if (activeTab === 'compose') {
      const editor = quillRef.current?.getEditor?.()
      if (editor) {
        const range = editor.getSelection()
        const index = range ? range.index : editor.getLength()
        editor.insertText(index, token)
        editor.setSelection(index + token.length)
        setHasUnsavedChanges(true)
        return
      }
    }
    handleComposeChange('subject', compose.subject + token)
  }

  const handleApplyTemplate = (template: EmailTemplate) => {
    handleComposeChange('subject', template.subject)
    handleComposeChange('content', template.content)
    handleComposeChange('selectedTemplateId', template.id)
    setActiveTab('compose')
  }

  const handleRemoveAttachment = (attachment: CampaignAttachment) => {
    handleComposeChange(
      'attachments',
      compose.attachments.filter((item) => item.url !== attachment.url)
    )
  }

  const handleUploadAttachment = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files
    if (!files || files.length === 0) return

    const file = files[0]
    const formData = new FormData()
    formData.append('attachment', file)

    try {
      const response = await fetch('/api/admin/email-marketing/attachments/upload', {
        method: 'POST',
        body: formData,
      })

      const data = await response.json()
      if (!response.ok) {
        throw new Error(data.error || 'Failed to upload attachment')
      }

      handleComposeChange('attachments', [...compose.attachments, data.attachment])
      setMessage({ type: 'success', text: 'Attachment uploaded successfully!' })
    } catch (error: any) {
      console.error('Attachment upload error:', error)
      setMessage({ type: 'error', text: error.message || 'Failed to upload attachment' })
    } finally {
      if (fileInputRef.current) {
        fileInputRef.current.value = ''
      }
    }
  }

  const handleSendTestEmail = async () => {
    const trimmedEmail = testEmail.trim()
    if (trimmedEmail && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmedEmail)) {
      setMessage({ type: 'error', text: 'Please enter a valid email address for the test send.' })
      return
    }

    if (!compose.subject || !compose.content) {
      setMessage({ type: 'error', text: 'Subject and content are required for a test email.' })
      return
    }

    setSending(true)
    setMessage(null)

    try {
      const response = await fetch('/api/admin/email-marketing/test-send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          subject: compose.subject,
          content: compose.content,
          toEmail: trimmedEmail || undefined,
          attachments: compose.attachments,
          previewSubscriber,
        }),
      })
      const data = await response.json()
      if (!response.ok) {
        throw new Error(data.error || 'Failed to send test email')
      }
      setMessage({ type: 'success', text: `Test email sent to ${data.sentTo}!` })
    } catch (error: any) {
      setMessage({ type: 'error', text: error.message || 'Failed to send test email' })
    } finally {
      setSending(false)
    }
  }

  const handleSendEmail = async () => {
    if (!compose.subject || !compose.content) {
      setMessage({ type: 'error', text: 'Subject and content are required.' })
      return
    }

    if (compose.recipientType === 'custom' && parsedCustomRecipients.length === 0) {
      setMessage({ type: 'error', text: 'Please add at least one valid custom recipient.' })
      return
    }

    setSending(true)
    setMessage(null)

    const payload: any = {
      subject: compose.subject,
      content: compose.content,
      recipientType: compose.recipientType,
      attachments: compose.attachments,
      excludeUnsubscribed: true,
    }

    if (compose.recipientType === 'custom') {
      payload.customRecipients = parsedCustomRecipients
    }

    if (compose.schedule.enabled) {
      payload.schedule = {
        enabled: true,
        sendAt: new Date(compose.schedule.sendAt).toISOString(),
      }
    }

    if (compose.abTest.enabled) {
      payload.abTest = {
        enabled: true,
        samplePercentage: compose.abTest.samplePercentage,
        metric: compose.abTest.metric,
        variantA: compose.abTest.variantA,
        variantB: compose.abTest.variantB,
      }
    }

    try {
      const response = await fetch('/api/admin/email-marketing/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })
      const data = await response.json()
      if (!response.ok) {
        throw new Error(data.error || 'Failed to send email')
      }
      setMessage({ type: 'success', text: compose.schedule.enabled ? 'Email scheduled successfully!' : `Email sent to ${data.recipientsCount} recipients!` })
      setCompose(defaultComposeState)
      setCustomRecipientsInput('')
      setHasUnsavedChanges(false)
      setActiveTab('campaigns')
      loadAllData()
    } catch (error: any) {
      setMessage({ type: 'error', text: error.message || 'Failed to send email campaign' })
    } finally {
      setSending(false)
    }
  }

  const handleProcessScheduled = async () => {
    try {
      const response = await fetch('/api/admin/email-marketing/schedule/process', {
        method: 'POST',
      })
      const data = await response.json()
      if (!response.ok) {
        throw new Error(data.error || 'Failed to process scheduled emails')
      }
      setMessage({ type: 'success', text: `Processed ${data.processed} scheduled email(s).` })
      loadAllData()
    } catch (error: any) {
      setMessage({ type: 'error', text: error.message || 'Failed to process scheduled emails' })
    }
  }

  const handleResubscribe = async (email: string) => {
    try {
      const response = await fetch('/api/admin/email-marketing/unsubscribes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'resubscribe', email }),
      })
      const data = await response.json()
      if (!response.ok) {
        throw new Error(data.error || 'Failed to resubscribe user')
      }
      setMessage({ type: 'success', text: `${email} has been resubscribed.` })
      loadAllData()
    } catch (error: any) {
      setMessage({ type: 'error', text: error.message || 'Failed to resubscribe user' })
    }
  }

  const handleSaveDrips = async () => {
    try {
      setSavingDrips(true)
      const response = await fetch('/api/admin/email-marketing/drips', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ campaigns: dripCampaigns }),
      })
      const data = await response.json()
      if (!response.ok) {
        throw new Error(data.error || 'Failed to update drip campaigns')
      }
      setMessage({ type: 'success', text: 'Automations updated successfully!' })
      setSavingDrips(false)
    } catch (error: any) {
      setSavingDrips(false)
      setMessage({ type: 'error', text: error.message || 'Failed to update automations' })
    }
  }

  const handleImportCustomers = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files
    if (!files || files.length === 0) return
    const file = files[0]

    try {
      const text = await file.text()
      const lines = text.split(/\r?\n/).map((line) => line.trim()).filter(Boolean)
      const headers = lines[0].split(',').map((header) => header.trim().toLowerCase())
      const emailIndex = headers.indexOf('email')
      const nameIndex = headers.indexOf('name')
      if (emailIndex === -1) {
        throw new Error('CSV must include an email column')
      }

      const subscribers = lines.slice(1).map((line) => {
        const parts = line.split(',').map((part) => part.trim())
        return {
          email: parts[emailIndex],
          name: nameIndex >= 0 ? parts[nameIndex] : undefined,
          source: 'csv-import',
        }
      })

      const response = await fetch('/api/admin/email-marketing/customers', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ subscribers }),
      })
      const data = await response.json()
      if (!response.ok) {
        throw new Error(data.error || 'Failed to import customers')
      }
      setMessage({ type: 'success', text: `Imported ${data.imported} subscriber(s)` })
      loadAllData()
    } catch (error: any) {
      setMessage({ type: 'error', text: error.message || 'Failed to import customers' })
    } finally {
      event.target.value = ''
    }
  }

  const handleExportCustomers = () => {
    if (customers.length === 0) {
      setMessage({ type: 'error', text: 'No customers to export.' })
      return
    }

    const header = 'Email,Name,Total Bookings,Last Booking,Type\n'
    const rows = customers
      .map((customer) =>
        [
          customer.email,
          customer.name.replace(/,/g, ' '),
          customer.totalBookings,
          customer.lastBookingDate || '',
          customer.type,
        ].join(',')
      )
      .join('\n')

    const csvContent = header + rows
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
    const url = window.URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.setAttribute('download', 'lashdiary-subscribers.csv')
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    window.URL.revokeObjectURL(url)
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-baby-pink-light flex items-center justify-center">
        <div className="text-brown">Loading...</div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-baby-pink-light py-8 px-4">
      <div className="max-w-7xl mx-auto">
        <div className="mb-6 flex justify-between items-center">
          <Link
            href="/admin/dashboard"
            className="text-brown hover:text-brown-dark"
            onClick={(e) => handleUnsavedNavigation(e, '/admin/dashboard')}
          >
            ← Back to Dashboard
          </Link>
          <div className="flex gap-4">
            <button
              onClick={loadAllData}
              className="px-0 py-2 text-sm text-gray-600 font-semibold hover:text-gray-900 hover:underline transition-colors"
            >
              Refresh Data
            </button>
            <button
              onClick={() => setActiveTab('templates')}
              className="px-0 py-2 text-sm text-gray-600 font-semibold hover:text-gray-900 hover:underline transition-colors"
            >
              View Templates
            </button>
          </div>
        </div>

        {message && (
          <Toast
            message={message.text}
            type={message.type}
            onClose={() => setMessage(null)}
          />
        )}

        <div className="bg-white rounded-lg shadow-lg p-8 mb-6">
          <h1 className="text-4xl font-display text-brown-dark mb-6">Email Marketing</h1>

          <div className="flex flex-wrap gap-4 border-b-2 border-brown-light pb-4 mb-6">
            {(
              [
                { key: 'compose', label: 'Compose Email' },
                { key: 'templates', label: 'Templates' },
                { key: 'preview', label: 'Preview' },
                { key: 'analytics', label: 'Analytics' },
                { key: 'campaigns', label: `Campaigns (${campaigns.length})` },
                { key: 'customers', label: `Customers (${customers.length})` },
                { key: 'unsubscribes', label: 'Unsubscribes' },
                { key: 'automation', label: 'Automations' },
              ] as Array<{ key: Tab; label: string }>
            ).map((tab) => (
              <span
                key={tab.key}
                onClick={() => setActiveTab(tab.key)}
                className={`px-0 py-2 text-sm font-semibold transition-colors cursor-pointer ${
                  activeTab === tab.key
                    ? 'text-gray-900'
                    : 'text-gray-600 hover:text-gray-900'
                }`}
              >
                {tab.label}
              </span>
            ))}
          </div>

          {activeTab === 'compose' && (
            <div className="space-y-6">
              <div>
                <label className="block text-sm font-semibold text-brown-dark mb-2">Recipients</label>
                <select
                  value={compose.recipientType}
                  onChange={(e) => handleComposeChange('recipientType', e.target.value as RecipientType)}
                  className="w-full px-4 py-3 border-2 border-brown-light rounded-lg bg-white text-brown-dark focus:ring-2 focus:ring-brown-dark focus:border-brown-dark"
                >
                  <option value="all">All Customers ({customers.length})</option>
                  <option value="first-time">First-Time Clients ({customers.filter((c) => c.totalBookings === 1).length})</option>
                  <option value="returning">Returning Clients ({customers.filter((c) => c.totalBookings > 1).length})</option>
                  <option value="custom">Custom List</option>
                </select>
                <p className="text-xs text-brown mt-1">Will be sent to {getRecipientCount()} recipients</p>
              </div>

              {compose.recipientType === 'custom' && (
                <div>
                  <label className="block text-sm font-semibold text-brown-dark mb-2">Custom Recipients</label>
                  <textarea
                    value={customRecipientsInput}
                    onChange={(e) => {
                      setCustomRecipientsInput(e.target.value)
                      setHasUnsavedChanges(true)
                    }}
                    rows={4}
                    className="w-full px-4 py-3 border-2 border-brown-light rounded-lg bg-white text-brown-dark focus:ring-2 focus:ring-brown-dark focus:border-brown-dark"
                    placeholder="email@example.com | Name"
                  />
                  <p className="text-xs text-brown mt-1">One entry per line or comma-separated. Optional name after a pipe (|).</p>
                </div>
              )}

              <div>
                <label className="block text-sm font-semibold text-brown-dark mb-2">Subject *</label>
                <div className="flex gap-2 mb-2">
                  <input
                    type="text"
                    value={compose.subject}
                    onChange={(e) => handleComposeChange('subject', e.target.value)}
                    placeholder="e.g., New Service Launch - Mega Volume Lashes!"
                    className="flex-1 px-4 py-3 border-2 border-brown-light rounded-lg bg-white text-brown-dark focus:ring-2 focus:ring-brown-dark focus:border-brown-dark"
                  />
                  <button
                    onClick={() => handleComposeChange('subject', compose.subject.trim())}
                    className="px-4 py-3 border-2 border-brown-light rounded-lg text-sm text-brown-dark font-semibold hover:text-brown hover:border-brown transition-colors"
                  >
                    Trim
                  </button>
                </div>
                <div className="flex flex-wrap gap-3 mt-2">
                  {personalizationTokens.map((item) => (
                    <span
                      key={item.token}
                      onClick={() => handleInsertToken(item.token)}
                      className="text-xs text-brown-dark cursor-pointer hover:text-brown hover:underline transition-colors"
                    >
                      {item.label}
                    </span>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-sm font-semibold text-brown-dark mb-2">Email Content *</label>
                <div className="border-2 border-brown-light rounded-lg overflow-hidden">
                  <ReactQuill
                    ref={quillRef}
                    theme="snow"
                    value={compose.content}
                    onChange={(value: string) => {
                      handleComposeChange('content', value)
                      setHasUnsavedChanges(true)
                    }}
                    modules={quillModules}
                    formats={quillFormats}
                    placeholder="Write your email content here..."
                    className="text-brown-dark email-editor"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="border-2 border-brown-light rounded-lg p-4 bg-white">
                  <p className="text-sm text-brown-dark font-semibold mb-2">Email Summary</p>
                  <p className="text-xs text-brown">• Subject: {compose.subject || '(No subject)'}</p>
                  <p className="text-xs text-brown">• Recipients: {getRecipientCount()} customers</p>
                  <p className="text-xs text-brown">• Attachments: {compose.attachments.length}</p>
                  <p className="text-xs text-brown">
                    • Delivery: {compose.schedule.enabled ? `Scheduled for ${new Date(compose.schedule.sendAt).toLocaleString()}` : 'Send immediately'}
                  </p>
                  {compose.abTest.enabled && (
                    <p className="text-xs text-brown-dark font-semibold mt-2">A/B Testing enabled ({compose.abTest.samplePercentage}% sample)</p>
                  )}
                </div>

                <div className="border-2 border-brown-light rounded-lg p-4 bg-white">
                  <p className="text-sm text-brown-dark font-semibold mb-3">Attachments</p>
                  <div className="flex flex-wrap gap-2 mb-3">
                    {compose.attachments.map((attachment) => (
                      <div key={attachment.url} className="flex items-center gap-2 border border-brown-light px-3 py-2 rounded-full text-xs text-brown-dark bg-white">
                        <span>{attachment.name}</span>
                        <button
                          onClick={() => handleRemoveAttachment(attachment)}
                          className="text-red-600 hover:text-red-700 font-bold"
                        >
                          ✕
                        </button>
                      </div>
                    ))}
                    <button
                      onClick={() => fileInputRef.current?.click()}
                      className="px-3 py-2 text-xs border border-brown-light rounded-full text-brown-dark font-semibold hover:text-brown hover:border-brown hover:underline transition-colors"
                    >
                      + Add Attachment
                    </button>
                    <input ref={fileInputRef} type="file" className="hidden" onChange={handleUploadAttachment} />
                  </div>
                  <p className="text-xs text-brown">Supported: PDF, JPG, PNG, WebP (max 5MB each).</p>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="bg-white border-2 border-brown-light rounded-lg p-4">
                  <div className="flex items-center justify-between mb-3">
                    <div>
                      <p className="text-sm font-semibold text-brown-dark">Schedule Send</p>
                      <p className="text-xs text-brown">Choose when this email should be delivered.</p>
                    </div>
                    <label className="flex items-center gap-2 text-sm text-brown-dark">
                      <input
                        type="checkbox"
                        checked={compose.schedule.enabled}
                        onChange={(e) => handleComposeChange('schedule', { ...compose.schedule, enabled: e.target.checked })}
                        className="w-5 h-5 text-brown-dark border-2 border-brown-light rounded"
                      />
                      Enable
                    </label>
                  </div>
                  {compose.schedule.enabled && (
                    <input
                      type="datetime-local"
                      value={compose.schedule.sendAt}
                      onChange={(e) => handleComposeChange('schedule', { ...compose.schedule, sendAt: e.target.value })}
                      className="w-full px-4 py-3 border-2 border-brown-light rounded-lg focus:ring-2 focus:ring-brown-dark focus:border-brown-dark"
                    />
                  )}
                </div>

                <div className="border-2 border-brown-light rounded-lg p-4 bg-white">
                  <div className="flex items-center justify-between mb-3">
                    <div>
                      <p className="text-sm font-semibold text-brown-dark">A/B Testing</p>
                      <p className="text-xs text-brown">Test two subject/content variations before full send.</p>
                    </div>
                    <label className="flex items-center gap-2 text-sm text-brown-dark font-semibold">
                      <input
                        type="checkbox"
                        checked={compose.abTest.enabled}
                        onChange={(e) => handleComposeChange('abTest', { ...compose.abTest, enabled: e.target.checked })}
                        className="w-5 h-5 text-brown-dark border-2 border-brown-light rounded"
                      />
                      Enable
                    </label>
                  </div>
                  {compose.abTest.enabled && (
                    <div className="space-y-3 text-xs text-brown">
                      <div className="flex gap-3">
                        <label className="flex-1">
                          Sample %
                          <input
                            type="number"
                            min={10}
                            max={50}
                            value={compose.abTest.samplePercentage}
                            onChange={(e) => handleComposeChange('abTest', { ...compose.abTest, samplePercentage: Number(e.target.value) })}
                            className="w-full mt-1 px-3 py-2 border-2 border-brown-light rounded-lg text-brown-dark bg-white"
                          />
                        </label>
                        <label className="flex-1">
                          Metric
                          <select
                            value={compose.abTest.metric}
                            onChange={(e) => handleComposeChange('abTest', { ...compose.abTest, metric: e.target.value as Metric })}
                            className="w-full mt-1 px-3 py-2 border-2 border-brown-light rounded-lg text-brown-dark bg-white"
                          >
                            <option value="open">Open Rate</option>
                            <option value="click">Click Rate</option>
                          </select>
                        </label>
                      </div>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                        <label>
                          Variant A Subject
                          <input
                            type="text"
                            value={compose.abTest.variantA.subject}
                            onChange={(e) => handleComposeChange('abTest', {
                              ...compose.abTest,
                              variantA: { ...compose.abTest.variantA, subject: e.target.value },
                            })}
                            className="w-full mt-1 px-3 py-2 border-2 border-brown-light rounded-lg text-brown-dark bg-white"
                          />
                        </label>
                        <label>
                          Variant B Subject
                          <input
                            type="text"
                            value={compose.abTest.variantB.subject}
                            onChange={(e) => handleComposeChange('abTest', {
                              ...compose.abTest,
                              variantB: { ...compose.abTest.variantB, subject: e.target.value },
                            })}
                            className="w-full mt-1 px-3 py-2 border-2 border-brown-light rounded-lg text-brown-dark bg-white"
                          />
                        </label>
                      </div>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                        <label>
                          Variant A Content
                          <textarea
                            value={compose.abTest.variantA.content}
                            onChange={(e) => handleComposeChange('abTest', {
                              ...compose.abTest,
                              variantA: { ...compose.abTest.variantA, content: e.target.value },
                            })}
                            rows={3}
                            className="w-full mt-1 px-3 py-2 border-2 border-brown-light rounded-lg text-brown-dark bg-white"
                          />
                        </label>
                        <label>
                          Variant B Content
                          <textarea
                            value={compose.abTest.variantB.content}
                            onChange={(e) => handleComposeChange('abTest', {
                              ...compose.abTest,
                              variantB: { ...compose.abTest.variantB, content: e.target.value },
                            })}
                            rows={3}
                            className="w-full mt-1 px-3 py-2 border-2 border-brown-light rounded-lg text-brown-dark bg-white"
                          />
                        </label>
                      </div>
                    </div>
                  )}
                </div>
              </div>

              <div className="flex flex-wrap gap-4">
                <button
                  onClick={handleSendEmail}
                  disabled={sending || !compose.subject || !compose.content}
                  className="flex-1 px-6 py-3 border-2 border-brown-dark text-brown-dark rounded-lg hover:text-brown hover:border-brown hover:underline transition-colors disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:no-underline font-semibold disabled:border-brown-light"
                >
                  {sending ? 'Sending...' : compose.schedule.enabled ? 'Schedule Email' : `Send to ${getRecipientCount()} Recipients`}
                </button>
                <button
                  onClick={handleSendTestEmail}
                  disabled={sending}
                  className="px-6 py-3 border-2 border-brown-dark text-brown-dark rounded-lg hover:text-brown hover:border-brown hover:underline transition-colors disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:no-underline font-semibold disabled:border-brown-light"
                >
                  Send Test Email
                </button>
                <button
                  onClick={() => {
                    setCompose(defaultComposeState)
                    setCustomRecipientsInput('')
                    setHasUnsavedChanges(false)
                  }}
                  className="px-6 py-3 border-2 border-brown-light text-brown-dark rounded-lg hover:text-brown hover:border-brown hover:underline transition-colors font-semibold"
                >
                  Reset
                </button>
              </div>
            </div>
          )}

          {activeTab === 'templates' && (
            <div className="space-y-6">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-2xl font-display text-brown-dark">Email Templates</h2>
                  <p className="text-sm text-brown">Choose a template to instantly fill subject and content.</p>
                </div>
                <button
                  onClick={() => setActiveTab('compose')}
                  className="px-0 py-2 text-sm text-gray-600 font-semibold hover:text-gray-900 hover:underline transition-colors"
                >
                  Back to Compose
                </button>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {templates.map((template) => (
                  <div key={template.id} className="border-2 border-brown-light rounded-xl p-5 bg-white">
                    <div className="flex items-center justify-between mb-3">
                      <h3 className="text-lg font-semibold text-brown-dark">{template.name}</h3>
                      <span className="text-xs px-2 py-1 bg-white border border-brown-light rounded-full text-brown-dark">
                        {template.category}
                      </span>
                    </div>
                    <p className="text-sm text-brown-dark mb-3 font-semibold">Subject: <span className="font-normal text-brown">{template.subject}</span></p>
                    <div className="bg-white border border-brown-light rounded-lg p-3 text-xs text-brown h-32 overflow-auto" dangerouslySetInnerHTML={{ __html: template.content }} />
                    <div className="flex gap-2 mt-4">
                      <button
                        onClick={() => handleApplyTemplate(template)}
                        className="flex-1 px-4 py-2 border-2 border-brown-dark text-brown-dark rounded-lg hover:text-brown hover:border-brown hover:underline transition-colors font-semibold"
                      >
                        Use Template
                      </button>
                      <button
                        onClick={() => {
                          setCompose({
                            ...compose,
                            subject: template.subject,
                            content: template.content,
                            selectedTemplateId: template.id,
                          })
                          setActiveTab('preview')
                        }}
                        className="px-4 py-2 border-2 border-brown-light rounded-lg text-brown-dark hover:text-brown hover:border-brown hover:underline transition-colors font-semibold"
                      >
                        Preview
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {activeTab === 'preview' && (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <div className="border-2 border-brown-light rounded-xl overflow-hidden bg-white">
                <div className="border-b-2 border-brown-light px-4 py-2 text-sm text-brown-dark font-semibold">Desktop Preview</div>
                <div className="p-6 bg-white text-brown">
                  <p className="text-sm text-brown mb-2 font-semibold">Subject: {replaceTokensForPreview(compose.subject) || '(No subject)'}</p>
                  <div dangerouslySetInnerHTML={{ __html: previewHtml || '<p>(No content)</p>' }} />
                </div>
              </div>
              <div className="border-2 border-brown-light rounded-xl overflow-hidden max-w-sm mx-auto bg-white">
                <div className="border-b-2 border-brown-light px-4 py-2 text-sm text-brown-dark font-semibold">Mobile Preview</div>
                <div className="p-4 bg-white text-brown text-sm" dangerouslySetInnerHTML={{ __html: previewHtml || '<p>(No content)</p>' }} />
              </div>
              <div className="lg:col-span-2 border-2 border-brown-light rounded-lg p-4 text-sm bg-white">
                <p className="font-semibold text-brown-dark">Preview Data</p>
                <p className="text-brown">Name: {previewSubscriber.name}</p>
                <p className="text-brown">Email: {previewSubscriber.email}</p>
                <p className="text-brown">Last Visit: {previewSubscriber.lastBookingDate ? new Date(previewSubscriber.lastBookingDate).toLocaleDateString() : 'Not yet'}</p>
                <p className="text-brown">Next Appointment: {previewSubscriber.nextBookingDate ? new Date(previewSubscriber.nextBookingDate).toLocaleString() : 'Not scheduled'}</p>
              </div>
            </div>
          )}

          {activeTab === 'analytics' && (
            <div className="space-y-6">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="border-2 border-brown-light rounded-lg p-5 bg-white">
                  <p className="text-xs text-brown uppercase tracking-wide font-semibold">Total Emails Sent</p>
                  <p className="text-2xl font-bold text-brown-dark mt-2">{analytics.totalSent}</p>
                </div>
                <div className="border-2 border-brown-light rounded-lg p-5 bg-white">
                  <p className="text-xs text-brown uppercase tracking-wide font-semibold">Average Open Rate</p>
                  <p className="text-2xl font-bold text-brown-dark mt-2">{analytics.averageOpenRate.toFixed(1)}%</p>
                </div>
                <div className="border-2 border-brown-light rounded-lg p-5 bg-white">
                  <p className="text-xs text-brown uppercase tracking-wide font-semibold">Average Click Rate</p>
                  <p className="text-2xl font-bold text-brown-dark mt-2">{analytics.averageClickRate.toFixed(1)}%</p>
                </div>
              </div>

              {analytics.bestCampaign && (
                <div className="border-2 border-brown-light rounded-lg p-5 bg-white">
                  <p className="text-sm text-brown-dark font-semibold">Best Performing Campaign</p>
                  <p className="text-lg text-brown-dark font-semibold mt-2">{analytics.bestCampaign.subject}</p>
                  <p className="text-xs text-brown">Open Rate: {((analytics.bestCampaign.opened / analytics.bestCampaign.totalRecipients) * 100).toFixed(1)}% | Click Rate: {((analytics.bestCampaign.clicked / analytics.bestCampaign.totalRecipients) * 100).toFixed(1)}%</p>
                </div>
              )}

              <div>
                <h3 className="text-lg font-semibold text-brown-dark mb-3">Recent Campaigns</h3>
                <div className="space-y-3">
                  {analytics.recentCampaigns.map((campaign) => (
                    <div key={campaign.id} className="border-2 border-brown-light rounded-lg p-4 bg-white">
                      <div className="flex items-center justify-between">
                        <p className="text-sm text-brown-dark font-semibold">{campaign.subject}</p>
                        <span className="text-xs text-brown">{new Date(campaign.sentAt || campaign.createdAt).toLocaleString()}</span>
                      </div>
                      <div className="grid grid-cols-3 gap-3 text-xs text-brown mt-3">
                        <div>
                          <p className="text-brown-dark font-semibold">Sent</p>
                          <p>{campaign.totalRecipients}</p>
                        </div>
                        <div>
                          <p className="text-brown-dark font-semibold">Opened</p>
                          <p>{campaign.opened} ({((campaign.opened / campaign.totalRecipients) * 100 || 0).toFixed(1)}%)</p>
                        </div>
                        <div>
                          <p className="text-brown-dark font-semibold">Clicked</p>
                          <p>{campaign.clicked} ({((campaign.clicked / campaign.totalRecipients) * 100 || 0).toFixed(1)}%)</p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {activeTab === 'campaigns' && (
            <div className="space-y-6">
              <div className="flex items-center justify-between">
                <h2 className="text-2xl font-display text-brown-dark">Campaign History</h2>
                <div className="flex gap-2">
                  <button
                    onClick={handleProcessScheduled}
                    className="px-0 py-2 text-sm text-gray-600 font-semibold hover:text-gray-900 hover:underline transition-colors"
                  >
                    Process Scheduled Now
                  </button>
                  <button
                    onClick={() => loadAllData()}
                    className="px-0 py-2 text-sm text-gray-600 font-semibold hover:text-gray-900 hover:underline transition-colors"
                  >
                    Refresh
                  </button>
                </div>
              </div>

              {scheduledEmails.length > 0 && (
                <div className="border-2 border-brown-light rounded-lg p-4 bg-white">
                  <div className="flex items-center justify-between mb-3">
                    <p className="text-sm font-semibold text-brown-dark">Scheduled Emails ({scheduledEmails.length})</p>
                    <button
                      onClick={handleProcessScheduled}
                      className="px-3 py-2 text-xs border-2 border-brown-dark text-brown-dark rounded-lg hover:text-brown hover:border-brown hover:underline transition-colors font-semibold"
                    >
                      Send Due Now
                    </button>
                  </div>
                  <div className="space-y-3">
                    {scheduledEmails.map((entry) => (
                      <div key={entry.id} className="border border-brown-light rounded-lg p-3 text-xs text-brown bg-white">
                        <div className="flex items-center justify-between">
                          <p className="font-semibold text-brown-dark">{entry.subject}</p>
                          <p className="text-brown">{new Date(entry.schedule.sendAt).toLocaleString()}</p>
                        </div>
                        <p className="text-brown">Recipients: {entry.recipients.length}</p>
                        {entry.abTest?.enabled && <p className="text-brown">A/B Test Enabled ({entry.abTest.samplePercentage}% sample)</p>}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {campaigns.length === 0 ? (
                <div className="text-center text-brown py-8">No email campaigns yet. Compose your first email!</div>
              ) : (
                <div className="space-y-4">
                  {campaigns
                    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
                    .map((campaign) => (
                      <div key={campaign.id} className="border-2 border-brown-light rounded-lg p-6 bg-white">
                        <div className="flex items-center justify-between">
                          <div>
                            <p className="text-lg text-brown-dark font-semibold">{campaign.subject}</p>
                            <p className="text-xs text-brown">{campaign.sentAt ? `Sent: ${new Date(campaign.sentAt).toLocaleString()}` : 'Scheduled'}</p>
                          </div>
                          <div className="text-right text-xs text-brown">
                            <p><span className="font-semibold text-brown-dark">Sent:</span> {campaign.totalRecipients}</p>
                            <p><span className="font-semibold text-brown-dark">Opens:</span> {campaign.opened}</p>
                            <p><span className="font-semibold text-brown-dark">Clicks:</span> {campaign.clicked}</p>
                          </div>
                        </div>
                        <div className="mt-4 border border-brown-light rounded-lg p-4 text-xs text-brown whitespace-pre-wrap bg-white">
                          {campaign.content.substring(0, 200)}{campaign.content.length > 200 ? '...' : ''}
                        </div>
                      </div>
                    ))}
                </div>
              )}
            </div>
          )}

          {activeTab === 'customers' && (
            <div className="space-y-6">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-2xl font-display text-brown-dark">Subscribers</h2>
                  <p className="text-sm text-brown">Manage your email audience.</p>
                </div>
                <div className="flex gap-2">
                    <button
                      onClick={handleExportCustomers}
                      className="px-0 py-2 text-sm text-gray-600 font-semibold hover:text-gray-900 hover:underline transition-colors"
                    >
                      Export CSV
                    </button>
                    <label className="px-0 py-2 text-sm border-2 border-brown-light rounded-lg text-brown-dark hover:text-brown hover:border-brown hover:underline transition-colors cursor-pointer font-semibold inline-block">
                      Import CSV
                      <input type="file" accept=".csv" onChange={handleImportCustomers} className="hidden" />
                    </label>
                </div>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b-2 border-brown-light">
                      <th className="text-left py-3 px-4 text-brown-dark font-semibold">Email</th>
                      <th className="text-left py-3 px-4 text-brown-dark font-semibold">Name</th>
                      <th className="text-left py-3 px-4 text-brown-dark font-semibold">Bookings</th>
                      <th className="text-left py-3 px-4 text-brown-dark font-semibold">Last Booking</th>
                      <th className="text-left py-3 px-4 text-brown-dark font-semibold">Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {customers.map((customer) => (
                      <tr key={customer.email} className="border-b border-brown-light/30 hover:bg-white">
                        <td className="py-3 px-4 text-brown-dark font-medium">{customer.email}</td>
                        <td className="py-3 px-4 text-brown-dark">{customer.name}</td>
                        <td className="py-3 px-4 text-brown-dark font-semibold">{customer.totalBookings}</td>
                        <td className="py-3 px-4 text-brown-dark">{customer.lastBookingDate ? new Date(customer.lastBookingDate).toLocaleDateString() : '—'}</td>
                        <td className="py-3 px-4">
                          {customer.unsubscribed ? (
                            <span className="inline-flex items-center gap-2">
                              <span className="px-2 py-1 border border-red-600 text-red-700 rounded-full text-xs font-semibold bg-white">Unsubscribed</span>
                              <button
                                onClick={() => handleResubscribe(customer.email)}
                                className="text-xs text-brown-dark underline hover:text-brown font-semibold"
                              >
                                Resubscribe
                              </button>
                            </span>
                          ) : (
                            <span className="px-2 py-1 border border-green-600 text-green-700 rounded-full text-xs font-semibold bg-white">Active</span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {activeTab === 'unsubscribes' && (
            <div className="space-y-6">
              <h2 className="text-2xl font-display text-brown-dark">Unsubscribe List</h2>
              {unsubscribes.filter((record) => record.unsubscribedAt).length === 0 ? (
                <p className="text-brown">No unsubscribed contacts.</p>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b-2 border-brown-light">
                        <th className="text-left py-3 px-4 text-brown-dark font-semibold">Email</th>
                        <th className="text-left py-3 px-4 text-brown-dark font-semibold">Name</th>
                        <th className="text-left py-3 px-4 text-brown-dark font-semibold">Unsubscribed At</th>
                        <th className="text-left py-3 px-4 text-brown-dark font-semibold">Action</th>
                      </tr>
                    </thead>
                    <tbody>
                      {unsubscribes
                        .filter((record) => record.unsubscribedAt)
                        .map((record) => (
                          <tr key={record.token} className="border-b border-brown-light/30 hover:bg-white">
                            <td className="py-3 px-4 text-brown-dark font-medium">{record.email}</td>
                            <td className="py-3 px-4 text-brown-dark">{record.name || '—'}</td>
                            <td className="py-3 px-4 text-brown-dark">{new Date(record.unsubscribedAt).toLocaleString()}</td>
                            <td className="py-3 px-4 text-brown-dark">
                              <button
                                onClick={() => handleResubscribe(record.email)}
                                className="text-xs text-brown-dark underline hover:text-brown font-semibold"
                              >
                                Resubscribe
                              </button>
                            </td>
                          </tr>
                        ))}
                    </tbody>
                  </table>
                </div>
              )}
              <p className="text-xs text-brown">Every email automatically includes a personalized unsubscribe link to respect client preferences.</p>
            </div>
          )}

          {activeTab === 'automation' && (
            <div className="space-y-6">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-2xl font-display text-brown-dark">Automated Drip Campaigns</h2>
                  <p className="text-sm text-brown">Send timely sequences automatically based on client behavior.</p>
                </div>
                <button
                  onClick={handleSaveDrips}
                  disabled={savingDrips}
                  className="px-0 py-2 text-sm text-gray-600 font-semibold hover:text-gray-900 hover:underline transition-colors disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:no-underline"
                >
                  {savingDrips ? 'Saving...' : 'Save Automations'}
                </button>
              </div>

              <div className="space-y-4">
                {dripCampaigns.map((campaign, index) => (
                  <div key={campaign.id} className="border-2 border-brown-light rounded-lg p-5 bg-white">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-lg font-semibold text-brown-dark">{campaign.name}</p>
                        <p className="text-xs text-brown">Trigger: {campaign.trigger}</p>
                      </div>
                      <label className="flex items-center gap-2 text-sm text-brown-dark font-semibold">
                        <input
                          type="checkbox"
                          checked={campaign.enabled}
                          onChange={(e) => {
                            const newCampaigns = [...dripCampaigns]
                            newCampaigns[index] = { ...campaign, enabled: e.target.checked }
                            setDripCampaigns(newCampaigns)
                          }}
                          className="w-5 h-5 border-2 border-brown-light rounded text-brown-dark"
                        />
                        Enabled
                      </label>
                    </div>
                    <div className="mt-4 space-y-3 text-xs text-brown">
                      {campaign.emails
                        .slice()
                        .sort((a, b) => a.dayOffset - b.dayOffset)
                        .map((step, stepIndex) => (
                          <div key={`${campaign.id}-step-${stepIndex}`} className="border border-brown-light rounded-lg p-3 bg-white">
                            <p className="text-brown-dark font-semibold">Day {step.dayOffset}: {step.subject}</p>
                            <div className="mt-2 border border-brown-light rounded-lg p-2 whitespace-pre-wrap bg-white">
                              {step.content}
                            </div>
                          </div>
                        ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      <UnsavedChangesDialog
        isOpen={showUnsavedDialog}
        onSave={handleSendEmail}
        onLeave={handleLeaveWithoutSaving}
        onCancel={handleCancelUnsaved}
        saving={sending}
      />

      <style jsx global>{`
        .email-editor .ql-toolbar {
          background: white !important;
          border-color: var(--color-primary-light);
        }
        .email-editor .ql-container {
          background: white !important;
          border-color: var(--color-primary-light);
        }
        .email-editor .ql-toolbar button {
          background: white !important;
          border: none !important;
          box-shadow: none !important;
        }
        .email-editor .ql-toolbar button:hover,
        .email-editor .ql-toolbar button:focus,
        .email-editor .ql-toolbar button.ql-active {
          background: white !important;
          border: none !important;
          box-shadow: none !important;
          color: #333 !important;
        }
        .email-editor .ql-toolbar .ql-stroke {
          stroke: #333 !important;
        }
        .email-editor .ql-toolbar .ql-fill {
          fill: #333 !important;
        }
        .email-editor .ql-toolbar button:hover .ql-stroke,
        .email-editor .ql-toolbar button.ql-active .ql-stroke {
          stroke: #000 !important;
        }
        .email-editor .ql-toolbar button:hover .ql-fill,
        .email-editor .ql-toolbar button.ql-active .ql-fill {
          fill: #000 !important;
        }
        .email-editor .ql-toolbar .ql-picker-label {
          background: white !important;
          border: none !important;
          color: #333 !important;
        }
        .email-editor .ql-toolbar .ql-picker-label:hover {
          background: white !important;
          color: #000 !important;
        }
        .email-editor .ql-toolbar .ql-picker-options {
          background: white !important;
          border: 1px solid #ddd !important;
          box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1) !important;
        }
        .email-editor .ql-toolbar .ql-picker-item {
          background: white !important;
          color: #333 !important;
        }
        .email-editor .ql-toolbar .ql-picker-item:hover {
          background: #f5f5f5 !important;
          color: #000 !important;
        }
        .email-editor .ql-toolbar .ql-picker-item.ql-selected {
          background: #f0f0f0 !important;
          color: #000 !important;
        }
      `}</style>
    </div>
  )
}

