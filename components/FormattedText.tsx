import Link from 'next/link'
import { Fragment, ReactNode, createElement } from 'react'

type FormattedTextProps = {
  text: string
  className?: string
  as?: 'span' | 'p' | 'div'
  autoLink?: boolean
}

const AUTO_LINK_PATTERNS = [
  { regex: /pre-appointment\s+guidelines?/gi, href: '/before-your-appointment' },
  { regex: /\bpolicies\b/gi, href: '/policies' },
]

function linkifyText(text: string, keyPrefix: string): ReactNode[] {
  const matches: Array<{ index: number; length: number; text: string; href: string }> = []

  AUTO_LINK_PATTERNS.forEach(({ regex, href }) => {
    regex.lastIndex = 0
    let match
    while ((match = regex.exec(text)) !== null) {
      matches.push({ index: match.index, length: match[0].length, text: match[0], href })
    }
  })

  if (matches.length === 0) return [text]

  matches.sort((a, b) => a.index - b.index)

  const nodes: ReactNode[] = []
  let lastIndex = 0
  matches.forEach((match, index) => {
    if (match.index < lastIndex) return
    if (match.index > lastIndex) {
      nodes.push(text.slice(lastIndex, match.index))
    }
    nodes.push(
      <Link
        key={`${keyPrefix}-link-${index}`}
        href={match.href}
        className="font-semibold text-[var(--color-primary)] hover:underline"
      >
        {match.text}
      </Link>
    )
    lastIndex = match.index + match.length
  })

  if (lastIndex < text.length) {
    nodes.push(text.slice(lastIndex))
  }

  return nodes
}

function parseInlineMarkdown(text: string, autoLink: boolean, keyPrefix: string): ReactNode[] {
  const nodes: ReactNode[] = []
  let index = 0
  let key = 0

  while (index < text.length) {
    const boldStart = text.indexOf('**', index)
    const italicStart = text.indexOf('*', index)
    const nextStart =
      boldStart === -1
        ? italicStart
        : italicStart === -1
          ? boldStart
          : Math.min(boldStart, italicStart)

    if (nextStart === -1) {
      nodes.push(...(autoLink ? linkifyText(text.slice(index), `${keyPrefix}-${key++}`) : [text.slice(index)]))
      break
    }

    if (nextStart > index) {
      const plainText = text.slice(index, nextStart)
      nodes.push(...(autoLink ? linkifyText(plainText, `${keyPrefix}-${key++}`) : [plainText]))
    }

    if (text.startsWith('**', nextStart)) {
      const end = text.indexOf('**', nextStart + 2)
      if (end === -1) {
        nodes.push(text.slice(nextStart))
        break
      }
      nodes.push(
        <strong key={`${keyPrefix}-bold-${key++}`}>
          {parseInlineMarkdown(text.slice(nextStart + 2, end), autoLink, `${keyPrefix}-bold-${key}`)}
        </strong>
      )
      index = end + 2
      continue
    }

    const end = text.indexOf('*', nextStart + 1)
    if (end === -1) {
      nodes.push(text.slice(nextStart))
      break
    }
    nodes.push(
      <em key={`${keyPrefix}-italic-${key++}`}>
        {parseInlineMarkdown(text.slice(nextStart + 1, end), autoLink, `${keyPrefix}-italic-${key}`)}
      </em>
    )
    index = end + 1
  }

  return nodes
}

function renderWithLineBreaks(text: string, autoLink: boolean) {
  const lines = text.split('\n')
  return lines.map((line, index) => (
    <Fragment key={`${line.slice(0, 16)}-${index}`}>
      {parseInlineMarkdown(line, autoLink, `line-${index}`)}
      {index < lines.length - 1 && <br />}
    </Fragment>
  ))
}

export default function FormattedText({ text, className, as = 'span', autoLink = false }: FormattedTextProps) {
  return createElement(as, { className }, renderWithLineBreaks(text || '', autoLink))
}
