'use client'

import { useMemo } from 'react'
import dynamic from 'next/dynamic'

// Dynamically import react-quill to avoid SSR issues
const ReactQuill = dynamic(() => import('react-quill'), { ssr: false })
import 'react-quill/dist/quill.snow.css'

interface RichTextEditorProps {
  value: string
  onChange: (value: string) => void
  placeholder?: string
}

export default function RichTextEditor({ value, onChange, placeholder = 'Write your content here...' }: RichTextEditorProps) {

  const modules = useMemo(
    () => ({
      toolbar: {
        container: [
          [{ header: [1, 2, 3, 4, 5, 6, false] }],
          ['bold', 'italic', 'underline', 'strike'],
          [{ list: 'ordered' }, { list: 'bullet' }],
          [{ script: 'sub' }, { script: 'super' }],
          [{ indent: '-1' }, { indent: '+1' }],
          [{ align: [] }],
          ['blockquote', 'code-block'],
          ['link', 'image'],
          [{ color: [] }, { background: [] }],
          ['clean'],
        ],
        handlers: {
          image: function (this: any) {
            const quill = this.quill
            const input = document.createElement('input')
            input.setAttribute('type', 'file')
            input.setAttribute('accept', 'image/*')
            input.click()

            input.onchange = async () => {
              const file = input.files?.[0]
              if (!file) return

              // Check file size (10MB max)
              if (file.size > 10 * 1024 * 1024) {
                alert('Image size must be less than 10MB')
                return
              }

              const formData = new FormData()
              formData.append('file', file)

              try {
                const response = await fetch('/api/admin/blog/upload', {
                  method: 'POST',
                  body: formData,
                  credentials: 'include',
                })

                const data = await response.json()

                if (response.ok && data.success) {
                  const imageUrl = data.url.startsWith('http')
                    ? data.url
                    : `${window.location.origin}${data.url}`

                  const range = quill.getSelection(true)
                  quill.insertEmbed(range.index, 'image', imageUrl)
                } else {
                  alert(data.error || 'Failed to upload image')
                }
              } catch (error) {
                console.error('Error uploading image:', error)
                alert('Failed to upload image')
              }
            }
          },
        },
      },
      clipboard: {
        matchVisual: false,
      },
    }),
    []
  )

  const formats = [
    'header',
    'bold',
    'italic',
    'underline',
    'strike',
    'list',
    'bullet',
    'script',
    'indent',
    'align',
    'blockquote',
    'code-block',
    'link',
    'image',
    'color',
    'background',
  ]

  return (
    <div className="rich-text-editor" style={{ minHeight: '400px' }}>
      <ReactQuill
        theme="snow"
        value={value}
        onChange={onChange}
        modules={modules}
        formats={formats}
        placeholder={placeholder}
      />
      <style jsx global>{`
        .rich-text-editor .ql-editor {
          min-height: 400px;
          font-size: 16px;
          font-family: var(--font-inter);
          color: var(--color-text);
        }
        .rich-text-editor .ql-container {
          font-size: 16px;
          font-family: var(--font-inter);
        }
        .rich-text-editor .ql-toolbar {
          border-top-left-radius: 8px;
          border-top-right-radius: 8px;
          border-color: var(--color-primary-light);
          background: white;
        }
        .rich-text-editor .ql-container {
          border-bottom-left-radius: 8px;
          border-bottom-right-radius: 8px;
          border-color: var(--color-primary-light);
          background: white;
        }
        .rich-text-editor .ql-editor.ql-blank::before {
          color: #999;
          font-style: normal;
        }
        .rich-text-editor .ql-toolbar button {
          background: white !important;
          border: none !important;
          box-shadow: none !important;
        }
        .rich-text-editor .ql-toolbar button:hover,
        .rich-text-editor .ql-toolbar button:focus,
        .rich-text-editor .ql-toolbar button.ql-active {
          background: white !important;
          border: none !important;
          box-shadow: none !important;
          color: #333 !important;
        }
        .rich-text-editor .ql-toolbar .ql-stroke {
          stroke: #333 !important;
        }
        .rich-text-editor .ql-toolbar .ql-fill {
          fill: #333 !important;
        }
        .rich-text-editor .ql-toolbar button:hover .ql-stroke,
        .rich-text-editor .ql-toolbar button.ql-active .ql-stroke {
          stroke: #000 !important;
        }
        .rich-text-editor .ql-toolbar button:hover .ql-fill,
        .rich-text-editor .ql-toolbar button.ql-active .ql-fill {
          fill: #000 !important;
        }
        .rich-text-editor .ql-toolbar .ql-picker-label {
          background: white !important;
          border: none !important;
          color: #333 !important;
        }
        .rich-text-editor .ql-toolbar .ql-picker-label:hover {
          background: white !important;
          color: #000 !important;
        }
        .rich-text-editor .ql-toolbar .ql-picker-options {
          background: white !important;
          border: 1px solid #ddd !important;
          box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1) !important;
        }
        .rich-text-editor .ql-toolbar .ql-picker-item {
          background: white !important;
          color: #333 !important;
        }
        .rich-text-editor .ql-toolbar .ql-picker-item:hover {
          background: #f5f5f5 !important;
          color: #000 !important;
        }
        .rich-text-editor .ql-toolbar .ql-picker-item.ql-selected {
          background: #f0f0f0 !important;
          color: #000 !important;
        }
      `}</style>
    </div>
  )
}

