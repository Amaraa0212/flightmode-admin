import { useEffect, useRef, useState } from 'react'
import { cn } from '@/lib/utils'
import { useTheme } from '@/context/theme-provider'

export function ThemeTransition() {
  const { resolvedTheme } = useTheme()
  const [isTransitioning, setIsTransitioning] = useState(false)
  const prevThemeRef = useRef(resolvedTheme)
  const [nextTheme, setNextTheme] = useState<typeof resolvedTheme | null>(null)

  useEffect(() => {
    const supportsViewTransition = 'startViewTransition' in document

    if (prevThemeRef.current !== resolvedTheme && !supportsViewTransition) {
      const newTheme = resolvedTheme

      setNextTheme(newTheme)
      setIsTransitioning(true)

      prevThemeRef.current = newTheme

      const timer = setTimeout(() => {
        setIsTransitioning(false)
        setNextTheme(null)
      }, 500)

      return () => {
        clearTimeout(timer)
      }
    } else {
      prevThemeRef.current = resolvedTheme
    }
  }, [resolvedTheme])

  if (!isTransitioning || !nextTheme) return null

  return (
    <div
      className={cn(
        'pointer-events-none fixed inset-0 z-[9999]',
        'theme-transition-overlay',
        nextTheme === 'dark' ? 'overlay-dark' : 'overlay-light'
      )}
      aria-hidden='true'
      data-theme={nextTheme}
    />
  )
}
