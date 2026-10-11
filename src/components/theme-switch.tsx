import * as React from 'react'
import { useEffect } from 'react'
import { Moon, Sun } from 'lucide-react'
import { useTheme } from '@/context/theme-provider'
import { Button } from '@/components/ui/button'

export function ThemeSwitch() {
  const { resolvedTheme, setTheme } = useTheme()

  useEffect(() => {
    const themeColor = resolvedTheme === 'dark' ? '#020817' : '#fff'
    const metaThemeColor = document.querySelector("meta[name='theme-color']")
    if (metaThemeColor) metaThemeColor.setAttribute('content', themeColor)
  }, [resolvedTheme])

  const handleThemeToggle = React.useCallback(
    (e?: React.MouseEvent) => {
      const newMode = resolvedTheme === 'dark' ? 'light' : 'dark'
      const root = document.documentElement

      if (!document.startViewTransition) {
        setTheme(newMode)
        return
      }

      if (e) {
        const x = e.clientX
        const y = e.clientY
        root.style.setProperty('--x', `${x}px`)
        root.style.setProperty('--y', `${y}px`)
      } else {
        root.style.setProperty('--x', '50%')
        root.style.setProperty('--y', '50%')
      }

      document.startViewTransition(() => {
        setTheme(newMode)
      })
    },
    [resolvedTheme, setTheme]
  )

  return (
    <Button
      variant='ghost'
      size='icon'
      className='scale-95 rounded-full'
      onClick={handleThemeToggle}
      title={`Switch to ${resolvedTheme === 'dark' ? 'light' : 'dark'} theme`}
    >
      <Sun className='size-[1.2rem] scale-100 rotate-0 transition-all dark:scale-0 dark:-rotate-90' />
      <Moon className='absolute size-[1.2rem] scale-0 rotate-90 transition-all dark:scale-100 dark:rotate-0' />
      <span className='sr-only'>Toggle theme</span>
    </Button>
  )
}
