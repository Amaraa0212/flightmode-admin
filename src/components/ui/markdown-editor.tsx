import { Textarea } from './textarea'

type MarkdownEditorProps = {
  value: string
  onChange: (value: string) => void
  placeholder?: string
  height?: number
}

export function MarkdownEditor({
  value,
  onChange,
  placeholder,
}: MarkdownEditorProps) {
  return (
    <Textarea
      value={value}
      onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder}
      rows={8}
    />
  )
}
