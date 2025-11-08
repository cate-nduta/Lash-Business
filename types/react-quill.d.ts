declare module 'react-quill' {
  import type { ComponentType } from 'react'

  export interface ReactQuillProps {
    value?: string
    defaultValue?: string
    onChange?: (value: string, delta: unknown, source: string, editor: unknown) => void
    placeholder?: string
    readOnly?: boolean
    theme?: string
    modules?: Record<string, unknown>
    formats?: string[]
    className?: string
  }

  const ReactQuill: ComponentType<ReactQuillProps>

  export default ReactQuill
}

