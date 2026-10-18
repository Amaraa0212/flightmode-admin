import { useEffect, useState, type ReactNode } from 'react'
import type { NavigateFn } from '@/hooks/use-table-url-state'
import { Input } from '@/components/ui/input'

/** A free-text URL filter (`?<name>=…`) next to the table search, applied after typing stops. */
export function TextFilter({
  name,
  value,
  navigate,
  placeholder,
  icon,
  className = 'w-36',
}: {
  name: string
  value?: string
  navigate: NavigateFn
  placeholder: string
  icon?: ReactNode
  className?: string
}) {
  const [text, setText] = useState(value ?? '')
  // the URL changed elsewhere (back button, cleared filters) — show its value
  const [synced, setSynced] = useState(value)
  if (synced !== value) {
    setSynced(value)
    setText(value ?? '')
  }

  useEffect(() => {
    const next = text.trim()
    if (next === (value ?? '')) return
    const timer = setTimeout(
      () =>
        navigate({
          search: (prev) => ({ ...prev, [name]: next || undefined, page: undefined }),
        }),
      400
    )
    return () => clearTimeout(timer)
  }, [text, value, name, navigate])

  return (
    <div className='relative'>
      {icon && (
        <span className='text-muted-foreground pointer-events-none absolute start-2 top-1/2 -translate-y-1/2'>
          {icon}
        </span>
      )}
      <Input
        value={text}
        onChange={(e) => setText(e.target.value)}
        placeholder={placeholder}
        aria-label={placeholder}
        className={`h-8 text-xs ${icon ? 'ps-7' : ''} ${className}`}
      />
    </div>
  )
}
