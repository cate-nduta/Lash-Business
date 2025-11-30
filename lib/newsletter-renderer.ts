import {
  NewsletterBlock,
  NewsletterButtonBlock,
  NewsletterButtonConfig,
  NewsletterDividerBlock,
  NewsletterHeroBlock,
  NewsletterHighlightBlock,
  NewsletterImageBlock,
  NewsletterSpacerBlock,
  NewsletterTextBlock,
  NewsletterTheme,
  NEWSLETTER_THEMES,
} from '@/types/newsletter'

const px = (value?: number, fallback = 0) => `${value ?? fallback}px`

const escapeHtml = (value?: string) =>
  (value || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')

const toMultiline = (value?: string) => escapeHtml(value).replace(/\n/g, '<br />')

const DEFAULT_BASE_URL = 'https://lashdiary.co.ke'

const deriveBaseUrl = () => {
  const candidates = [
    process.env.NEWSLETTER_ASSET_BASE_URL,
    process.env.NEXT_PUBLIC_BASE_URL,
    process.env.BASE_URL,
    process.env.NEXT_PUBLIC_SITE_URL,
    process.env.SITE_URL,
    DEFAULT_BASE_URL,
  ]

  for (const raw of candidates) {
    if (typeof raw !== 'string') continue
    const trimmed = raw.trim()
    if (!trimmed) continue
    const withProtocol = /^https?:\/\//i.test(trimmed) ? trimmed : `https://${trimmed}`
    return withProtocol.replace(/\/+$/, '')
  }

  return DEFAULT_BASE_URL
}

const BASE_URL = deriveBaseUrl()

const toAbsoluteUrl = (value?: string) => {
  if (!value) return ''
  
  // If already absolute URL (http/https), return as is
  if (/^https?:\/\//i.test(value)) {
    return value
  }
  
  // If data URI or CID, return as is
  if (value.startsWith('data:') || value.startsWith('cid:')) {
    return value
  }

  if (!BASE_URL) {
    console.warn('BASE_URL not set, image may not load in emails:', value)
    return value
  }

  // Ensure path starts with /
  const normalizedPath = value.startsWith('/') ? value : `/${value}`
  
  // Remove any double slashes and ensure proper URL
  const cleanPath = normalizedPath.replace(/\/+/g, '/')
  const fullUrl = `${BASE_URL}${cleanPath}`
  
  return fullUrl
}

const buildButton = (button?: NewsletterButtonConfig, theme?: NewsletterTheme) => {
  if (!button?.label || !button?.url) {
    return ''
  }

  const variant = button.style || 'solid'
  const shape =
    theme?.buttonShape === 'square' ? '6px' : theme?.buttonShape === 'rounded' ? '10px' : '999px'
  const background = variant === 'solid' ? theme?.buttonColor || '#2c1810' : 'transparent'
  const border = `1px solid ${theme?.buttonColor || '#2c1810'}`
  const color = variant === 'solid' ? theme?.buttonTextColor || '#ffffff' : theme?.buttonColor || '#2c1810'

  return `
    <a
      href="${escapeHtml(button.url)}"
      style="
        display:inline-block;
        font-family:${theme?.bodyFont};
        font-size:15px;
        font-weight:600;
        letter-spacing:0.04em;
        text-transform:uppercase;
        text-decoration:none;
        padding:14px 32px;
        border-radius:${shape};
        border:${border};
        background:${background};
        color:${color};
      "
    >
      ${escapeHtml(button.label)}
    </a>
  `
}

const buttonRow = (button?: NewsletterButtonConfig, theme?: NewsletterTheme) => {
  if (!button) return ''
  const alignment = button.alignment === 'right' ? 'right' : button.alignment === 'left' ? 'left' : 'center'

  return `
    <tr>
      <td align="${alignment}" style="padding:8px 0;">
        ${buildButton(button, theme)}
      </td>
    </tr>
  `
}

const renderHero = (block: NewsletterHeroBlock, theme: NewsletterTheme) => `
  <tr>
    <td style="padding:${px(block.paddingTop, 28)} 32px ${px(block.paddingBottom, 24)};text-align:${
      block.alignment
    };background:${block.backgroundColor || 'transparent'};">
      ${
        block.eyebrow
          ? `<div style="font-size:12px;font-weight:600;letter-spacing:0.18em;text-transform:uppercase;color:${
              theme.subtextColor
            };margin-bottom:12px;">${escapeHtml(block.eyebrow)}</div>`
          : ''
      }
      <div style="font-family:${theme.headingFont};font-size:32px;line-height:1.25;color:${
        theme.textColor
      };font-weight:600;margin-bottom:${block.subheading ? '12px' : '0'};">
        ${escapeHtml(block.heading)}
      </div>
      ${
        block.subheading
          ? `<p style="font-family:${theme.bodyFont};font-size:16px;line-height:1.6;color:${
              theme.subtextColor
            };margin:0 0 12px;">
                ${escapeHtml(block.subheading)}
             </p>`
          : ''
      }
      ${
        block.button
          ? `<div style="margin-top:18px;text-align:${
              block.button.alignment || block.alignment || 'center'
            };">${buildButton(block.button, theme)}</div>`
          : ''
      }
    </td>
  </tr>
  ${
    block.imageUrl
      ? (() => {
          const imageUrl = toAbsoluteUrl(block.imageUrl)
          return `
    <tr>
      <td style="padding:0 32px 24px;">
        <img 
          src="${escapeHtml(imageUrl)}" 
          alt="" 
          width="600"
          style="display:block;width:100%;max-width:600px;height:auto;border:0;border-radius:18px;margin:0 auto;" 
        />
      </td>
    </tr>
  `
        })()
      : ''
  }
`

const renderText = (block: NewsletterTextBlock, theme: NewsletterTheme) => `
  <tr>
    <td style="padding:${px(block.paddingTop, 12)} 32px ${px(block.paddingBottom, 12)};background:${
      block.backgroundColor || 'transparent'
    };">
      ${
        block.heading
          ? `<div style="font-family:${theme.headingFont};font-size:22px;color:${theme.textColor};margin-bottom:10px;text-align:${
              block.alignment
            };">
                ${escapeHtml(block.heading)}
             </div>`
          : ''
      }
      <div style="font-family:${theme.bodyFont};font-size:15px;line-height:1.7;color:${
        theme.subtextColor
      };text-align:${block.alignment};">
        ${toMultiline(block.body)}
      </div>
    </td>
  </tr>
`

const renderImage = (block: NewsletterImageBlock) => {
  const imageUrl = toAbsoluteUrl(block.imageUrl)
  const width = block.fullWidth === false ? '80%' : '100%'
  const imageWidth = block.fullWidth === false ? 480 : 600
  
  return `
  <tr>
    <td style="padding:${px(block.paddingTop, 16)} 32px ${px(block.paddingBottom, 16)};">
      <img
        src="${escapeHtml(imageUrl)}"
        alt="${escapeHtml(block.caption || 'Newsletter image')}"
        width="${imageWidth}"
        style="display:block;width:${width};max-width:100%;height:auto;margin:0 auto;border-radius:${
          block.borderRadius ?? 18
        }px;border:0;"
      />
      ${
        block.caption
          ? `<p style="text-align:center;font-size:13px;font-family:Arial,sans-serif;color:#8b6f47;margin-top:8px;">${escapeHtml(
              block.caption || '',
            )}</p>`
          : ''
      }
    </td>
  </tr>
`
}

const renderButtonBlock = (block: NewsletterButtonBlock, theme: NewsletterTheme) => buttonRow(block.button, theme)

const renderDivider = (block: NewsletterDividerBlock, theme: NewsletterTheme) => `
  <tr>
    <td style="padding:${px(block.paddingTop, 12)} 32px ${px(block.paddingBottom, 12)};">
      <div style="width:${block.width || '72px'};margin:0 auto;border-bottom:${block.thickness ?? 1}px ${
        block.style || 'solid'
      } ${block.color || theme.accentColor};"></div>
    </td>
  </tr>
`

const renderSpacer = (block: NewsletterSpacerBlock) => `
  <tr>
    <td style="padding:0;height:${px(block.height)};line-height:${px(block.height)};">&nbsp;</td>
  </tr>
`

const renderHighlight = (block: NewsletterHighlightBlock, theme: NewsletterTheme) => `
  <tr>
    <td style="padding:${px(block.paddingTop, 18)} 24px ${px(block.paddingBottom, 18)};">
      <table width="100%" cellpadding="0" cellspacing="0" role="presentation" style="background:${
        block.backgroundColor || theme.accentContrast
      };border-radius:18px;">
        <tr>
          <td style="padding:24px;">
            ${
              block.badge
                ? `<div style="display:inline-block;padding:6px 14px;border-radius:999px;background:${
                    theme.accentColor
                  };color:${theme.accentContrast};font-size:12px;font-weight:600;margin-bottom:10px;font-family:${
                    theme.bodyFont
                  };">
                      ${escapeHtml(block.badge)}
                   </div>`
                : ''
            }
            <div style="font-family:${theme.headingFont};font-size:22px;color:${
              theme.textColor
            };font-weight:600;margin-bottom:8px;">
              ${escapeHtml(block.heading)}
            </div>
            ${
              block.body
                ? `<p style="font-family:${theme.bodyFont};font-size:15px;line-height:1.7;color:${
                    theme.subtextColor
                  };margin:0 0 16px;">
                      ${toMultiline(block.body)}
                   </p>`
                : ''
            }
            ${
              block.button
                ? `<div style="margin-top:12px;text-align:${block.button.alignment || 'left'};">
                    ${buildButton(block.button, theme)}
                   </div>`
                : ''
            }
          </td>
        </tr>
      </table>
    </td>
  </tr>
`


const renderBlock = (block: NewsletterBlock, theme: NewsletterTheme): string => {
  switch (block.type) {
    case 'hero':
      return renderHero(block, theme)
    case 'text':
      return renderText(block, theme)
    case 'image':
      return renderImage(block)
    case 'button':
      return renderButtonBlock(block, theme)
    case 'divider':
      return renderDivider(block, theme)
    case 'spacer':
      return renderSpacer(block)
    case 'highlight':
      return renderHighlight(block, theme)
    default:
      return ''
  }
}

export function resolveTheme(themeId?: string): NewsletterTheme {
  return NEWSLETTER_THEMES.find((theme) => theme.id === themeId) || NEWSLETTER_THEMES[0]
}

export function renderNewsletterHtml(blocks: NewsletterBlock[], themeId?: string): string {
  const theme = resolveTheme(themeId)
  const rows = (blocks || []).map((block) => renderBlock(block, theme)).join('')

  return `
    <tr>
      <td style="padding:24px 12px;background:${theme.backgroundColor};">
        <table width="100%" cellpadding="0" cellspacing="0" role="presentation" style="max-width:640px;margin:0 auto;background:${
          theme.surfaceColor
        };border-radius:24px;overflow:hidden;">
          <tr>
            <td style="padding:24px 32px 0 32px;">
              <div style="width:64px;border-bottom:3px solid ${theme.accentColor};margin-bottom:24px;"></div>
            </td>
          </tr>
          ${rows}
        </table>
      </td>
    </tr>
  `
    .replace(/\s+\n/g, '\n')
    .trim()
}
