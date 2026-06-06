'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import Toast from '@/components/Toast'
import AdminBackButton from '@/components/AdminBackButton'
import type { TrainingCourseContent, TrainingProgram } from '@/types/training'

const authorizedFetch = (input: RequestInfo | URL, init: RequestInit = {}) =>
  fetch(input, { credentials: 'include', ...init })

const listToText = (items?: string[]) => (items || []).join('\n')

const textToList = (value: string) =>
  value.split('\n')

const defaultCourseContentTemplate: TrainingCourseContent = {
  title: 'LashDiary Professional Cluster Lash Training',
  subtitle: 'A 5-Day Mastery Programme',
  price: 'KSh 10,000',
  tagline:
    "Where skill meets integrity, because beautiful lashes should never cost your client's natural lashes.",
  philosophy:
    'This course is built on one non-negotiable: client lash health comes first.',
  modules: [
    {
      id: 1,
      day: 'Day 1',
      title: 'Understanding Cluster Lashes',
      color: '#c9a96e',
      intro: 'Introduce the foundation of cluster lashes and safe client education.',
      sections: [
        {
          heading: 'History & Evolution',
          content: [
            'Cluster lashes began as an accessible short-term lash option.',
            'Modern clients expect longer retention, so safe product use matters.',
          ],
        },
      ],
      outcome: 'Students understand what cluster lashes are and how to explain them honestly.',
    },
  ],
  practicalAssessment: {
    title: 'Practical Assessment',
    description: 'Students demonstrate competence before receiving a certificate.',
    components: ['Client consultation', 'Lash mapping', 'Full set application'],
  },
  certificate: 'LashDiary Certificate of Completion - Professional Cluster Lash Technician',
}

const formatJson = (value: unknown) => JSON.stringify(value, null, 2)

const isCourseContent = (value: unknown): value is TrainingCourseContent => {
  if (!value || typeof value !== 'object') return false
  const content = value as Partial<TrainingCourseContent>
  return (
    typeof content.title === 'string' &&
    typeof content.subtitle === 'string' &&
    Array.isArray(content.modules) &&
    typeof content.practicalAssessment === 'object' &&
    Boolean(content.practicalAssessment) &&
    Array.isArray(content.practicalAssessment?.components)
  )
}

function AssetPreview({
  url,
  label = 'Uploaded asset',
}: {
  url?: string
  label?: string
}) {
  if (!url) return null
  const isPdf = url.toLowerCase().includes('.pdf')
  const isImage = /\.(png|jpe?g|webp|gif)(\?.*)?$/i.test(url) || !isPdf

  return (
    <div className="mt-2 rounded-lg border border-brown/10 bg-baby-pink-light/40 p-3">
      <a
        href={url}
        target="_blank"
        rel="noreferrer"
        className="text-sm font-semibold text-brown underline"
      >
        {isPdf ? 'Open uploaded PDF' : `Open ${label}`}
      </a>
      {isImage && (
        <img
          src={url}
          alt={label}
          className="mt-3 max-h-48 w-full rounded-lg object-cover"
        />
      )}
    </div>
  )
}

export default function AdminTrainingPage() {
  const router = useRouter()
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [uploadingField, setUploadingField] = useState<string | null>(null)
  const [program, setProgram] = useState<TrainingProgram | null>(null)
  const [whatYoullLearnText, setWhatYoullLearnText] = useState('')
  const [requirementsText, setRequirementsText] = useState('')
  const [syllabusBulletsText, setSyllabusBulletsText] = useState('')
  const [courseContentText, setCourseContentText] = useState('')
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null)

  useEffect(() => {
    const load = async () => {
      try {
        const auth = await authorizedFetch('/api/admin/current-user')
        if (!auth.ok) {
          router.replace('/admin/login')
          return
        }
        const data = await auth.json()
        if (!data.authenticated) {
          router.replace('/admin/login')
          return
        }
        const res = await authorizedFetch('/api/admin/training')
        if (!res.ok) throw new Error('Failed to load')
        const json = await res.json()
        const loadedProgram = json.programs?.[0] ?? null
        setProgram(loadedProgram)
        if (loadedProgram) {
          setWhatYoullLearnText(listToText(loadedProgram.whatYoullLearn))
          setRequirementsText(listToText(loadedProgram.requirements))
          setSyllabusBulletsText(listToText(loadedProgram.syllabusPreview?.bullets))
          setCourseContentText(formatJson(loadedProgram.courseContent || defaultCourseContentTemplate))
        }
      } catch {
        router.replace('/admin/login')
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [router])

  const buildProgramForSave = (baseProgram: TrainingProgram): TrainingProgram => {
    let parsedCourseContent: TrainingCourseContent | undefined
    try {
      parsedCourseContent = courseContentText.trim()
        ? (JSON.parse(courseContentText) as TrainingCourseContent)
        : undefined
    } catch {
      throw new Error('Course content JSON is invalid. Please fix it before saving.')
    }
    if (parsedCourseContent && !isCourseContent(parsedCourseContent)) {
      throw new Error('Course content must include title, subtitle, modules, and practicalAssessment.components.')
    }

    return {
      ...baseProgram,
      whatYoullLearn: textToList(whatYoullLearnText),
      requirements: textToList(requirementsText),
      syllabusPreview: {
        ...(baseProgram.syllabusPreview || {}),
        bullets: textToList(syllabusBulletsText),
      },
      courseContent: parsedCourseContent,
    }
  }

  const saveProgram = async (
    baseProgram: TrainingProgram,
    options: { silent?: boolean; successMessage?: string } = {},
  ) => {
    if (!options.silent) {
      setSaving(true)
      setMessage(null)
    }
    try {
      const programToSave = buildProgramForSave(baseProgram)
      const res = await authorizedFetch('/api/admin/training', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ programs: [programToSave] }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Save failed')
      const savedProgram = data.programs[0]
      setProgram(savedProgram)
      setWhatYoullLearnText(listToText(savedProgram.whatYoullLearn))
      setRequirementsText(listToText(savedProgram.requirements))
      setSyllabusBulletsText(listToText(savedProgram.syllabusPreview?.bullets))
      setCourseContentText(formatJson(savedProgram.courseContent || defaultCourseContentTemplate))
      setMessage({
        type: 'success',
        text: options.successMessage || 'Training program saved.',
      })
    } catch (e) {
      setMessage({
        type: 'error',
        text: e instanceof Error ? e.message : 'Save failed',
      })
      throw e
    } finally {
      if (!options.silent) setSaving(false)
    }
  }

  const handleSave = async () => {
    if (!program) return
    await saveProgram(program)
  }

  const uploadAsset = async (
    file: File,
    applyUploadedUrl: (url: string, currentProgram: TrainingProgram) => TrainingProgram,
    field: string,
  ) => {
    if (!program) {
      setMessage({ type: 'error', text: 'Training program is not loaded yet.' })
      return
    }
    setUploadingField(field)
    setMessage(null)
    try {
      const formData = new FormData()
      formData.append('file', file)
      const res = await authorizedFetch('/api/admin/training/upload', {
        method: 'POST',
        body: formData,
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Upload failed')
      const nextProgram = applyUploadedUrl(data.url, program!)
      setProgram(nextProgram)
      await saveProgram(nextProgram, {
        silent: true,
        successMessage: 'Asset uploaded and saved.',
      })
    } catch (e) {
      setMessage({
        type: 'error',
        text: e instanceof Error ? e.message : 'Upload failed',
      })
    } finally {
      setUploadingField(null)
    }
  }

  const updateSyllabus = (updates: Partial<NonNullable<TrainingProgram['syllabusPreview']>>) => {
    if (!program) return
    setProgram({
      ...program,
      syllabusPreview: {
        ...(program.syllabusPreview || {}),
        ...updates,
      },
    })
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-baby-pink-light flex items-center justify-center text-brown">
        Loading...
      </div>
    )
  }

  if (!program) {
    return (
      <div className="min-h-screen bg-baby-pink-light p-8 text-brown">
        No program found.
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-baby-pink-light py-8 px-4">
      <div className="max-w-3xl mx-auto">
        <AdminBackButton href="/admin/dashboard" />
        <h1 className="text-3xl font-bold text-brown mt-4 mb-2">Lash Masterclass Program</h1>
        <p className="text-brown/70 mb-6">
          Set default price and public copy. Create cohorts under{' '}
          <Link href="/admin/training/intakes" className="text-brown underline">
            Cohorts
          </Link>
          .
        </p>

        <div className="flex gap-3 mb-6 flex-wrap">
          <Link
            href="/admin/training/intakes"
            className="px-4 py-2 bg-brown text-white rounded-lg text-sm"
          >
            Manage Cohorts
          </Link>
          <Link
            href="/admin/training/enrollments"
            className="px-4 py-2 border border-brown text-brown rounded-lg text-sm"
          >
            View Enrollments
          </Link>
          <Link href="/masterclass" className="px-4 py-2 text-brown underline text-sm">
            Public page
          </Link>
        </div>

        <div className="bg-white rounded-xl shadow p-6 space-y-4">
          <label className="block">
            <span className="text-sm font-medium text-brown">Title</span>
            <input
              className="mt-1 w-full border rounded-lg px-3 py-2"
              value={program.title}
              onChange={(e) => setProgram({ ...program, title: e.target.value })}
            />
          </label>
          <label className="block">
            <span className="text-sm font-medium text-brown">Default price (KES)</span>
            <input
              type="number"
              min={0}
              className="mt-1 w-full border rounded-lg px-3 py-2"
              value={program.priceKES}
              onChange={(e) =>
                setProgram({ ...program, priceKES: Number(e.target.value) || 0 })
              }
            />
          </label>
          <label className="block">
            <span className="text-sm font-medium text-brown">Masterclass duration (days)</span>
            <input
              type="number"
              min={1}
              max={14}
              className="mt-1 w-full border rounded-lg px-3 py-2"
              value={program.durationDays || 5}
              onChange={(e) =>
                setProgram({ ...program, durationDays: Math.max(1, Number(e.target.value) || 5) })
              }
            />
            <p className="mt-1 text-xs text-brown/60">
              This controls the website wording and how many dates are generated when you create a new cohort.
            </p>
          </label>
          <label className="block">
            <span className="text-sm font-medium text-brown">Location</span>
            <input
              className="mt-1 w-full border rounded-lg px-3 py-2"
              value={program.location}
              onChange={(e) => setProgram({ ...program, location: e.target.value })}
            />
          </label>
          <label className="block">
            <span className="text-sm font-medium text-brown">Short description</span>
            <input
              className="mt-1 w-full border rounded-lg px-3 py-2"
              value={program.shortDescription || ''}
              onChange={(e) =>
                setProgram({ ...program, shortDescription: e.target.value })
              }
            />
          </label>
          <label className="block">
            <span className="text-sm font-medium text-brown">Full description</span>
            <textarea
              rows={4}
              className="mt-1 w-full border rounded-lg px-3 py-2"
              value={program.description}
              onChange={(e) => setProgram({ ...program, description: e.target.value })}
            />
          </label>
          <label className="block">
            <span className="text-sm font-medium text-brown">What you&apos;ll learn (one per line)</span>
            <textarea
              rows={5}
              className="mt-1 w-full border rounded-lg px-3 py-2"
              value={whatYoullLearnText}
              onChange={(e) => setWhatYoullLearnText(e.target.value)}
            />
          </label>
          <label className="block">
            <span className="text-sm font-medium text-brown">Requirements (one per line)</span>
            <textarea
              rows={4}
              className="mt-1 w-full border rounded-lg px-3 py-2"
              value={requirementsText}
              onChange={(e) => setRequirementsText(e.target.value)}
            />
          </label>
          <div className="border-t border-brown/10 pt-5 space-y-4">
            <div>
              <h2 className="text-lg font-semibold text-brown">Masterclass page visuals</h2>
              <p className="text-xs text-brown/70">
                Canva sizes: hero image 1920 x 1080 px, syllabus preview 1080 x 1350 px,
                section images 1200 x 900 px, gallery squares 1080 x 1080 px.
              </p>
            </div>
            <label className="block">
              <span className="text-sm font-medium text-brown">Eyebrow / small heading</span>
              <input
                className="mt-1 w-full border rounded-lg px-3 py-2"
                value={program.eyebrow || ''}
                onChange={(e) => setProgram({ ...program, eyebrow: e.target.value })}
              />
            </label>
            <label className="block">
              <span className="text-sm font-medium text-brown">Hero image URL</span>
              <input
                className="mt-1 w-full border rounded-lg px-3 py-2"
                value={program.heroImageUrl || ''}
                onChange={(e) => setProgram({ ...program, heroImageUrl: e.target.value })}
              />
            </label>
            <input
              type="file"
              accept="image/*"
              onChange={(e) => {
                const file = e.target.files?.[0]
                if (file) {
                  uploadAsset(file, (url, current) => ({ ...current, heroImageUrl: url }), 'hero')
                }
              }}
              className="block w-full text-sm text-brown"
            />
            {uploadingField === 'hero' && <p className="text-xs text-brown/70">Uploading hero image...</p>}
            <AssetPreview url={program.heroImageUrl} label="hero image" />
          </div>

          <div className="border-t border-brown/10 pt-5 space-y-4">
            <div>
              <h2 className="text-lg font-semibold text-brown">Syllabus preview</h2>
              <p className="text-xs text-brown/70">
                Upload the full PDF and optionally upload a Canva-made preview image/snippet.
                Recommended PDF preview image: 1080 x 1350 px.
              </p>
            </div>
            <label className="block">
              <span className="text-sm font-medium text-brown">Preview title</span>
              <input
                className="mt-1 w-full border rounded-lg px-3 py-2"
                value={program.syllabusPreview?.title || ''}
                onChange={(e) => updateSyllabus({ title: e.target.value })}
              />
            </label>
            <label className="block">
              <span className="text-sm font-medium text-brown">Preview description</span>
              <textarea
                rows={3}
                className="mt-1 w-full border rounded-lg px-3 py-2"
                value={program.syllabusPreview?.description || ''}
                onChange={(e) => updateSyllabus({ description: e.target.value })}
              />
            </label>
            <label className="block">
              <span className="text-sm font-medium text-brown">Preview bullets (one per line)</span>
              <textarea
                rows={4}
                className="mt-1 w-full border rounded-lg px-3 py-2"
                value={syllabusBulletsText}
                onChange={(e) => setSyllabusBulletsText(e.target.value)}
              />
            </label>
            <label className="block">
              <span className="text-sm font-medium text-brown">Syllabus PDF URL</span>
              <input
                className="mt-1 w-full border rounded-lg px-3 py-2"
                value={program.syllabusPreview?.pdfUrl || ''}
                onChange={(e) => updateSyllabus({ pdfUrl: e.target.value })}
              />
            </label>
            <input
              type="file"
              accept="application/pdf"
              onChange={(e) => {
                const file = e.target.files?.[0]
                if (file) {
                  uploadAsset(
                    file,
                    (url, current) => ({
                      ...current,
                      syllabusPreview: {
                        ...(current.syllabusPreview || {}),
                        pdfUrl: url,
                      },
                    }),
                    'syllabus-pdf',
                  )
                }
              }}
              className="block w-full text-sm text-brown"
            />
            {uploadingField === 'syllabus-pdf' && <p className="text-xs text-brown/70">Uploading PDF...</p>}
            <AssetPreview url={program.syllabusPreview?.pdfUrl} label="syllabus PDF" />
            <label className="block">
              <span className="text-sm font-medium text-brown">Syllabus preview image URL</span>
              <input
                className="mt-1 w-full border rounded-lg px-3 py-2"
                value={program.syllabusPreview?.previewImageUrl || ''}
                onChange={(e) => updateSyllabus({ previewImageUrl: e.target.value })}
              />
            </label>
            <input
              type="file"
              accept="image/*"
              onChange={(e) => {
                const file = e.target.files?.[0]
                if (file) {
                  uploadAsset(
                    file,
                    (url, current) => ({
                      ...current,
                      syllabusPreview: {
                        ...(current.syllabusPreview || {}),
                        previewImageUrl: url,
                      },
                    }),
                    'syllabus-image',
                  )
                }
              }}
              className="block w-full text-sm text-brown"
            />
            {uploadingField === 'syllabus-image' && <p className="text-xs text-brown/70">Uploading preview image...</p>}
            <AssetPreview url={program.syllabusPreview?.previewImageUrl} label="syllabus preview image" />
          </div>

          <div className="border-t border-brown/10 pt-5 space-y-4">
            <div className="flex items-center justify-between gap-3">
              <div>
                <h2 className="text-lg font-semibold text-brown">Image sections</h2>
                <p className="text-xs text-brown/70">Use these for sections like kit, live practice, or classroom moments. Canva size: 1200 x 900 px.</p>
              </div>
              <button
                type="button"
                className="px-3 py-2 border border-brown text-brown rounded-lg text-sm"
                onClick={() =>
                  setProgram({
                    ...program,
                    imageSections: [
                      ...(program.imageSections || []),
                      {
                        id: `section-${Date.now()}`,
                        title: '',
                        description: '',
                        imageUrl: '',
                        imageAlt: '',
                      },
                    ],
                  })
                }
              >
                Add section
              </button>
            </div>
            {(program.imageSections || []).map((section, index) => (
              <div key={section.id} className="border border-brown/10 rounded-lg p-4 space-y-3">
                <input
                  placeholder="Section title"
                  className="w-full border rounded-lg px-3 py-2"
                  value={section.title}
                  onChange={(e) => {
                    const next = [...(program.imageSections || [])]
                    next[index] = { ...section, title: e.target.value }
                    setProgram({ ...program, imageSections: next })
                  }}
                />
                <textarea
                  placeholder="Section description"
                  rows={2}
                  className="w-full border rounded-lg px-3 py-2"
                  value={section.description || ''}
                  onChange={(e) => {
                    const next = [...(program.imageSections || [])]
                    next[index] = { ...section, description: e.target.value }
                    setProgram({ ...program, imageSections: next })
                  }}
                />
                <input
                  placeholder="Image URL"
                  className="w-full border rounded-lg px-3 py-2"
                  value={section.imageUrl}
                  onChange={(e) => {
                    const next = [...(program.imageSections || [])]
                    next[index] = { ...section, imageUrl: e.target.value }
                    setProgram({ ...program, imageSections: next })
                  }}
                />
                <div className="flex items-center gap-3">
                  <input
                    type="file"
                    accept="image/*"
                    onChange={(e) => {
                      const file = e.target.files?.[0]
                      if (file) {
                        uploadAsset(file, (url, current) => {
                          const next = [...(current.imageSections || [])]
                          next[index] = { ...section, imageUrl: url }
                          return { ...current, imageSections: next }
                        }, `section-${section.id}`)
                      }
                    }}
                    className="block w-full text-sm text-brown"
                  />
                  <button
                    type="button"
                    className="text-red-700 text-sm"
                    onClick={() =>
                      setProgram({
                        ...program,
                        imageSections: (program.imageSections || []).filter((item) => item.id !== section.id),
                      })
                    }
                  >
                    Remove
                  </button>
                </div>
                <AssetPreview url={section.imageUrl} label={`${section.title || 'section'} image`} />
              </div>
            ))}
          </div>

          <div className="border-t border-brown/10 pt-5 space-y-4">
            <div className="flex items-center justify-between gap-3">
              <div>
                <h2 className="text-lg font-semibold text-brown">Masterclass gallery</h2>
                <p className="text-xs text-brown/70">Upload square training photos. Canva size: 1080 x 1080 px.</p>
              </div>
              <button
                type="button"
                className="px-3 py-2 border border-brown text-brown rounded-lg text-sm"
                onClick={() =>
                  setProgram({
                    ...program,
                    galleryImages: [
                      ...(program.galleryImages || []),
                      {
                        id: `gallery-${Date.now()}`,
                        imageUrl: '',
                        imageAlt: '',
                        caption: '',
                      },
                    ],
                  })
                }
              >
                Add image
              </button>
            </div>
            {(program.galleryImages || []).map((image, index) => (
              <div key={image.id} className="border border-brown/10 rounded-lg p-4 space-y-3">
                <input
                  placeholder="Image URL"
                  className="w-full border rounded-lg px-3 py-2"
                  value={image.imageUrl}
                  onChange={(e) => {
                    const next = [...(program.galleryImages || [])]
                    next[index] = { ...image, imageUrl: e.target.value }
                    setProgram({ ...program, galleryImages: next })
                  }}
                />
                <input
                  placeholder="Caption"
                  className="w-full border rounded-lg px-3 py-2"
                  value={image.caption || ''}
                  onChange={(e) => {
                    const next = [...(program.galleryImages || [])]
                    next[index] = { ...image, caption: e.target.value }
                    setProgram({ ...program, galleryImages: next })
                  }}
                />
                <div className="flex items-center gap-3">
                  <input
                    type="file"
                    accept="image/*"
                    onChange={(e) => {
                      const file = e.target.files?.[0]
                      if (file) {
                        uploadAsset(file, (url, current) => {
                          const next = [...(current.galleryImages || [])]
                          next[index] = { ...image, imageUrl: url }
                          return { ...current, galleryImages: next }
                        }, `gallery-${image.id}`)
                      }
                    }}
                    className="block w-full text-sm text-brown"
                  />
                  <button
                    type="button"
                    className="text-red-700 text-sm"
                    onClick={() =>
                      setProgram({
                        ...program,
                        galleryImages: (program.galleryImages || []).filter((item) => item.id !== image.id),
                      })
                    }
                  >
                    Remove
                  </button>
                </div>
                <AssetPreview url={image.imageUrl} label={image.caption || 'gallery image'} />
              </div>
            ))}
          </div>

          <div className="border-t border-brown/10 pt-5 space-y-4">
            <div className="flex items-center justify-between gap-3">
              <div>
                <h2 className="text-lg font-semibold text-brown">Homepage feature</h2>
                <p className="text-xs text-brown/70">Canva size: 1200 x 900 px for the homepage card image.</p>
              </div>
              <label className="flex items-center gap-2 text-sm text-brown">
                <input
                  type="checkbox"
                  checked={program.homepageFeature?.enabled !== false}
                  onChange={(e) =>
                    setProgram({
                      ...program,
                      homepageFeature: {
                        ...(program.homepageFeature || { enabled: true }),
                        enabled: e.target.checked,
                      },
                    })
                  }
                />
                Show
              </label>
            </div>
            <input
              placeholder="Homepage title"
              className="w-full border rounded-lg px-3 py-2"
              value={program.homepageFeature?.title || ''}
              onChange={(e) =>
                setProgram({
                  ...program,
                  homepageFeature: {
                    ...(program.homepageFeature || { enabled: true }),
                    title: e.target.value,
                  },
                })
              }
            />
            <textarea
              placeholder="Homepage description"
              rows={2}
              className="w-full border rounded-lg px-3 py-2"
              value={program.homepageFeature?.description || ''}
              onChange={(e) =>
                setProgram({
                  ...program,
                  homepageFeature: {
                    ...(program.homepageFeature || { enabled: true }),
                    description: e.target.value,
                  },
                })
              }
            />
            <input
              placeholder="Homepage image URL"
              className="w-full border rounded-lg px-3 py-2"
              value={program.homepageFeature?.imageUrl || ''}
              onChange={(e) =>
                setProgram({
                  ...program,
                  homepageFeature: {
                    ...(program.homepageFeature || { enabled: true }),
                    imageUrl: e.target.value,
                  },
                })
              }
            />
            <input
              type="file"
              accept="image/*"
              onChange={(e) => {
                const file = e.target.files?.[0]
                if (file) {
                  uploadAsset(file, (url, current) => ({
                      ...current,
                      homepageFeature: {
                        ...(current.homepageFeature || { enabled: true }),
                        imageUrl: url,
                      },
                    }), 'homepage')
                }
              }}
              className="block w-full text-sm text-brown"
            />
            <AssetPreview url={program.homepageFeature?.imageUrl} label="homepage masterclass image" />
          </div>

          <div className="border-t border-brown/10 pt-5 space-y-4">
            <div>
              <h2 className="text-lg font-semibold text-brown">Paid course content</h2>
              <p className="text-xs text-brown/70">
                Choose what students can access after payment: the uploaded PDF or the
                interactive course page.
              </p>
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              <label className={`cursor-pointer rounded-lg border p-4 ${program.courseMaterialType !== 'interactive' ? 'border-brown bg-brown/5' : 'border-brown/20'}`}>
                <input
                  type="radio"
                  name="courseMaterialType"
                  value="pdf"
                  checked={program.courseMaterialType !== 'interactive'}
                  onChange={() => setProgram({ ...program, courseMaterialType: 'pdf' })}
                  className="mr-2"
                />
                <span className="font-semibold text-brown">PDF course</span>
                <p className="mt-1 text-xs text-brown/70">
                  Students open/download the uploaded syllabus/course PDF.
                </p>
              </label>
              <label className={`cursor-pointer rounded-lg border p-4 ${program.courseMaterialType === 'interactive' ? 'border-brown bg-brown/5' : 'border-brown/20'}`}>
                <input
                  type="radio"
                  name="courseMaterialType"
                  value="interactive"
                  checked={program.courseMaterialType === 'interactive'}
                  onChange={() => setProgram({ ...program, courseMaterialType: 'interactive' })}
                  className="mr-2"
                />
                <span className="font-semibold text-brown">Interactive course</span>
                <p className="mt-1 text-xs text-brown/70">
                  Students see the JSX-style module/course page.
                </p>
              </label>
            </div>
            <label className="block">
              <span className="text-sm font-medium text-brown">Paid course PDF URL</span>
              <input
                className="mt-1 w-full border rounded-lg px-3 py-2"
                value={program.coursePdfUrl || program.syllabusPreview?.pdfUrl || ''}
                onChange={(e) => setProgram({ ...program, coursePdfUrl: e.target.value })}
              />
            </label>
            <div className="flex flex-wrap items-center gap-3">
              <input
                type="file"
                accept="application/pdf"
                onChange={(e) => {
                  const file = e.target.files?.[0]
                  if (file) {
                    uploadAsset(file, (url, current) => ({ ...current, coursePdfUrl: url }), 'course-pdf')
                  }
                }}
                className="block text-sm text-brown"
              />
              {program.syllabusPreview?.pdfUrl && (
                <button
                  type="button"
                  className="px-3 py-2 border border-brown text-brown rounded-lg text-sm"
                  onClick={() => setProgram({ ...program, coursePdfUrl: program.syllabusPreview?.pdfUrl })}
                >
                  Use syllabus PDF
                </button>
              )}
            </div>
            {uploadingField === 'course-pdf' && <p className="text-xs text-brown/70">Uploading course PDF...</p>}
            <AssetPreview url={program.coursePdfUrl || program.syllabusPreview?.pdfUrl} label="paid course PDF" />
            <p className="text-xs text-brown/70">
              If you choose PDF, make sure this PDF URL is filled in before students pay.
            </p>
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                className="px-3 py-2 border border-brown text-brown rounded-lg text-sm"
                onClick={() => {
                  try {
                    setCourseContentText(formatJson(JSON.parse(courseContentText)))
                  } catch {
                    setMessage({
                      type: 'error',
                      text: 'Course content JSON is invalid, so it cannot be formatted yet.',
                    })
                  }
                }}
              >
                Format JSON
              </button>
              <button
                type="button"
                className="px-3 py-2 border border-brown/40 text-brown rounded-lg text-sm"
                onClick={() => setCourseContentText(formatJson(defaultCourseContentTemplate))}
              >
                Load template
              </button>
            </div>
            <textarea
              rows={24}
              className="mt-1 w-full font-mono text-xs border rounded-lg px-3 py-2"
              value={courseContentText}
              onChange={(e) => setCourseContentText(e.target.value)}
              spellCheck={false}
            />
          </div>
          <label className="flex items-center gap-2">
            <input
              type="checkbox"
              checked={program.isActive}
              onChange={(e) => setProgram({ ...program, isActive: e.target.checked })}
            />
            <span className="text-sm text-brown">Active (visible on public page)</span>
          </label>
          <button
            onClick={handleSave}
            disabled={saving}
            className="w-full py-3 bg-brown text-white rounded-lg font-medium disabled:opacity-50"
          >
            {saving ? 'Saving...' : 'Save Program'}
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
    </div>
  )
}
