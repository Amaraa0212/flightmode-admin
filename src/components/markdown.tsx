import { Fragment, useRef, type ReactNode } from 'react'
import {
  Bold,
  Heading1,
  Heading2,
  Italic,
  Link2,
  List,
  ListOrdered,
  Minus,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'

/*
| A small Markdown editor (toolbar over a textarea) and its preview — enough for documents such as the
| conditions of carriage: headings, bold / italic, bullet and numbered lists, links and rules.
*/

type Wrap = {
  before: string
  after?: string
  line?: boolean
  placeholder: string
}

const ACTIONS: { label: string; icon: typeof Bold; wrap: Wrap }[] = [
  {
    label: 'Heading',
    icon: Heading1,
    wrap: { before: '# ', line: true, placeholder: 'Heading' },
  },
  {
    label: 'Sub-heading',
    icon: Heading2,
    wrap: { before: '## ', line: true, placeholder: 'Sub-heading' },
  },
  {
    label: 'Bold',
    icon: Bold,
    wrap: { before: '**', after: '**', placeholder: 'bold text' },
  },
  {
    label: 'Italic',
    icon: Italic,
    wrap: { before: '_', after: '_', placeholder: 'italic text' },
  },
  {
    label: 'Bullet list',
    icon: List,
    wrap: { before: '- ', line: true, placeholder: 'List item' },
  },
  {
    label: 'Numbered list',
    icon: ListOrdered,
    wrap: { before: '1. ', line: true, placeholder: 'List item' },
  },
  {
    label: 'Link',
    icon: Link2,
    wrap: { before: '[', after: '](https://)', placeholder: 'link text' },
  },
  {
    label: 'Divider',
    icon: Minus,
    wrap: { before: '\n---\n', line: true, placeholder: '' },
  },
]

export function MarkdownToolbarEditor({
  value,
  onChange,
  rows = 24,
  placeholder,
}: {
  value: string
  onChange: (value: string) => void
  rows?: number
  placeholder?: string
}) {
  const ref = useRef<HTMLTextAreaElement>(null)

  const apply = ({ before, after = '', line, placeholder: hint }: Wrap) => {
    const el = ref.current
    const start = el?.selectionStart ?? value.length
    const end = el?.selectionEnd ?? value.length
    const selected = value.slice(start, end) || hint
    // line formats start on their own line
    const lead = line && start > 0 && value[start - 1] !== '\n' ? '\n' : ''
    const text = lead + before + selected + after
    onChange(value.slice(0, start) + text + value.slice(end))
    requestAnimationFrame(() => {
      el?.focus()
      const from = start + lead.length + before.length
      el?.setSelectionRange(from, from + selected.length)
    })
  }

  return (
    <div className='overflow-hidden rounded-md border'>
      <div className='bg-muted/40 flex flex-wrap gap-0.5 border-b p-1'>
        {ACTIONS.map(({ label, icon: Icon, wrap }) => (
          <Button
            key={label}
            type='button'
            variant='ghost'
            size='icon'
            className='size-7'
            title={label}
            aria-label={label}
            onClick={() => apply(wrap)}
          >
            <Icon className='size-3.5' />
          </Button>
        ))}
      </div>
      <Textarea
        ref={ref}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        rows={rows}
        placeholder={placeholder}
        className='rounded-none border-0 font-mono text-xs shadow-none focus-visible:ring-0'
      />
    </div>
  )
}

/** **bold**, _italic_ and [links](url) inside one line */
function inline(text: string): ReactNode[] {
  const parts: ReactNode[] = []
  const pattern = /(\*\*[^*]+\*\*|_[^_]+_|\[[^\]]+\]\([^)]+\))/g
  let last = 0
  for (const match of text.matchAll(pattern)) {
    const token = match[0]
    const at = match.index ?? 0
    if (at > last) parts.push(text.slice(last, at))
    if (token.startsWith('**'))
      parts.push(<strong key={at}>{token.slice(2, -2)}</strong>)
    else if (token.startsWith('_'))
      parts.push(<em key={at}>{token.slice(1, -1)}</em>)
    else {
      const [, label, href] = /^\[([^\]]+)\]\(([^)]+)\)$/.exec(token) ?? []
      const safe = /^(https?:|mailto:)/i.test(href ?? '') ? href : undefined
      parts.push(
        <a
          key={at}
          href={safe}
          target='_blank'
          rel='noreferrer'
          className='text-brand underline'
        >
          {label}
        </a>
      )
    }
    last = at + token.length
  }
  if (last < text.length) parts.push(text.slice(last))
  return parts
}

export function MarkdownPreview({
  value,
  className,
}: {
  value: string
  className?: string
}) {
  const blocks: ReactNode[] = []
  let list: { ordered: boolean; items: string[] } | null = null
  const flush = () => {
    if (!list) return
    const Tag = list.ordered ? 'ol' : 'ul'
    blocks.push(
      <Tag
        key={`l${blocks.length}`}
        className={cn(
          'ms-5 space-y-1',
          list.ordered ? 'list-decimal' : 'list-disc'
        )}
      >
        {list.items.map((item, i) => (
          <li key={i}>{inline(item)}</li>
        ))}
      </Tag>
    )
    list = null
  }

  value.split('\n').forEach((raw, i) => {
    const line = raw.trimEnd()
    const bullet = /^[-*] (.*)$/.exec(line)
    const numbered = /^\d+\. (.*)$/.exec(line)
    if (bullet || numbered) {
      const ordered = !!numbered
      if (list && list.ordered !== ordered) flush()
      list ??= { ordered, items: [] }
      list.items.push((bullet ?? numbered)![1])
      return
    }
    flush()
    if (line.startsWith('## '))
      blocks.push(
        <h4 key={i} className='pt-1 text-base font-semibold'>
          {inline(line.slice(3))}
        </h4>
      )
    else if (line.startsWith('# '))
      blocks.push(
        <h3 key={i} className='pt-2 text-lg font-bold'>
          {inline(line.slice(2))}
        </h3>
      )
    else if (line === '---') blocks.push(<hr key={i} className='my-2' />)
    else if (line.trim()) blocks.push(<p key={i}>{inline(line)}</p>)
  })
  flush()

  return (
    <article className={cn('space-y-2 text-sm leading-relaxed', className)}>
      {blocks.map((b, i) => (
        <Fragment key={i}>{b}</Fragment>
      ))}
    </article>
  )
}
