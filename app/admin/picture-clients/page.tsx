'use client'

import { useEffect, useState, ChangeEvent } from 'react'
import Link from 'next/link'

interface ClientPhotoEntry {
  id: string
  bookingId?: string
  name: string
  email: string
  phone?: string
  service?: string
  appointmentDate?: string
  uploadedAt: string
  photoUrl: string
  filename?: string | null
}

interface SampleSettings {
  sampleImageUrl: string | null
  instructions: string
}

export default function ClientPhotosAdminPage() {
  const [entries, setEntries] = useState<ClientPhotoEntry[]>([])
  const [loadingEntries, setLoadingEntries] = useState(true)
  const [entriesError, setEntriesError] = useState<string | null>(null)

  const [sampleSettings, setSampleSettings] = useState<SampleSettings>({
    sampleImageUrl: null,
    instructions: '',
  })
  const [sampleLoading, setSampleLoading] = useState(false)
  const [instructionsSaving, setInstructionsSaving] = useState(false)
  const [instructionsMessage, setInstructionsMessage] = useState<string | null>(null)
  const [sampleError, setSampleError] = useState<string | null>(null)

  const [sampleUploadMessage, setSampleUploadMessage] = useState<string | null>(null)
  const [sampleUploading, setSampleUploading] = useState(false)

  const [deleteState, setDeleteState] = useState<{ [id: string]: boolean }>({})

  const loadEntries = async () => {
    setLoadingEntries(true)
    setEntriesError(null)
    try {
      const response = await fetch('/api/admin/client-photos', { cache: 'no-store' })
      const data = await response.json()
      if (!response.ok || data.error) {
        throw new Error(data.error || 'Failed to load client photos.')
      }
      setEntries(Array.isArray(data.entries) ? data.entries : [])
    } catch (error: any) {
      console.error('Failed to load client photo entries:', error)
      setEntriesError(error?.message || 'Could not load client photos.')
    } finally {
      setLoadingEntries(false)
    }
  }

  const loadSampleSettings = async () => {
    setSampleLoading(true)
    setSampleError(null)
    try {
      const response = await fetch('/api/admin/client-photos/sample', { cache: 'no-store' })
      const data = await response.json()
      if (!response.ok || data.error) {
        throw new Error(data.error || 'Failed to load photo instructions.')
      }
      setSampleSettings({
        sampleImageUrl: data.settings?.sampleImageUrl ?? null,
        instructions: data.settings?.instructions ?? '',
      })
    } catch (error: any) {
      console.error('Failed to load sample settings:', error)
      setSampleError(error?.message || 'Could not load sample settings.')
    } finally {
      setSampleLoading(false)
    }
  }

  useEffect(() => {
    loadEntries()
    loadSampleSettings()
  }, [])

  const handleSampleUpload = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file) return

    setSampleUploadMessage(null)
    setSampleError(null)

    const allowedTypes = ['image/jpeg', 'image/png', 'image/webp']
    if (!allowedTypes.includes(file.type)) {
      setSampleError('Please upload a JPG, PNG, or WebP image.')
      return
    }

    if (file.size > 4 * 1024 * 1024) {
      setSampleError('Sample image must be under 4MB.')
      return
    }

    const formData = new FormData()
    formData.append('file', file)

    setSampleUploading(true)
    try {
      const response = await fetch('/api/admin/client-photos/sample/upload', {
        method: 'POST',
        body: formData,
      })
      const data = await response.json()
      if (!response.ok || data.error) {
        throw new Error(data.error || 'Failed to upload sample image.')
      }
      setSampleSettings((prev) => ({
        ...prev,
        sampleImageUrl: data.url,
      }))
      setSampleUploadMessage('Sample image updated successfully.')
    } catch (error: any) {
      console.error('Sample upload failed:', error)
      setSampleError(error?.message || 'Could not upload sample image.')
    } finally {
      setSampleUploading(false)
    }
  }

  const handleInstructionsSave = async () => {
    setInstructionsSaving(true)
    setInstructionsMessage(null)
    setSampleError(null)
    try {
      const response = await fetch('/api/admin/client-photos/sample', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          instructions: sampleSettings.instructions,
        }),
      })
      const data = await response.json()
      if (!response.ok || data.error) {
        throw new Error(data.error || 'Failed to save instructions.')
      }
      setSampleSettings({
        sampleImageUrl: data.settings?.sampleImageUrl ?? sampleSettings.sampleImageUrl,
        instructions: data.settings?.instructions ?? '',
      })
      setInstructionsMessage('Instructions saved.')
    } catch (error: any) {
      console.error('Failed to save instructions:', error)
      setSampleError(error?.message || 'Could not save instructions.')
    } finally {
      setInstructionsSaving(false)
    }
  }

  const handleDeleteEntry = async (id: string) => {
    if (!confirm('Remove this photo from the archive?')) {
      return
    }
    setDeleteState((prev) => ({ ...prev, [id]: true }))
    try {
      const response = await fetch(`/api/admin/client-photos?id=${encodeURIComponent(id)}`, {
        method: 'DELETE',
      })
      const data = await response.json()
      if (!response.ok || data.error) {
        throw new Error(data.error || 'Failed to delete photo entry.')
      }
      setEntries((prev) => prev.filter((entry) => entry.id !== id))
    } catch (error: any) {
      console.error('Failed to delete client photo entry:', error)
      alert(error?.message || 'Could not delete this photo entry.')
    } finally {
      setDeleteState((prev) => ({ ...prev, [id]: false }))
    }
  }

  return (
    <div className="min-h-screen bg-pink-light/40 pb-20">
      <div className="bg-gradient-to-b from-white via-white/90 to-transparent border-b border-brown-light/40">
        <div className="max-w-6xl mx-auto px-4 py-10">
          <h1 className="text-3xl font-display text-brown-dark">Client Eye Photos</h1>
          <p className="mt-2 text-brown-dark/70">
            Review the reference photos clients submit during booking, download them for mapping, and configure the
            instructions they see on the booking form.
          </p>
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-4 mt-10 space-y-10">
        <section className="bg-white rounded-3xl shadow-soft border border-brown-light/40 p-6 md:p-8 space-y-6">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-6">
            <div>
              <h2 className="text-2xl font-display text-brown-dark">Client-facing instructions</h2>
              <p className="text-sm text-brown-dark/70">
                Upload the reference example and fine-tune what guests read before they submit their booking photo.
              </p>
            </div>
            <Link
              href="/admin"
              className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-[var(--color-primary)] text-[var(--color-on-primary)] text-sm font-semibold hover:bg-[color-mix(in_srgb,var(--color-primary) 85%,#000 15%)] transition"
            >
              ← Back to admin home
            </Link>
          </div>

          <div className="grid md:grid-cols-[2fr,1fr] gap-6">
            <div className="space-y-4">
              <label className="text-sm font-semibold text-brown-dark" htmlFor="instructions">
                Booking instructions
              </label>
              <textarea
                id="instructions"
                value={sampleSettings.instructions}
                onChange={(e) =>
                  setSampleSettings((prev) => ({
                    ...prev,
                    instructions: e.target.value,
                  }))
                }
                placeholder="Explain how to frame the eyes, lighting tips, etc."
                rows={5}
                className="w-full px-4 py-3 border-2 border-brown-light rounded-xl bg-white text-brown-dark focus:ring-2 focus:ring-brown-dark focus:border-brown-dark text-sm"
              />
              <div className="flex items-center gap-3">
                <button
                  type="button"
                  onClick={handleInstructionsSave}
                  disabled={instructionsSaving}
                  className="inline-flex items-center px-5 py-2 rounded-full bg-brown-dark text-white text-sm font-semibold hover:bg-brown transition disabled:opacity-60"
                >
                  {instructionsSaving ? 'Saving…' : 'Save instructions'}
                </button>
                {instructionsMessage && <span className="text-sm text-green-600">{instructionsMessage}</span>}
              </div>
            </div>

            <div className="space-y-3">
              <label className="text-sm font-semibold text-brown-dark">Sample image</label>
              {sampleSettings.sampleImageUrl ? (
                <div className="rounded-2xl overflow-hidden border border-brown-light/60 shadow-soft">
                  <img
                    src={sampleSettings.sampleImageUrl}
                    alt="Sample booking photo"
                    className="w-full h-40 object-cover"
                  />
                </div>
              ) : (
                <div className="rounded-2xl border-2 border-dashed border-brown-light/70 bg-pink-light/40 h-40 flex items-center justify-center text-sm text-brown-dark/60">
                  No sample uploaded yet.
                </div>
              )}
              <input
                type="file"
                accept="image/jpeg,image/png,image/webp"
                onChange={handleSampleUpload}
                disabled={sampleUploading}
                className="block w-full text-sm text-brown-dark file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-brown-dark file:text-white hover:file:bg-brown transition"
              />
              {sampleUploading && <p className="text-sm text-brown-dark/70">Uploading sample…</p>}
              {sampleUploadMessage && <p className="text-sm text-green-600">{sampleUploadMessage}</p>}
              {sampleError && <p className="text-sm text-red-600">{sampleError}</p>}
            </div>
          </div>
        </section>

        <section className="bg-white rounded-3xl shadow-soft border border-brown-light/40 p-6 md:p-8">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-6">
            <div>
              <h2 className="text-2xl font-display text-brown-dark">Client uploads</h2>
              <p className="text-sm text-brown-dark/70">
                Every booking now includes a reference image. Download or remove them once they are mapped.
              </p>
            </div>
            <button
              type="button"
              onClick={loadEntries}
              className="inline-flex items-center px-4 py-2 rounded-full bg-[var(--color-primary-dark)] text-[var(--color-on-primary)] text-sm font-semibold hover:bg-[color-mix(in_srgb,var(--color-primary-dark) 85%,#000 15%)] transition"
            >
              Refresh list
            </button>
          </div>

          {loadingEntries ? (
            <div className="py-10 text-center text-brown-dark/70">Loading client photos…</div>
          ) : entriesError ? (
            <div className="py-10 text-center text-red-600 font-medium">{entriesError}</div>
          ) : entries.length === 0 ? (
            <div className="py-10 text-center text-brown-dark/70">No client photos captured yet.</div>
          ) : (
            <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-3">
              {entries
                .slice()
                .sort((a, b) => (a.uploadedAt < b.uploadedAt ? 1 : -1))
                .map((entry) => (
                  <article
                    key={entry.id}
                    className="border border-brown-light/40 rounded-2xl overflow-hidden bg-white shadow-sm hover:shadow-lg transition"
                  >
                    <div className="relative h-48 bg-brown-light/10">
                      <img
                        src={entry.photoUrl}
                        alt={`${entry.name} eye reference`}
                        className="w-full h-full object-cover"
                      />
                    </div>
                    <div className="p-5 space-y-3">
                      <div>
                        <h3 className="text-lg font-semibold text-brown-dark">{entry.name}</h3>
                        <p className="text-sm text-brown-dark/70">{entry.email}</p>
                        {entry.phone && <p className="text-sm text-brown-dark/60">{entry.phone}</p>}
                      </div>
                      <div className="text-xs text-brown-dark/60 space-y-1">
                        {entry.service && <p>Service: {entry.service}</p>}
                        {entry.appointmentDate && (
                          <p>
                            Appointment:{' '}
                            {new Date(entry.appointmentDate).toLocaleDateString('en-US', {
                              year: 'numeric',
                              month: 'short',
                              day: 'numeric',
                            })}
                          </p>
                        )}
                        <p>
                          Uploaded:{' '}
                          {new Date(entry.uploadedAt).toLocaleString('en-US', {
                            dateStyle: 'medium',
                            timeStyle: 'short',
                          })}
                        </p>
                        {entry.bookingId && <p>Booking ID: {entry.bookingId}</p>}
                      </div>

                      <div className="flex flex-wrap gap-2 pt-2">
                        <a
                          href={entry.photoUrl}
                          download={entry.filename || `${entry.id}.jpg`}
                          className="inline-flex items-center px-4 py-2 rounded-full bg-brown-dark text-white text-xs font-semibold hover:bg-brown transition"
                        >
                          Download
                        </a>
                        <a
                          href={entry.photoUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center px-4 py-2 rounded-full border border-brown-dark text-xs font-semibold text-brown-dark hover:bg-brown-dark hover:text-white transition"
                        >
                          Open full size
                        </a>
                        <button
                          type="button"
                          onClick={() => handleDeleteEntry(entry.id)}
                          disabled={deleteState[entry.id]}
                          className="inline-flex items-center px-4 py-2 rounded-full border border-red-500 text-xs font-semibold text-red-600 hover:bg-red-500 hover:text-white transition disabled:opacity-60"
                        >
                          {deleteState[entry.id] ? 'Removing…' : 'Remove'}
                        </button>
                      </div>
                    </div>
                  </article>
                ))}
            </div>
          )}
        </section>
      </div>
    </div>
  )
}


