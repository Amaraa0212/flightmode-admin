import { Textarea } from './textarea'

// Lightweight stand-in for the TipTap editor used in xmeta-admin.
// Keeps the same props so ConfigFormDialog / ArrayField work unchanged.

export type HtmlTemplateVariable = {
  label: string
  value: string
}

export type HtmlEditorTextAlign = 'left' | 'center' | 'right' | 'justify'

export type HtmlEditorOptions = {
  enableColor?: boolean
  textAlignments?: HtmlEditorTextAlign[]
}

type HtmlEditorProps = {
  value: string
  onChange: (value: string) => void
  placeholder?: string
  templateVariables?: HtmlTemplateVariable[]
  enableColor?: boolean
  textAlignments?: HtmlEditorTextAlign[]
}

export function HtmlEditor({ value, onChange, placeholder }: HtmlEditorProps) {
  return (
    <Textarea
      value={value}
      onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder}
      rows={8}
      className='font-mono text-xs'
    />
  )
}
