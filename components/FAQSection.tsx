'use client'

import { useState } from 'react'
import type { FAQItem } from '@/lib/faq-utils'

interface FAQSectionProps {
  questions: FAQItem[]
}

export default function FAQSection({ questions }: FAQSectionProps) {
  const [openIndex, setOpenIndex] = useState<number | null>(null)

  const toggleQuestion = (index: number) => {
    setOpenIndex(openIndex === index ? null : index)
  }

  return (
    <div className="space-y-3">
      {questions.map((item, index) => {
        const isOpen = openIndex === index
        return (
          <div
            key={item.id}
            className="border border-brown-light/40 rounded-xl overflow-hidden transition-all duration-300 hover:border-brown-light hover:shadow-soft"
          >
            <button
              onClick={() => toggleQuestion(index)}
              className="w-full px-5 py-4 text-left flex items-center justify-between gap-4 bg-white hover:bg-brown-light/5 transition-colors"
              aria-expanded={isOpen}
            >
              <span className="font-semibold text-brown-dark text-base sm:text-lg pr-4">
                {item.question}
              </span>
              <span
                className={`text-brown-dark text-2xl font-light transition-transform duration-300 flex-shrink-0 ${
                  isOpen ? 'rotate-180' : ''
                }`}
              >
                ▼
              </span>
            </button>
            <div
              className={`overflow-hidden transition-all duration-300 ${
                isOpen ? 'max-h-[1000px] opacity-100' : 'max-h-0 opacity-0'
              }`}
            >
              <div className="px-5 py-4 bg-brown-light/5 border-t border-brown-light/20">
                <p className="text-brown text-base leading-relaxed whitespace-pre-line">
                  {item.answer}
                </p>
              </div>
            </div>
          </div>
        )
      })}
    </div>
  )
}

