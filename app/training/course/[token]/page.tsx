import Link from 'next/link'
import LashDiaryCourse from '@/components/training/LashDiaryCourse'
import {
  getEnrollmentByAccessToken,
  getIntakeById,
  getActiveProgram,
} from '@/lib/training-data'
import { hasTrainingCourseMaterial } from '@/lib/training-utils'

export const dynamic = 'force-dynamic'
export const revalidate = 0

export default async function TrainingCoursePage({
  params,
}: {
  params: { token: string }
}) {
  const enrollment = await getEnrollmentByAccessToken(params.token)
  const hasAccess =
    enrollment?.paymentStatus === 'completed' || enrollment?.paymentStatus === 'manual'

  if (!enrollment || !hasAccess) {
    return (
      <div className="min-h-screen bg-baby-pink-light flex items-center justify-center px-4 text-center text-brown">
        <div className="max-w-md rounded-xl bg-white p-8 shadow">
          <h1 className="mb-3 text-2xl font-bold">Course access required</h1>
          <p className="mb-6 text-brown/75">
            This course page is available after a confirmed training enrollment.
          </p>
          <Link href="/masterclass" className="inline-flex rounded-lg bg-brown px-6 py-3 font-semibold text-white">
            View masterclass cohorts
          </Link>
        </div>
      </div>
    )
  }

  const [intake, program] = await Promise.all([
    getIntakeById(enrollment.intakeId),
    getActiveProgram(),
  ])
  const coursePdfUrl = program?.coursePdfUrl || program?.syllabusPreview?.pdfUrl || ''
  const usePdf = program?.courseMaterialType !== 'interactive'
  const courseMaterialReady = hasTrainingCourseMaterial(program)

  return (
    <div>
      <div className="bg-[#0d0b09] border-b border-[#c9a96e]/20 px-4 py-3 text-[#e8ddd0]">
        <div className="mx-auto flex max-w-4xl flex-col gap-1 text-sm sm:flex-row sm:items-center sm:justify-between">
          <p>
            Signed in by private access link for <strong>{enrollment.name}</strong>
          </p>
          <p className="text-[#c9a96e]">
            {program?.title || 'Lash training'} {intake ? `- ${intake.title}` : ''}
            {enrollment.selectedTiming ? ` - ${enrollment.selectedTiming}` : ''}
          </p>
        </div>
      </div>
      {!courseMaterialReady ? (
        <main className="min-h-screen bg-baby-pink-light px-4 py-10 text-brown">
          <div className="mx-auto max-w-2xl rounded-xl bg-white p-8 text-center shadow">
            <h1 className="mb-3 text-3xl font-bold">Course resources coming soon</h1>
            <p className="text-brown/75">
              Your enrollment is confirmed. The course resources are still being prepared
              and will be shared with you as soon as they are ready.
            </p>
          </div>
        </main>
      ) : usePdf ? (
        <main className="min-h-screen bg-baby-pink-light px-4 py-10 text-brown">
          <div className="mx-auto max-w-5xl">
            <div className="mb-6 rounded-xl bg-white p-6 shadow">
              <h1 className="mb-2 text-3xl font-bold">{program?.title || 'Your training course'}</h1>
              <p className="text-brown/75">
                Your paid course material is available below. Keep your confirmation email safe,
                it contains this private access link.
              </p>
              <div className="mt-5 flex flex-wrap gap-3">
                <a
                  href={coursePdfUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex rounded-lg bg-brown px-6 py-3 font-semibold text-white"
                >
                  Open PDF in new tab
                </a>
                <a
                  href={coursePdfUrl}
                  download
                  className="inline-flex rounded-lg border border-brown px-6 py-3 font-semibold text-brown"
                >
                  Download PDF
                </a>
              </div>
            </div>
            <div className="overflow-hidden rounded-xl bg-white shadow">
              <iframe
                src={coursePdfUrl}
                title="Training course PDF"
                className="h-[80vh] w-full"
              />
            </div>
          </div>
        </main>
      ) : (
        <LashDiaryCourse courseContent={program?.courseContent} />
      )}
    </div>
  )
}
