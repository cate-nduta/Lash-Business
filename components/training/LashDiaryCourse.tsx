'use client'

import { useMemo, useState } from 'react'
import type { TrainingCourseContent, TrainingCourseModule } from '@/types/training'

const courseData: TrainingCourseContent = {
  title: 'LashDiary Professional Cluster Lash Training',
  subtitle: 'A 5-Day Mastery Programme',
  price: 'KSh 10,000',
  tagline:
    "Where skill meets integrity, because beautiful lashes should never cost your client's natural lashes.",
  philosophy:
    'This course is built on one non-negotiable: client lash health comes first. We teach what is necessary, what is safe, and what is honest. Gorgeous results and healthy lashes are not a trade-off. They are the same goal.',
  modules: [
    {
      id: 1,
      day: 'Day 1',
      title: 'Understanding Cluster Lashes',
      color: '#c9a96e',
      intro:
        'Understand what cluster lashes are, what they are not, and how to educate clients without overpromising.',
      sections: [
        {
          heading: 'History & Evolution',
          content: [
            'Cluster lashes started as a short-term, accessible alternative to full lash extensions.',
            'Clients now expect longer retention, so correct education around realistic wear and safety matters.',
          ],
        },
        {
          heading: 'Cluster Lashes vs Strip Lashes vs Lash Extensions',
          content: [
            'Strip lashes sit on the skin and are removed daily. Cluster lashes attach to natural lashes and need professional product control.',
            'Classic lash extensions are applied one-to-one with semi-permanent adhesive. Cluster lashes use bundles and must not be applied with classic extension glue.',
            'Warning: classic lash extension adhesive on clusters can fuse natural lashes together, restrict the growth cycle, and cause premature lash loss.',
          ],
        },
        {
          heading: 'Benefits, Limitations & Expectations',
          content: [
            'Clusters are faster and more affordable than full extensions, with flexible styles from natural to dramatic.',
            'They are not designed for permanent wear. Healthy retention is usually 1-2 weeks, sometimes up to 3 weeks.',
            'Never promise retention you cannot control. Results depend on lash cycle, lifestyle, skincare habits, and aftercare.',
          ],
        },
      ],
      outcome:
        'Students understand cluster lashes, realistic retention, and why correct products matter from the first service.',
    },
    {
      id: 2,
      day: 'Day 1',
      title: 'Lash Health & Safety',
      color: '#a87c5f',
      intro:
        'LashDiary prioritises safety. A beautiful set on a damaged lash line is not a success.',
      sections: [
        {
          heading: 'Natural Lash Fundamentals',
          content: [
            'Natural lashes move through anagen, catagen, and telogen phases.',
            'Shedding is normal, and chasing one-month retention can trap lashes that should naturally shed.',
          ],
        },
        {
          heading: 'Contraindications & Reactions',
          content: [
            'Do not proceed with active eye infection, recent surgery without clearance, known adhesive allergy, or severely damaged lashes.',
            'Offer patch tests 24-48 hours before first appointments and document client history.',
            'For serious swelling, hives, intense itching, or difficulty opening eyes, direct the client to seek medical care.',
          ],
        },
        {
          heading: 'Sanitation Standards',
          content: [
            'Sanitise tools between clients with approved disinfectant.',
            'Discard single-use items after every client.',
            'Keep a clean workstation, fresh pillow cover, and clean hands for every service.',
          ],
        },
      ],
      outcome:
        'Students can identify contraindications, explain the lash cycle, and uphold sanitation standards.',
    },
    {
      id: 3,
      day: 'Day 2',
      title: 'Products & Tools',
      color: '#7d9e8c',
      intro:
        'The wrong adhesive alone can undo everything else. Product knowledge is non-negotiable.',
      sections: [
        {
          heading: 'Cluster Lash Types',
          content: [
            'Short clusters suit inner corners and natural sets; medium clusters are versatile; long clusters create drama but need caution.',
            'Wispy and volume clusters create texture and fullness but must match natural lash strength.',
          ],
        },
        {
          heading: 'Adhesives',
          content: [
            'Use adhesive formulated for cluster/DIY lash use or flexible bond-and-seal systems.',
            'Never use classic lash extension cyanoacrylate glue on clusters.',
            'Use micro-dot adhesive control and store products according to manufacturer guidance.',
          ],
        },
        {
          heading: 'Additional Products',
          content: [
            'Lash cleanser, primer, sealant, remover, tweezers, mapping tools, pads, and tape all support clean application.',
          ],
        },
      ],
      outcome:
        'Students know how to choose, use, store, and maintain the correct products and tools.',
    },
    {
      id: 4,
      day: 'Day 2',
      title: 'Consultation & Client Assessment',
      color: '#6e8fa8',
      intro:
        'Consultation protects the client, the technician, and the final result.',
      sections: [
        {
          heading: 'Consultation Process',
          content: [
            'Use intake forms for medical history, allergies, previous lash history, reactions, and desired look.',
            'Discuss lifestyle, event needs, and what a bad lash experience would look like to the client.',
          ],
        },
        {
          heading: 'Eye Analysis',
          content: [
            'Assess eye shape, lash density, lash strength, direction, gaps, and existing damage.',
            'If lashes are too weak or damaged, recommend a recovery period instead of forcing the service.',
          ],
        },
      ],
      outcome:
        'Students can recommend styles honestly and identify when a service is not suitable.',
    },
    {
      id: 5,
      day: 'Day 3',
      title: 'Styling & Mapping',
      color: '#9e7db5',
      intro:
        'Mapping turns application from guesswork into intention.',
      sections: [
        {
          heading: 'LashDiary Signature Styles',
          content: [
            'Natural, Doll Eye, Cat Eye, Wispy, and Soft Volume styles each serve different goals and eye shapes.',
          ],
        },
        {
          heading: 'Mapping Principles',
          content: [
            'Map both eyes before application to support balance, symmetry, and face framing.',
            'Use zones and document maps so future appointments are consistent.',
          ],
        },
      ],
      outcome:
        'Students can create customised maps and document them for future appointments.',
    },
    {
      id: 6,
      day: 'Day 3',
      title: 'Application Mastery',
      color: '#c9a96e',
      intro:
        'Clean setup, careful placement, and patient technique create polished sets.',
      sections: [
        {
          heading: 'Preparation',
          content: [
            'Set up the client comfortably, cleanse thoroughly, secure lower lashes, and prepare the lash map.',
          ],
        },
        {
          heading: 'Application Technique',
          content: [
            'Place clusters on natural lashes 1-2mm from the root, not on the skin.',
            'Control direction, spacing, adhesive amount, and symmetry across both eyes.',
          ],
        },
        {
          heading: 'Troubleshooting',
          content: [
            'Address gaps with smaller clusters; prevent clumping with adhesive control; troubleshoot lifting through prep and placement.',
          ],
        },
      ],
      outcome:
        'Students can complete a full set with correct placement, spacing, adhesive use, and troubleshooting.',
    },
    {
      id: 7,
      day: 'Day 4',
      title: 'Retention & Aftercare',
      color: '#a87c5f',
      intro:
        'Healthy retention matters more than chasing unsafe wear time.',
      sections: [
        {
          heading: 'Temporary Wear Education',
          content: [
            'Teach clients that clusters are temporary and normally last 1-2 weeks with proper care.',
          ],
        },
        {
          heading: 'Aftercare Instructions',
          content: [
            'Avoid water/steam during curing, cleanse with oil-free lash cleanser, avoid oil products, and never pull at clusters.',
          ],
        },
        {
          heading: 'LashDiary Retention Philosophy',
          content: [
            'Longer is not always better. Old clusters can trap natural lashes and cause breakage during removal.',
          ],
        },
      ],
      outcome:
        'Students can brief clients clearly and recognise when removal is necessary.',
    },
    {
      id: 8,
      day: 'Day 4',
      title: 'Infills & Removals',
      color: '#7d9e8c',
      intro:
        'Safe removal is as important as application.',
      sections: [
        {
          heading: 'Infills',
          content: [
            'Infill only when remaining clusters are healthy, aligned, and around 30-50% present.',
            'Choose full removal when the set is too grown out, misaligned, or potentially damaging.',
          ],
        },
        {
          heading: 'Removal Procedure',
          content: [
            'Saturate with safe remover, wait, slide clusters off gently, cleanse, inspect, and document the natural lashes.',
          ],
        },
      ],
      outcome:
        'Students can remove clusters safely and advise clients after removal.',
    },
    {
      id: 9,
      day: 'Day 5',
      title: 'Photography & Content Creation',
      color: '#6e8fa8',
      intro:
        'Great content builds trust and positions you as a knowledgeable professional.',
      sections: [
        {
          heading: 'Before & After Photography',
          content: [
            'Use clean lighting, consistent backgrounds, and multiple angles.',
            'Always get permission for before and after photos.',
          ],
        },
        {
          heading: 'Educational Content',
          content: [
            'Create short application clips and educational posts that correct misinformation and build authority.',
          ],
        },
      ],
      outcome:
        'Students can document their work and create content that educates and attracts clients.',
    },
    {
      id: 10,
      day: 'Day 5',
      title: 'Business Fundamentals',
      color: '#9e7db5',
      intro:
        'Skill gets clients in the door. Operations keep the business sustainable.',
      sections: [
        {
          heading: 'Pricing, Supplies & Policies',
          content: [
            'Price based on supplies, time, overhead, training, and quality of work.',
            'Track cost per set, manage supplies, require deposits, and state cancellation and late policies clearly.',
          ],
        },
        {
          heading: 'Client Experience & Retention',
          content: [
            'Communicate professionally, send aftercare instructions, keep client records, and protect your working hours.',
          ],
        },
      ],
      outcome:
        'Students can set up basic systems for a professional and sustainable lash business.',
    },
  ],
  practicalAssessment: {
    title: 'Practical Assessment',
    description:
      'Assessed on Day 5. Students demonstrate competence to receive their LashDiary Certificate of Completion.',
    components: [
      'Client consultation',
      'Lash mapping',
      'Full set application',
      'Aftercare briefing',
      'Safe removal',
    ],
  },
  certificate:
    'LashDiary Certificate of Completion - Professional Cluster Lash Technician',
}

const moduleColors: Record<string, { bg: string; border: string; tag: string }> = {
  '#c9a96e': { bg: 'rgba(201,169,110,0.12)', border: 'rgba(201,169,110,0.4)', tag: '#c9a96e' },
  '#a87c5f': { bg: 'rgba(168,124,95,0.12)', border: 'rgba(168,124,95,0.4)', tag: '#a87c5f' },
  '#7d9e8c': { bg: 'rgba(125,158,140,0.12)', border: 'rgba(125,158,140,0.4)', tag: '#7d9e8c' },
  '#6e8fa8': { bg: 'rgba(110,143,168,0.12)', border: 'rgba(110,143,168,0.4)', tag: '#6e8fa8' },
  '#9e7db5': { bg: 'rgba(158,125,181,0.12)', border: 'rgba(158,125,181,0.4)', tag: '#9e7db5' },
}

export default function LashDiaryCourse({
  courseContent,
}: {
  courseContent?: TrainingCourseContent
}) {
  const [activeModule, setActiveModule] = useState<number | null>(null)
  const [expandedSections, setExpandedSections] = useState<Record<string, boolean>>({})
  const data = courseContent || courseData

  const dayGroups = useMemo(
    () =>
      data.modules.reduce<Record<string, TrainingCourseModule[]>>((acc, mod) => {
        if (!acc[mod.day]) acc[mod.day] = []
        acc[mod.day].push(mod)
        return acc
      }, {}),
    [data.modules],
  )
  const days = useMemo(() => {
    const seen = new Set<string>()
    return data.modules
      .map((mod) => mod.day)
      .filter((day) => {
        if (seen.has(day)) return false
        seen.add(day)
        return true
      })
  }, [data.modules])

  const toggleSection = (modId: number, sectionIdx: number) => {
    const key = `${modId}-${sectionIdx}`
    setExpandedSections((prev) => ({ ...prev, [key]: !prev[key] }))
  }

  return (
    <div className="min-h-screen bg-[#0d0b09] text-[#e8ddd0]">
      <section className="relative overflow-hidden border-b border-[#c9a96e]/20 bg-gradient-to-b from-[#1a1410] to-[#0d0b09] px-6 py-16">
        <div className="mx-auto max-w-4xl">
          <p className="mb-4 font-sans text-xs uppercase tracking-[0.25em] text-[#c9a96e]">
            LashDiary - Nairobi
          </p>
          <h1 className="mb-3 text-4xl font-light leading-tight md:text-6xl">
            {data.title}
          </h1>
          <p className="mb-6 font-sans text-sm tracking-wider text-[#8a7d6e]">
            {data.subtitle} - {data.price}
          </p>
          <p className="max-w-2xl text-xl font-light italic leading-relaxed text-[#c4b59a]">
            &quot;{data.tagline}&quot;
          </p>
          <div className="mt-8 max-w-3xl rounded border border-[#c9a96e]/20 bg-[#c9a96e]/5 p-6">
            <p className="mb-3 font-sans text-xs uppercase tracking-[0.2em] text-[#c9a96e]">
              Course Philosophy
            </p>
            <p className="font-sans text-sm font-light leading-7 text-[#b8a890]">
              {data.philosophy}
            </p>
          </div>
        </div>
      </section>

      <nav className="sticky top-0 z-40 border-b border-[#c9a96e]/15 bg-[#0d0b09]/95 px-6 py-4 backdrop-blur">
        <div className="mx-auto flex max-w-4xl gap-6 overflow-x-auto font-sans text-xs uppercase tracking-[0.15em] text-[#6a5f52]">
          {days.map((day) => (
            <button
              key={day}
              type="button"
              className="whitespace-nowrap hover:text-[#c9a96e]"
              onClick={() =>
                document.getElementById(day.replace(' ', '-'))?.scrollIntoView({ behavior: 'smooth' })
              }
            >
              {day}
            </button>
          ))}
          <button
            type="button"
            className="ml-auto whitespace-nowrap hover:text-[#c9a96e]"
            onClick={() => document.getElementById('assessment')?.scrollIntoView({ behavior: 'smooth' })}
          >
            Assessment
          </button>
        </div>
      </nav>

      <main className="mx-auto max-w-4xl px-6 py-10">
        {days.map((day) => (
          <section key={day} id={day.replace(' ', '-')} className="mb-14">
            <div className="mb-6 flex items-center gap-4 border-b border-[#c9a96e]/15 pb-4">
              <h2 className="font-sans text-xs uppercase tracking-[0.2em] text-[#c9a96e]">{day}</h2>
              <div className="h-px flex-1 bg-gradient-to-r from-[#c9a96e]/20 to-transparent" />
            </div>
            {(dayGroups[day] || []).map((mod) => {
              const colors = moduleColors[mod.color] || moduleColors['#c9a96e']
              const isActive = activeModule === mod.id
              return (
                <article key={mod.id} className="mb-6">
                  <button
                    type="button"
                    onClick={() => setActiveModule(isActive ? null : mod.id)}
                    className="w-full rounded-md border p-6 text-left transition hover:-translate-y-0.5"
                    style={{
                      background: isActive ? colors.bg : 'rgba(255,255,255,0.02)',
                      borderColor: isActive ? colors.border : 'rgba(255,255,255,0.07)',
                    }}
                  >
                    <span
                      className="mb-3 inline-flex rounded-full border px-3 py-1 font-sans text-[10px] uppercase tracking-[0.14em]"
                      style={{ background: colors.bg, borderColor: colors.border, color: mod.color }}
                    >
                      Module {mod.id}
                    </span>
                    <h3 className="mb-2 text-2xl text-[#f0e8da]">{mod.title}</h3>
                    <p className="font-sans text-sm font-light leading-6 text-[#8a7d6e]">{mod.intro}</p>
                  </button>

                  {isActive && (
                    <div className="overflow-hidden rounded-b-md border border-t-0" style={{ borderColor: colors.border }}>
                      {mod.sections.map((section, sIdx) => {
                        const key = `${mod.id}-${sIdx}`
                        const isOpen = expandedSections[key] !== false
                        return (
                          <div key={section.heading} className="border-b border-[#c9a96e]/10 last:border-b-0">
                            <button
                              type="button"
                              onClick={() => toggleSection(mod.id, sIdx)}
                              className="flex w-full items-center justify-between bg-black/30 px-6 py-4 text-left"
                            >
                              <h4 className="font-sans text-base font-medium text-[#e0d4c4]">{section.heading}</h4>
                              <span style={{ color: mod.color }}>{isOpen ? '-' : '+'}</span>
                            </button>
                            {isOpen && (
                              <div className="space-y-3 px-6 py-5">
                                {section.content.map((point) => (
                                  <p
                                    key={point}
                                    className={`font-sans text-sm font-light leading-7 ${
                                      point.toLowerCase().includes('warning') ? 'rounded border-l-4 border-red-400/60 bg-red-500/10 p-4 text-[#e8c4a0]' : 'text-[#b0a494]'
                                    }`}
                                  >
                                    {point}
                                  </p>
                                ))}
                              </div>
                            )}
                          </div>
                        )
                      })}
                      <div className="border-t px-6 py-5" style={{ background: colors.bg, borderColor: colors.border }}>
                        <p className="mb-2 font-sans text-[10px] uppercase tracking-[0.18em]" style={{ color: mod.color }}>
                          Learning Outcome
                        </p>
                        <p className="italic leading-7 text-[#c4b59a]">{mod.outcome}</p>
                      </div>
                    </div>
                  )}
                </article>
              )
            })}
          </section>
        ))}

        <section id="assessment" className="rounded-md border border-[#c9a96e]/30">
          <div className="border-b border-[#c9a96e]/20 bg-[#c9a96e]/10 p-7">
            <p className="mb-2 font-sans text-[10px] uppercase tracking-[0.2em] text-[#c9a96e]">Day 5</p>
            <h2 className="mb-2 text-3xl font-light text-[#f0e8da]">{data.practicalAssessment.title}</h2>
            <p className="font-sans text-sm font-light leading-6 text-[#8a7d6e]">
              {data.practicalAssessment.description}
            </p>
          </div>
          <div className="space-y-4 p-7">
            {data.practicalAssessment.components.map((component, index) => (
              <div key={component} className="flex gap-4 border-b border-[#c9a96e]/10 pb-4 last:border-b-0">
                <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-[#c9a96e]/30 bg-[#c9a96e]/10 font-sans text-xs text-[#c9a96e]">
                  {index + 1}
                </span>
                <p className="font-sans text-sm text-[#b0a494]">{component}</p>
              </div>
            ))}
          </div>
          <div className="border-t border-[#c9a96e]/15 bg-[#c9a96e]/5 p-6">
            <p className="italic text-[#c9a96e]">{data.certificate}</p>
          </div>
        </section>
      </main>
    </div>
  )
}
