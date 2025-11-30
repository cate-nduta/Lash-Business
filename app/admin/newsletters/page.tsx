'use client'

import { useEffect, useMemo, useState, ReactNode } from 'react'
import Link from 'next/link'
import Toast from '@/components/Toast'
import {
  DEFAULT_NEWSLETTER_BLOCKS,
  NEWSLETTER_TEMPLATES,
  NEWSLETTER_THEMES,
  NewsletterBlock,
  NewsletterButtonBlock,
  NewsletterDividerBlock,
  NewsletterHeroBlock,
  NewsletterHighlightBlock,
  NewsletterImageBlock,
  NewsletterRecord,
  NewsletterSpacerBlock,
  NewsletterTemplate,
  NewsletterTextBlock,
} from '@/types/newsletter'
import { useRouter } from 'next/navigation'
import { DragDropContext, Droppable, Draggable, DropResult, DroppableProps } from '@hello-pangea/dnd'

type Tab = 'builder' | 'send'

type BuilderDraft = {
  id?: string
  title: string
  subject: string
  preheader: string
  description: string
  themeId: string
  blocks: NewsletterBlock[]
}

const createId = () =>
  typeof crypto !== 'undefined' && 'randomUUID' in crypto
    ? crypto.randomUUID()
    : `block-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`

const hydrateBlocks = (blocks: Array<NewsletterBlock | Omit<NewsletterBlock, 'id'>>): NewsletterBlock[] =>
  (blocks || []).map((block) => ({
    ...block,
    id: 'id' in block && block.id ? block.id : createId(),
  } as NewsletterBlock))

const createBlankDraft = (): BuilderDraft => ({
  title: 'Untitled Newsletter',
  subject: '',
  preheader: '',
  description: '',
  themeId: NEWSLETTER_THEMES[0].id,
  blocks: hydrateBlocks(DEFAULT_NEWSLETTER_BLOCKS),
})

const BLOCK_LIBRARY: Array<{
  type: NewsletterBlock['type']
  label: string
  hint: string
}> = [
  { type: 'hero', label: 'Hero', hint: 'Headline + subtext + CTA' },
  { type: 'text', label: 'Text', hint: 'Paragraph or bullet list' },
  { type: 'image', label: 'Image', hint: 'Full bleed visual' },
  { type: 'highlight', label: 'Highlight', hint: 'Testimonial or feature' },
  { type: 'button', label: 'Button', hint: 'Standalone CTA' },
  { type: 'divider', label: 'Divider', hint: 'Visual break' },
  { type: 'spacer', label: 'Spacer', hint: 'Custom spacing' },
]

const cloneTemplateBlocks = (template: NewsletterTemplate): NewsletterBlock[] => (
  template.blocks || []
).map((block) => ({
  ...block,
  id: createId(),
} as NewsletterBlock))

type StrictDroppableProps = DroppableProps

const StrictModeDroppable = ({ children, ...droppableProps }: StrictDroppableProps) => {
  const [enabled, setEnabled] = useState(false)

  useEffect(() => {
    const animation = requestAnimationFrame(() => setEnabled(true))
    return () => {
      cancelAnimationFrame(animation)
      setEnabled(false)
    }
  }, [])

  if (!enabled) {
    return null
  }

  return <Droppable {...droppableProps}>{children}</Droppable>
}

export default function AdminNewsletters() {
  const router = useRouter()
  const [activeTab, setActiveTab] = useState<Tab>('builder')
  const [newsletters, setNewsletters] = useState<NewsletterRecord[]>([])
  const [loading, setLoading] = useState(true)
  const [sending, setSending] = useState(false)
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null)
  const [draft, setDraft] = useState<BuilderDraft>(() => createBlankDraft())
  const [selectedBlockId, setSelectedBlockId] = useState<string | null>(null)
  const [selectedNewsletterId, setSelectedNewsletterId] = useState('')
  const [subjectToSend, setSubjectToSend] = useState('')
  const [recipientType, setRecipientType] = useState<'all' | 'first-time' | 'returning' | 'custom'>('all')
  const [customRecipients, setCustomRecipients] = useState('')
  const [previewHtml, setPreviewHtml] = useState('')
  const [previewLoading, setPreviewLoading] = useState(false)
  const [previewError, setPreviewError] = useState<string | null>(null)

  useEffect(() => {
    const verifyAuthAndLoad = async () => {
      const authRes = await fetch('/api/admin/current-user')
      const authData = await authRes.json()
      if (!authData.authenticated) {
        router.push('/admin/login')
        return
      }
      await loadNewsletters()
    }

    verifyAuthAndLoad()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const loadNewsletters = async () => {
    try {
      setLoading(true)
      const response = await fetch('/api/admin/newsletters')
      if (!response.ok) throw new Error('Failed to load newsletters')
      const data = await response.json()
      setNewsletters(data.newsletters || [])
    } catch (error: any) {
      setMessage({ type: 'error', text: error.message || 'Failed to load newsletters' })
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (!selectedNewsletterId) return
    const selected = newsletters.find((n) => n.id === selectedNewsletterId)
    if (selected) {
      setSubjectToSend(selected.subject || selected.title || '')
    }
  }, [selectedNewsletterId, newsletters])

  const serializedBlocks = useMemo(() => JSON.stringify(draft.blocks), [draft.blocks])

  useEffect(() => {
    if (!draft.blocks.length) {
      setPreviewHtml('')
      setPreviewLoading(false)
      setPreviewError(null)
      return
    }

    let cancelled = false
    const controller = new AbortController()

    const fetchPreview = async () => {
      setPreviewLoading(true)
      setPreviewError(null)
      try {
        const response = await fetch('/api/admin/newsletters/render', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            themeId: draft.themeId,
            blocks: draft.blocks,
          }),
          signal: controller.signal,
        })
        
        // Check if request was aborted before processing
        if (cancelled || controller.signal.aborted) {
          return
        }
        
        const data = await response.json()
        if (!response.ok) {
          throw new Error(data.error || 'Failed to generate preview')
        }
        if (!cancelled) {
          setPreviewHtml(data.html || '')
        }
      } catch (error: any) {
        // Silently ignore abort errors - they're expected during cleanup
        if (error?.name === 'AbortError' || error?.message?.includes('aborted')) {
          return
        }
        if (!cancelled) {
          setPreviewError(error.message || 'Failed to generate preview')
        }
      } finally {
        if (!cancelled) {
          setPreviewLoading(false)
        }
      }
    }

    fetchPreview().catch((error) => {
      // Catch any unhandled promise rejections from abort
      if (error?.name !== 'AbortError' && !error?.message?.includes('aborted')) {
        if (!cancelled) {
          setPreviewError(error.message || 'Failed to generate preview')
          setPreviewLoading(false)
        }
      }
    })

    return () => {
      cancelled = true
      // Abort quietly; ignore any errors the environment might throw
      try {
        if (!controller.signal.aborted) {
          controller.abort()
        }
      } catch (error) {
        console.warn('Controller abort failed (safe to ignore):', error)
      }
    }
  }, [draft.themeId, serializedBlocks])

  const handleAddBlock = (type: NewsletterBlock['type']) => {
    try {
      console.log('Adding block type:', type)
      const newBlock = createBlockByType(type)
      console.log('Created block:', newBlock)
      if (!newBlock || !newBlock.id) {
        console.error('Failed to create block:', type)
        setMessage({ type: 'error', text: `Failed to create ${type} block` })
        return
      }
      setDraft((prev) => ({
        ...prev,
        blocks: [...prev.blocks, newBlock],
      }))
      setSelectedBlockId(newBlock.id)
      setMessage({ type: 'success', text: `Added ${blockLabel(type)} block` })
    } catch (error: any) {
      console.error('Error adding block:', error)
      setMessage({ type: 'error', text: error.message || 'Failed to add block' })
    }
  }

  const handleBlockChange = (blockId: string, updates: Record<string, any>) => {
    setDraft((prev) => ({
      ...prev,
      blocks: prev.blocks.map((block) => (block.id === blockId ? { ...block, ...updates } : block)),
    }))
  }

  const handleDuplicateBlock = (blockId: string) => {
    setDraft((prev) => {
      const index = prev.blocks.findIndex((block) => block.id === blockId)
      if (index === -1) return prev
      const clone = { ...prev.blocks[index], id: createId() }
      const blocks = [...prev.blocks]
      blocks.splice(index + 1, 0, clone)
      return { ...prev, blocks }
    })
  }

  const handleDeleteBlock = (blockId: string) => {
    setDraft((prev) => ({
      ...prev,
      blocks: prev.blocks.filter((block) => block.id !== blockId),
    }))
    if (selectedBlockId === blockId) {
      setSelectedBlockId(null)
    }
  }

  const handleDragEnd = (result: DropResult) => {
    if (!result.destination) return
    const items = Array.from(draft.blocks)
    const [removed] = items.splice(result.source.index, 1)
    items.splice(result.destination.index, 0, removed)
    setDraft((prev) => ({ ...prev, blocks: items }))
  }

  const handleTemplateApply = (template: NewsletterTemplate) => {
    setDraft((prev) => ({
      ...prev,
      themeId: template.themeId,
      blocks: cloneTemplateBlocks(template),
    }))
    setSelectedBlockId(null)
  }

  const handleUploadAsset = async (blockId: string, file: File, field: 'imageUrl') => {
    const formData = new FormData()
    formData.append('asset', file)
    const response = await fetch('/api/admin/newsletters/upload', {
      method: 'POST',
      body: formData,
    })
    const data = await response.json()
    if (!response.ok) {
      throw new Error(data.error || 'Failed to upload image')
    }
    handleBlockChange(blockId, { [field]: data.url })
  }

  const handleResetDraft = () => {
    setDraft(createBlankDraft())
    setSelectedBlockId(null)
  }

  const handleEditNewsletter = (newsletter: NewsletterRecord) => {
    setDraft({
      id: newsletter.id,
      title: newsletter.title,
      subject: newsletter.subject || '',
      preheader: newsletter.preheader || '',
      description: newsletter.description || '',
      themeId: newsletter.themeId || NEWSLETTER_THEMES[0].id,
      blocks: newsletter.blocks ? hydrateBlocks(newsletter.blocks) : hydrateBlocks(DEFAULT_NEWSLETTER_BLOCKS),
    })
    setSelectedBlockId(null)
    setActiveTab('builder')
    setMessage({ type: 'success', text: `Loaded "${newsletter.title}" into the builder` })
  }

  const handleSaveDraft = async () => {
    if (!draft.title.trim()) {
      setMessage({ type: 'error', text: 'Give this newsletter a title before saving.' })
      return
    }
    if (!draft.blocks.length) {
      setMessage({ type: 'error', text: 'Add at least one block before saving.' })
      return
    }

    setSaving(true)
    setMessage(null)

    try {
      const payload = {
        title: draft.title.trim(),
        subject: draft.subject.trim(),
        preheader: draft.preheader.trim(),
        description: draft.description.trim(),
        themeId: draft.themeId,
        blocks: draft.blocks,
      }

      const endpoint = draft.id ? `/api/admin/newsletters/${draft.id}` : '/api/admin/newsletters'
      const method = draft.id ? 'PUT' : 'POST'

      const response = await fetch(endpoint, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })

      const data = await response.json()
      if (!response.ok) {
        throw new Error(data.error || 'Failed to save newsletter')
      }

      setMessage({ type: 'success', text: draft.id ? 'Newsletter updated!' : 'Newsletter saved!' })
      if (data.newsletter?.id) {
        setDraft((prev) => ({ ...prev, id: data.newsletter.id }))
      }
      await loadNewsletters()
    } catch (error: any) {
      setMessage({ type: 'error', text: error.message || 'Failed to save newsletter' })
    } finally {
      setSaving(false)
    }
  }

  const handleDeleteNewsletter = async (id: string) => {
    if (!confirm('Delete this newsletter? This action cannot be undone.')) return
    try {
      const response = await fetch(`/api/admin/newsletters/${id}`, { method: 'DELETE' })
      const data = await response.json()
      if (!response.ok) {
        throw new Error(data.error || 'Failed to delete newsletter')
      }
      setMessage({ type: 'success', text: 'Newsletter deleted.' })
      await loadNewsletters()
      if (draft.id === id) {
        handleResetDraft()
      }
    } catch (error: any) {
      setMessage({ type: 'error', text: error.message || 'Failed to delete newsletter' })
    }
  }

  const handleSend = async () => {
    if (!selectedNewsletterId || !subjectToSend.trim()) {
      setMessage({ type: 'error', text: 'Select a newsletter and subject line.' })
      return
    }

    if (recipientType === 'custom' && !customRecipients.trim()) {
      setMessage({ type: 'error', text: 'Add at least one custom recipient.' })
      return
    }

    setSending(true)
    setMessage(null)

    try {
      const parsedCustomRecipients =
        recipientType === 'custom'
          ? customRecipients
              .split(/\n|,/)
              .map((line) => line.trim())
              .filter(Boolean)
              .map((line) => {
                const [email, ...nameParts] = line.split('|').map((part) => part.trim())
                return { email: email.toLowerCase(), name: nameParts.join(' ') || 'Beautiful Soul' }
              })
          : undefined

      const response = await fetch('/api/admin/newsletters/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          newsletterId: selectedNewsletterId,
          subject: subjectToSend.trim(),
          recipientType,
          customRecipients: parsedCustomRecipients,
        }),
      })

      const data = await response.json()
      if (!response.ok) {
        throw new Error(data.error || 'Failed to send newsletter')
      }

      setMessage({ type: 'success', text: `Sent to ${data.recipientsCount} recipients.` })
      setSelectedNewsletterId('')
      setSubjectToSend('')
      setCustomRecipients('')
      setRecipientType('all')
      await loadNewsletters()
    } catch (error: any) {
      setMessage({ type: 'error', text: error.message || 'Failed to send newsletter' })
    } finally {
      setSending(false)
    }
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
          <Link href="/admin/dashboard" className="text-brown hover:text-brown-dark">
            ← Back to Dashboard
          </Link>
        </div>

        {message && <Toast message={message.text} type={message.type} onClose={() => setMessage(null)} />}

        <div className="bg-white rounded-lg shadow-lg p-6 md:p-8">
          <div className="flex flex-wrap gap-4 border-b border-brown-light pb-4 mb-6">
            {(['builder', 'send'] as Tab[]).map((tab) => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={`px-5 py-3 text-lg font-semibold rounded-t-lg border-b-2 transition-colors ${
                  activeTab === tab
                    ? 'text-brown-dark border-brown-dark bg-brown-light/20'
                    : 'text-brown hover:text-brown-dark border-transparent hover:border-brown-light hover:bg-brown-light/10'
                }`}
              >
                {tab === 'builder' ? 'Design & Save' : 'Send Newsletter'}
              </button>
            ))}
          </div>

          {activeTab === 'builder' && (
            <div className="space-y-8">
              <BuilderHeader
                draft={draft}
                onChange={(updates) => setDraft((prev) => ({ ...prev, ...updates }))}
                onReset={handleResetDraft}
                onSave={handleSaveDraft}
                saving={saving}
              />

              <div className="grid gap-6 lg:grid-cols-[260px_minmax(0,1fr)_320px]">
                <BuilderSidebar
                  onAddBlock={handleAddBlock}
                  onApplyTemplate={handleTemplateApply}
                  newsletters={newsletters}
                  onEditNewsletter={handleEditNewsletter}
                  onDeleteNewsletter={handleDeleteNewsletter}
                />

                <div className="space-y-4">
                  <DragDropContext onDragEnd={handleDragEnd}>
                    <StrictModeDroppable droppableId="blocks">
                      {(provided, snapshot) => (
                        <div ref={provided.innerRef} {...provided.droppableProps} className="space-y-4">
                          {draft.blocks.map((block, index) => (
                            <Draggable key={block.id} draggableId={block.id} index={index}>
                              {(dragProvided) => (
                                <div
                                  ref={dragProvided.innerRef}
                                  {...dragProvided.draggableProps}
                                  className={`rounded-2xl border transition-shadow ${
                                    selectedBlockId === block.id
                                      ? 'border-brown-dark shadow-lg'
                                      : 'border-brown-light hover:border-brown-dark/40 hover:shadow-md'
                                  }`}
                                >
                                  <div className="flex items-center justify-between border-b border-brown-light px-4 py-3">
                                    <div className="flex items-center gap-3">
                                      <div
                                        {...dragProvided.dragHandleProps}
                                        className="cursor-grab text-brown-dark font-semibold text-sm uppercase tracking-wider"
                                      >
                                        ::
                                      </div>
                                      <div>
                                        <p className="text-sm font-semibold text-brown-dark">
                                          {blockLabel(block.type)}
                                        </p>
                                        <p className="text-xs text-brown">
                                          {index + 1 < 10 ? `0${index + 1}` : index + 1}
                                        </p>
                                      </div>
                                    </div>
                                    <div className="flex items-center gap-2 text-xs">
                                      <button
                                        onClick={() => handleDuplicateBlock(block.id)}
                                        className="px-3 py-1 border border-brown-light rounded-full hover:border-brown-dark"
                                      >
                                        Duplicate
                                      </button>
                                      <button
                                        onClick={() => handleDeleteBlock(block.id)}
                                        className="px-3 py-1 border border-red-200 text-red-600 rounded-full hover:border-red-400"
                                      >
                                        Delete
                                      </button>
                                    </div>
                                  </div>
                                  <div className="p-4 space-y-3">
                                    <BlockEditor
                                      block={block}
                                      onChange={(updates) => handleBlockChange(block.id, updates)}
                                      onUpload={(file) => handleUploadAsset(block.id, file, 'imageUrl')}
                                    />
                                  </div>
                                </div>
                              )}
                            </Draggable>
                          ))}
                          {provided.placeholder}
                        </div>
                      )}
                    </StrictModeDroppable>
                  </DragDropContext>

                  <button
                    onClick={() => handleAddBlock('text')}
                    className="w-full border-2 border-dashed border-brown-light rounded-2xl py-4 text-brown-dark font-semibold hover:border-brown-dark/60"
                  >
                    + Add text block
                  </button>

                  <div className="rounded-2xl border border-brown-light overflow-hidden">
                    <div className="border-b border-brown-light bg-brown-light/30 px-4 py-2 text-sm font-semibold text-brown-dark">
                      Live Preview
                    </div>
                    <div className="bg-baby-pink-light px-2 py-4 md:px-6 min-h-[320px]">
                      <div className="bg-white rounded-2xl shadow-inner overflow-hidden min-h-[280px] flex items-center justify-center">
                        {previewLoading ? (
                          <div className="text-brown text-sm">Generating preview…</div>
                        ) : previewError ? (
                          <div className="text-red-600 text-sm px-4 text-center">{previewError}</div>
                        ) : previewHtml ? (
                          <div
                            className="w-full overflow-auto"
                            dangerouslySetInnerHTML={{
                              __html: `<table width="100%" cellpadding="0" cellspacing="0" role="presentation">${previewHtml}</table>`,
                            }}
                          />
                        ) : (
                          <div className="text-brown text-sm px-4 text-center">
                            Add blocks to see your newsletter preview.
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                </div>

                <ThemePanel
                  draft={draft}
                  onChange={(updates) => setDraft((prev) => ({ ...prev, ...updates }))}
                />
              </div>
            </div>
          )}

          {activeTab === 'send' && (
            <SendPanel
              newsletters={newsletters}
              selectedNewsletterId={selectedNewsletterId}
              setSelectedNewsletterId={setSelectedNewsletterId}
              subject={subjectToSend}
              setSubject={setSubjectToSend}
              recipientType={recipientType}
              setRecipientType={setRecipientType}
              customRecipients={customRecipients}
              setCustomRecipients={setCustomRecipients}
              onSend={handleSend}
              sending={sending}
            />
          )}
        </div>
      </div>
    </div>
  )
}

function blockLabel(type: NewsletterBlock['type']) {
  const block = BLOCK_LIBRARY.find((b) => b.type === type)
  return block ? block.label : type
}

function createBlockByType(type: NewsletterBlock['type']): NewsletterBlock {
  const baseId = createId()
  
  switch (type) {
    case 'hero': {
      const heroBlock: NewsletterHeroBlock = {
        id: baseId,
        type: 'hero',
        eyebrow: 'Feature',
        heading: 'Add your headline',
        subheading: 'A short supporting sentence appears here.',
        alignment: 'center',
        button: { label: 'Book Now', url: 'https://your.booking.link', style: 'solid' },
      }
      return heroBlock
    }
    case 'image': {
      const imageBlock: NewsletterImageBlock = {
        id: baseId,
        type: 'image',
        imageUrl: 'https://via.placeholder.com/600x400?text=Upload+Image',
        caption: '',
        fullWidth: true,
        borderRadius: 18,
      }
      return imageBlock
    }
    case 'button': {
      const buttonBlock: NewsletterButtonBlock = {
        id: baseId,
        type: 'button',
        button: { label: 'Tap to Book', url: 'https://your.booking.link', style: 'solid', alignment: 'center' },
      }
      return buttonBlock
    }
    case 'divider': {
      const dividerBlock: NewsletterDividerBlock = {
        id: baseId,
        type: 'divider',
        thickness: 1,
        style: 'solid',
        width: '72px',
      }
      return dividerBlock
    }
    case 'spacer': {
      const spacerBlock: NewsletterSpacerBlock = {
        id: baseId,
        type: 'spacer',
        height: 32,
      }
      return spacerBlock
    }
    case 'highlight': {
      const highlightBlock: NewsletterHighlightBlock = {
        id: baseId,
        type: 'highlight',
        eyebrow: 'Client Love',
        heading: 'Add a standout quote or announcement',
        body: 'Use this to spotlight a story, offer or customer review.',
        button: { label: 'See Details', url: 'https://your.booking.link', style: 'outline' },
      }
      return highlightBlock
    }
    case 'text':
    default: {
      const textBlock: NewsletterTextBlock = {
        id: baseId,
        type: 'text',
        heading: 'Section title',
        body: 'Share updates, promos or education.\nUse bullet points by adding line breaks.',
        alignment: 'left',
      }
      return textBlock
    }
  }
}

type BuilderHeaderProps = {
  draft: BuilderDraft
  onChange: (updates: Partial<BuilderDraft>) => void
  onReset: () => void
  onSave: () => void
  saving: boolean
}

function BuilderHeader({ draft, onChange, onReset, onSave, saving }: BuilderHeaderProps) {
  return (
    <div className="grid gap-4 lg:grid-cols-2">
      <div className="space-y-3">
        <div>
          <label className="text-xs uppercase tracking-[0.2em] text-brown-dark font-semibold">Title</label>
          <input
            type="text"
            value={draft.title}
            onChange={(e) => onChange({ title: e.target.value })}
            placeholder="e.g., December Lash Diary"
            className="w-full border border-brown-light rounded-xl px-4 py-3 mt-1 focus:ring-2 focus:ring-brown-dark/50 focus:border-brown-dark"
          />
        </div>
        <div className="grid gap-3 md:grid-cols-2">
          <div>
            <label className="text-xs uppercase tracking-[0.2em] text-brown-dark font-semibold">Default Subject</label>
            <input
              type="text"
              value={draft.subject}
              onChange={(e) => onChange({ subject: e.target.value })}
              placeholder="Appears in inbox suggestions"
              className="w-full border border-brown-light rounded-xl px-4 py-3 mt-1"
            />
          </div>
          <div>
            <label className="text-xs uppercase tracking-[0.2em] text-brown-dark font-semibold">Preheader</label>
            <input
              type="text"
              value={draft.preheader}
              onChange={(e) => onChange({ preheader: e.target.value })}
              placeholder="Short line next to the subject"
              className="w-full border border-brown-light rounded-xl px-4 py-3 mt-1"
            />
          </div>
        </div>
      </div>
      <div className="space-y-3">
        <label className="text-xs uppercase tracking-[0.2em] text-brown-dark font-semibold">Internal notes</label>
        <textarea
          value={draft.description}
          onChange={(e) => onChange({ description: e.target.value })}
          rows={3}
          placeholder="Optional summary to remind you what this edition covers."
          className="w-full border border-brown-light rounded-xl px-4 py-3"
        />
        <div className="flex flex-wrap gap-3">
          <button
            onClick={onReset}
            className="px-4 py-2 border border-brown-light rounded-full text-brown hover:border-brown-dark"
          >
            Start Fresh
          </button>
          <button
            onClick={onSave}
            disabled={saving}
            className="px-5 py-2 rounded-full bg-brown-dark text-white font-semibold hover:bg-brown disabled:opacity-60"
          >
            {saving ? 'Saving...' : draft.id ? 'Update Newsletter' : 'Save Newsletter'}
          </button>
        </div>
      </div>
    </div>
  )
}

type BuilderSidebarProps = {
  onAddBlock: (type: NewsletterBlock['type']) => void
  onApplyTemplate: (template: NewsletterTemplate) => void
  newsletters: NewsletterRecord[]
  onEditNewsletter: (newsletter: NewsletterRecord) => void
  onDeleteNewsletter: (id: string) => void
}

function BuilderSidebar({
  onAddBlock,
  onApplyTemplate,
  newsletters,
  onEditNewsletter,
  onDeleteNewsletter,
}: BuilderSidebarProps) {
  return (
    <div className="space-y-5">
      <section className="border border-brown-light rounded-2xl p-4 space-y-3">
        <div>
          <p className="text-xs uppercase tracking-[0.2em] text-brown-dark font-semibold">Templates</p>
        </div>
        {NEWSLETTER_TEMPLATES.map((template) => (
          <div key={template.id} className="rounded-xl border border-brown-light px-3 py-2">
            <p className="text-sm font-semibold text-brown-dark">{template.name}</p>
            <p className="text-xs text-brown">{template.description}</p>
            <button
              onClick={() => onApplyTemplate(template)}
              className="mt-2 w-full text-xs font-semibold border border-brown-dark rounded-full py-1 text-brown-dark hover:bg-brown-dark hover:text-white transition-colors"
            >
              Use template
            </button>
          </div>
        ))}
      </section>
      <section className="border border-brown-light rounded-2xl p-4 space-y-3">
        <p className="text-xs uppercase tracking-[0.2em] text-brown-dark font-semibold">Blocks</p>
        {BLOCK_LIBRARY.map((block) => (
          <button
            key={block.type}
            onClick={() => onAddBlock(block.type)}
            className="w-full text-left border border-brown-light rounded-xl px-3 py-2 hover:border-brown-dark/70"
          >
            <p className="text-sm font-semibold text-brown-dark">{block.label}</p>
            <p className="text-xs text-brown">{block.hint}</p>
          </button>
        ))}
      </section>
      <section className="border border-brown-light rounded-2xl p-4 space-y-3">
        <div className="flex items-center justify-between">
          <p className="text-xs uppercase tracking-[0.2em] text-brown-dark font-semibold">Saved drafts</p>
        </div>
        {newsletters.length === 0 && <p className="text-xs text-brown">No drafts yet.</p>}
        {newsletters.slice(0, 5).map((newsletter) => (
          <div key={newsletter.id} className="border border-brown-light rounded-xl px-3 py-2 space-y-1">
            <div className="flex items-center justify-between">
              <p className="text-sm font-semibold text-brown-dark truncate">{newsletter.title}</p>
              <button
                onClick={() => onDeleteNewsletter(newsletter.id)}
                className="text-xs text-red-600 hover:underline"
              >
                Delete
              </button>
            </div>
            <p className="text-[11px] text-brown">
              {newsletter.sentAt ? `Sent ${new Date(newsletter.sentAt).toLocaleDateString()}` : 'Draft'}
            </p>
            <button
              onClick={() => onEditNewsletter(newsletter)}
              className="text-xs font-semibold text-brown-dark underline"
            >
              Edit in builder
            </button>
          </div>
        ))}
      </section>
    </div>
  )
}

type ThemePanelProps = {
  draft: BuilderDraft
  onChange: (updates: Partial<BuilderDraft>) => void
}

function ThemePanel({ draft, onChange }: ThemePanelProps) {
  return (
    <div className="space-y-4 border border-brown-light rounded-2xl p-4">
      <p className="text-xs uppercase tracking-[0.2em] text-brown-dark font-semibold">Themes</p>
      {NEWSLETTER_THEMES.map((theme) => (
        <button
          key={theme.id}
          onClick={() => onChange({ themeId: theme.id })}
          className={`w-full text-left border rounded-xl px-3 py-3 mb-3 ${
            draft.themeId === theme.id ? 'border-brown-dark bg-brown-light/20' : 'border-brown-light'
          }`}
        >
          <p className="text-sm font-semibold text-brown-dark">{theme.name}</p>
          <p className="text-xs text-brown">{theme.description}</p>
          <div className="flex gap-1 mt-3">
            <span
              className="w-8 h-8 rounded-full border"
              style={{ background: theme.backgroundColor, borderColor: theme.textColor }}
            />
            <span
              className="w-8 h-8 rounded-full border"
              style={{ background: theme.accentColor, borderColor: theme.accentColor }}
            />
            <span
              className="w-8 h-8 rounded-full border"
              style={{ background: theme.buttonColor, borderColor: theme.buttonColor }}
            />
          </div>
        </button>
      ))}
    </div>
  )
}

type BlockEditorProps = {
  block: NewsletterBlock
  onChange: (updates: Record<string, any>) => void
  onUpload: (file: File) => Promise<void>
}

function BlockEditor({ block, onChange, onUpload }: BlockEditorProps) {
  const uploadImage = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file) return
    try {
      await onUpload(file)
    } catch (error: any) {
      alert(error.message || 'Failed to upload image')
    }
  }

  switch (block.type) {
    case 'hero':
      return (
        <div className="space-y-3">
          <input
            type="text"
            value={block.eyebrow || ''}
            onChange={(e) => onChange({ eyebrow: e.target.value })}
            placeholder="Eyebrow (optional)"
            className="w-full border border-brown-light rounded-lg px-3 py-2"
          />
          <input
            type="text"
            value={block.heading}
            onChange={(e) => onChange({ heading: e.target.value })}
            className="w-full border border-brown-light rounded-lg px-3 py-2 text-lg font-semibold"
          />
          <textarea
            value={block.subheading || ''}
            onChange={(e) => onChange({ subheading: e.target.value })}
            rows={3}
            placeholder="Subheading"
            className="w-full border border-brown-light rounded-lg px-3 py-2"
          />
          <div className="grid gap-2 md:grid-cols-2">
            <input
              type="text"
              value={block.button?.label || ''}
              onChange={(e) => onChange({ button: { ...block.button, label: e.target.value || 'Book Now' } })}
              placeholder="Button label"
              className="w-full border border-brown-light rounded-lg px-3 py-2"
            />
            <input
              type="text"
              value={block.button?.url || ''}
              onChange={(e) => onChange({ button: { ...block.button, url: e.target.value } })}
              placeholder="Button link"
              className="w-full border border-brown-light rounded-lg px-3 py-2"
            />
          </div>
          <input type="file" accept="image/*" onChange={uploadImage} className="text-xs text-brown" />
          {block.imageUrl && (
            <img src={block.imageUrl} alt="" className="rounded-xl border border-brown-light object-cover" />
          )}
        </div>
      )
    case 'text':
      return (
        <div className="space-y-2">
          <input
            type="text"
            value={block.heading || ''}
            onChange={(e) => onChange({ heading: e.target.value })}
            placeholder="Heading"
            className="w-full border border-brown-light rounded-lg px-3 py-2"
          />
          <textarea
            value={block.body}
            onChange={(e) => onChange({ body: e.target.value })}
            rows={4}
            className="w-full border border-brown-light rounded-lg px-3 py-2"
          />
          <select
            value={block.alignment}
            onChange={(e) => onChange({ alignment: e.target.value })}
            className="w-full border border-brown-light rounded-lg px-3 py-2"
          >
            <option value="left">Align Left</option>
            <option value="center">Align Center</option>
            <option value="right">Align Right</option>
          </select>
        </div>
      )
    case 'image':
      return (
        <div className="space-y-2">
          <input type="file" accept="image/*" onChange={uploadImage} className="text-xs text-brown" />
          {block.imageUrl && <img src={block.imageUrl} alt="" className="rounded-xl border border-brown-light" />}
          <input
            type="text"
            value={block.caption || ''}
            onChange={(e) => onChange({ caption: e.target.value })}
            placeholder="Caption"
            className="w-full border border-brown-light rounded-lg px-3 py-2"
          />
        </div>
      )
    case 'button':
      return (
        <div className="space-y-2">
          <input
            type="text"
            value={block.button.label}
            onChange={(e) => onChange({ button: { ...block.button, label: e.target.value } })}
            className="w-full border border-brown-light rounded-lg px-3 py-2"
          />
          <input
            type="text"
            value={block.button.url}
            onChange={(e) => onChange({ button: { ...block.button, url: e.target.value } })}
            className="w-full border border-brown-light rounded-lg px-3 py-2"
          />
          <select
            value={block.button.alignment || 'center'}
            onChange={(e) => onChange({ button: { ...block.button, alignment: e.target.value } })}
            className="w-full border border-brown-light rounded-lg px-3 py-2"
          >
            <option value="left">Align Left</option>
            <option value="center">Align Center</option>
            <option value="right">Align Right</option>
          </select>
        </div>
      )
    case 'divider':
      return (
        <div className="space-y-2">
          <input
            type="text"
            value={block.width || '72px'}
            onChange={(e) => onChange({ width: e.target.value })}
            className="w-full border border-brown-light rounded-lg px-3 py-2"
          />
          <select
            value={block.style || 'solid'}
            onChange={(e) => onChange({ style: e.target.value })}
            className="w-full border border-brown-light rounded-lg px-3 py-2"
          >
            <option value="solid">Solid</option>
            <option value="dashed">Dashed</option>
          </select>
        </div>
      )
    case 'spacer':
      return (
        <div className="space-y-2">
          <label className="text-sm text-brown-dark font-semibold">Height: {block.height}px</label>
          <input
            type="range"
            min={12}
            max={120}
            value={block.height}
            onChange={(e) => onChange({ height: Number(e.target.value) })}
            className="w-full"
          />
        </div>
      )
    case 'highlight':
      return (
        <div className="space-y-2">
          <input
            type="text"
            value={block.eyebrow || ''}
            onChange={(e) => onChange({ eyebrow: e.target.value })}
            placeholder="Eyebrow"
            className="w-full border border-brown-light rounded-lg px-3 py-2"
          />
          <input
            type="text"
            value={block.heading}
            onChange={(e) => onChange({ heading: e.target.value })}
            className="w-full border border-brown-light rounded-lg px-3 py-2 font-semibold"
          />
          <textarea
            value={block.body || ''}
            onChange={(e) => onChange({ body: e.target.value })}
            rows={3}
            className="w-full border border-brown-light rounded-lg px-3 py-2"
          />
          <input
            type="file"
            accept="image/*"
            onChange={uploadImage}
            className="text-xs text-brown"
          />
          {block.imageUrl && (
            <img src={block.imageUrl} alt="" className="rounded-xl border border-brown-light object-cover" />
          )}
          <input
            type="text"
            value={block.button?.label || ''}
            onChange={(e) => onChange({ button: { ...block.button, label: e.target.value } })}
            placeholder="Button label"
            className="w-full border border-brown-light rounded-lg px-3 py-2"
          />
          <input
            type="text"
            value={block.button?.url || ''}
            onChange={(e) => onChange({ button: { ...block.button, url: e.target.value } })}
            placeholder="Button link"
            className="w-full border border-brown-light rounded-lg px-3 py-2"
          />
        </div>
      )
    default:
      return null
  }
}

type SendPanelProps = {
  newsletters: NewsletterRecord[]
  selectedNewsletterId: string
  setSelectedNewsletterId: (id: string) => void
  subject: string
  setSubject: (subject: string) => void
  recipientType: 'all' | 'first-time' | 'returning' | 'custom'
  setRecipientType: (type: 'all' | 'first-time' | 'returning' | 'custom') => void
  customRecipients: string
  setCustomRecipients: (value: string) => void
  onSend: () => void
  sending: boolean
}

function SendPanel({
  newsletters,
  selectedNewsletterId,
  setSelectedNewsletterId,
  subject,
  setSubject,
  recipientType,
  setRecipientType,
  customRecipients,
  setCustomRecipients,
  onSend,
  sending,
}: SendPanelProps) {
  return (
    <div className="space-y-6 max-w-3xl mx-auto">
      <div>
        <h2 className="text-2xl font-display text-brown-dark mb-2">Send your newsletter</h2>
        <p className="text-sm text-brown">
          Select one of your saved designs, drop in the subject line, and choose who should receive it.
        </p>
      </div>

      <div className="space-y-2">
        <label className="text-xs uppercase tracking-[0.2em] text-brown-dark font-semibold">Newsletter</label>
        <select
          value={selectedNewsletterId}
          onChange={(e) => setSelectedNewsletterId(e.target.value)}
          className="w-full border border-brown-light rounded-xl px-4 py-3"
        >
          <option value="">Choose a newsletter...</option>
          {newsletters.map((newsletter) => (
            <option key={newsletter.id} value={newsletter.id}>
              {newsletter.title} {newsletter.sentAt ? '(Sent)' : ''}
            </option>
          ))}
        </select>
      </div>

      <div className="space-y-2">
        <label className="text-xs uppercase tracking-[0.2em] text-brown-dark font-semibold">Subject line</label>
        <input
          type="text"
          value={subject}
          onChange={(e) => setSubject(e.target.value)}
          className="w-full border border-brown-light rounded-xl px-4 py-3"
        />
      </div>

      <div className="space-y-2">
        <label className="text-xs uppercase tracking-[0.2em] text-brown-dark font-semibold">Recipients</label>
        <select
          value={recipientType}
          onChange={(e) => setRecipientType(e.target.value as any)}
          className="w-full border border-brown-light rounded-xl px-4 py-3"
        >
          <option value="all">All subscribers</option>
          <option value="first-time">First-time clients</option>
          <option value="returning">Returning clients</option>
          <option value="custom">Custom list</option>
        </select>
        {recipientType === 'custom' && (
          <textarea
            value={customRecipients}
            onChange={(e) => setCustomRecipients(e.target.value)}
            rows={4}
            placeholder="email@example.com | Name (one per line or comma separated)"
            className="w-full border border-brown-light rounded-xl px-4 py-3"
          />
        )}
      </div>

      <button
        onClick={onSend}
        disabled={sending}
        className="w-full rounded-full bg-brown-dark text-white font-semibold py-3 text-lg hover:bg-brown disabled:opacity-60"
      >
        {sending ? 'Sending...' : 'Send Newsletter'}
      </button>
    </div>
  )
}