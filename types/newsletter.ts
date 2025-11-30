export type NewsletterBlockType =
  | 'hero'
  | 'text'
  | 'image'
  | 'button'
  | 'divider'
  | 'spacer'
  | 'highlight'

export type TextAlignment = 'left' | 'center' | 'right'

export interface NewsletterButtonConfig {
  label: string
  url: string
  style?: 'solid' | 'outline' | 'link'
  alignment?: TextAlignment
}

export interface NewsletterBlockBase {
  id: string
  type: NewsletterBlockType
  backgroundColor?: string
  paddingTop?: number
  paddingBottom?: number
}

export interface NewsletterHeroBlock extends NewsletterBlockBase {
  type: 'hero'
  eyebrow?: string
  heading: string
  subheading?: string
  imageUrl?: string
  alignment: TextAlignment
  button?: NewsletterButtonConfig
}

export interface NewsletterTextBlock extends NewsletterBlockBase {
  type: 'text'
  heading?: string
  body: string
  alignment: TextAlignment
}

export interface NewsletterImageBlock extends NewsletterBlockBase {
  type: 'image'
  imageUrl: string
  caption?: string
  fullWidth?: boolean
  borderRadius?: number
}

export interface NewsletterButtonBlock extends NewsletterBlockBase {
  type: 'button'
  button: NewsletterButtonConfig
}

export interface NewsletterDividerBlock extends NewsletterBlockBase {
  type: 'divider'
  thickness?: number
  color?: string
  width?: string
  style?: 'solid' | 'dashed'
}

export interface NewsletterSpacerBlock extends NewsletterBlockBase {
  type: 'spacer'
  height: number
}

export interface NewsletterHighlightBlock extends NewsletterBlockBase {
  type: 'highlight'
  eyebrow?: string
  heading: string
  body?: string
  badge?: string
  imageUrl?: string
  button?: NewsletterButtonConfig
}

export type NewsletterBlock =
  | NewsletterHeroBlock
  | NewsletterTextBlock
  | NewsletterImageBlock
  | NewsletterButtonBlock
  | NewsletterDividerBlock
  | NewsletterSpacerBlock
  | NewsletterHighlightBlock

export interface NewsletterTheme {
  id: string
  name: string
  description?: string
  backgroundColor: string
  surfaceColor: string
  textColor: string
  subtextColor: string
  accentColor: string
  accentContrast: string
  buttonColor: string
  buttonTextColor: string
  buttonShape?: 'pill' | 'rounded' | 'square'
  headingFont: string
  bodyFont: string
}

export interface NewsletterTemplate {
  id: string
  name: string
  description: string
  themeId: string
  blocks: Omit<NewsletterBlock, 'id'>[]
}

export interface NewsletterRecord {
  id: string
  title: string
  description?: string
  subject?: string
  preheader?: string
  themeId: string
  blocks?: NewsletterBlock[]
  contentHtml?: string
  compiledAt?: string
  pdfUrl?: string
  thumbnailUrl?: string
  imagePages?: Array<{
    pageNumber: number
    imageUrl: string
    width: number
    height: number
  }>
  createdAt: string
  updatedAt?: string
  sentAt?: string
  totalRecipients?: number
  opened?: number
  clicked?: number
}

export const NEWSLETTER_THEMES: NewsletterTheme[] = [
  {
    id: 'rose-glow',
    name: 'Rose Glow',
    description: 'Soft blush background with deep chocolate typography.',
    backgroundColor: '#f9f4f1',
    surfaceColor: '#ffffff',
    textColor: '#3c2622',
    subtextColor: '#7a5c4f',
    accentColor: '#c28b6f',
    accentContrast: '#fff4ee',
    buttonColor: '#3c2622',
    buttonTextColor: '#ffffff',
    buttonShape: 'pill',
    headingFont: "'Playfair Display', Georgia, serif",
    bodyFont: "'Montserrat', Arial, sans-serif",
  },
  {
    id: 'burgundy-cream',
    name: 'Burgundy Cream',
    description: 'Rich burgundy with elegant cream accents.',
    backgroundColor: '#faf8f5',
    surfaceColor: '#ffffff',
    textColor: '#4a1f1f',
    subtextColor: '#7a4a4a',
    accentColor: '#8b2d3e',
    accentContrast: '#fff8f0',
    buttonColor: '#8b2d3e',
    buttonTextColor: '#ffffff',
    buttonShape: 'rounded',
    headingFont: "'Playfair Display', Georgia, serif",
    bodyFont: "'Montserrat', Arial, sans-serif",
  },
  {
    id: 'cream-minimal',
    name: 'Cream Minimal',
    description: 'Clean ivory base with muted green accent.',
    backgroundColor: '#f6f1e6',
    surfaceColor: '#ffffff',
    textColor: '#2f2a26',
    subtextColor: '#6f665d',
    accentColor: '#7a9d7b',
    accentContrast: '#ffffff',
    buttonColor: '#7a9d7b',
    buttonTextColor: '#ffffff',
    buttonShape: 'square',
    headingFont: "'Libre Baskerville', Georgia, serif",
    bodyFont: "'Nunito', 'Helvetica Neue', sans-serif",
  },
]

export const NEWSLETTER_TEMPLATES: NewsletterTemplate[] = [
  {
    id: 'promo-classic',
    name: 'Signature Promo',
    description: 'Hero, intro text and CTA button for quick campaigns.',
    themeId: 'rose-glow',
    blocks: [
      {
        type: 'hero',
        eyebrow: 'Monthly Glow',
        heading: 'December Glam Specials',
        subheading: 'Limited spots for lash lifts, brow lamination and pamper bundles.',
        alignment: 'center',
        button: {
          label: 'Book Now',
          url: 'https://your-booking-link.com',
          style: 'solid',
        },
      },
      {
        type: 'text',
        heading: "What's inside",
        body:
          '• Classic + Volume hybrid sets at 15% off\n• Complimentary brow shaping with every facial\n• Refer a friend and both enjoy Ksh 1,000 off',
        alignment: 'left',
      },
      {
        type: 'button',
        button: {
          label: 'Reserve My Slot',
          url: 'https://your-booking-link.com',
          style: 'solid',
          alignment: 'center',
        },
      },
    ] as unknown as Omit<NewsletterBlock, 'id'>[],
  },
  {
    id: 'storytelling',
    name: 'Storytelling',
    description: 'Intro story, feature image and testimonial highlight.',
    themeId: 'cream-minimal',
    blocks: [
      {
        type: 'hero',
        eyebrow: 'Lash Diary',
        heading: 'Inside the Studio',
        subheading: 'A quick peek at how we prep every bespoke appointment.',
        alignment: 'left',
      },
      {
        type: 'image',
        imageUrl: '',
        caption: 'Soft glam set created by our master artists.',
        fullWidth: true,
        borderRadius: 16,
      },
      {
        type: 'highlight',
        eyebrow: 'Client Love',
        heading: '"My lashes survive every photoshoot weekend."',
        body: 'Catherine — 3rd refill • Nairobi',
        button: {
          label: 'See Packages',
          url: 'https://your-booking-link.com',
          style: 'outline',
        },
      },
    ] as unknown as Omit<NewsletterBlock, 'id'>[],
  },
  {
    id: 'countdown',
    name: 'Launch Countdown',
    description: 'Announcement with hero and supporting text.',
    themeId: 'burgundy-cream',
    blocks: [
      {
        type: 'hero',
        eyebrow: 'New Drop',
        heading: 'Skin Reset Ritual arrives Jan 15',
        subheading: 'A sensorial, corrective facial for dull skin days.',
        alignment: 'center',
        button: {
          label: 'Get Early Access',
          url: 'https://your-booking-link.com',
          style: 'solid',
        },
      },
      {
        type: 'text',
        heading: "Why you'll love it",
        body:
          '• Multi-acid polish that keeps barrier calm\n• Guided facial massage to melt jaw tension\n• Complimentary aftercare kit for early birds',
        alignment: 'left',
      },
      {
        type: 'button',
        button: {
          label: 'Join Waitlist',
          url: 'https://your-booking-link.com',
          style: 'solid',
          alignment: 'center',
        },
      },
    ] as unknown as Omit<NewsletterBlock, 'id'>[],
  },
]

export const DEFAULT_NEWSLETTER_BLOCKS: Omit<NewsletterBlock, 'id'>[] = [
  {
    type: 'hero',
    eyebrow: 'Fresh Drop',
    heading: 'Untitled Newsletter',
    subheading: 'Add your story, promo or studio moments here.',
    alignment: 'center',
    button: {
      label: 'Book Now',
      url: 'https://booking-link.com',
      style: 'solid',
    },
  } as Omit<NewsletterHeroBlock, 'id'>,
] as Omit<NewsletterBlock, 'id'>[]


