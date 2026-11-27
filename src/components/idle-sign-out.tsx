import { useEffect } from 'react'
import { useNavigate } from '@tanstack/react-router'
import { authService } from '@/services'
import { toast } from 'sonner'
import { useAuthStore } from '@/stores/auth-store'

/** Signed out after this many minutes without mouse / keyboard / touch (the API ends the token after the same idle time). */
const IDLE_MINUTES = Number(import.meta.env.VITE_AUTH_IDLE_MINUTES) || 60
/** last activity, shared by every tab of the site */
const KEY = 'fm-last-activity'
const EVENTS = [
  'mousedown',
  'mousemove',
  'keydown',
  'wheel',
  'touchstart',
  'scroll',
] as const

const readLast = () => {
  try {
    return Number(localStorage.getItem(KEY)) || 0
  } catch {
    return 0
  }
}
const writeLast = (at: number) => {
  try {
    localStorage.setItem(KEY, String(at))
  } catch {
    // private mode: this tab's own timer still works
  }
}

/**
 * Background polling (announcements, live board) keeps the token in use, so an open tab nobody touches would never
 * time out on the API side alone: this signs the user out after IDLE_MINUTES without input.
 */
export function IdleSignOut() {
  const navigate = useNavigate()

  useEffect(() => {
    let last = Date.now()
    writeLast(last)

    const touch = () => {
      const now = Date.now()
      // write at most every 15 s
      if (now - last > 15_000) {
        last = now
        writeLast(now)
      }
    }
    EVENTS.forEach((e) => window.addEventListener(e, touch, { passive: true }))

    const check = window.setInterval(async () => {
      last = Math.max(last, readLast())
      if (Date.now() - last < IDLE_MINUTES * 60_000) return
      window.clearInterval(check)
      await authService.logout()
      useAuthStore.getState().auth.reset()
      toast.info(`Signed out after ${IDLE_MINUTES} minutes without activity.`, {
        duration: Infinity,
      })
      navigate({
        to: '/sign-in',
        search: { redirect: window.location.pathname + window.location.search },
        replace: true,
      })
    }, 30_000)

    return () => {
      EVENTS.forEach((e) => window.removeEventListener(e, touch))
      window.clearInterval(check)
    }
  }, [navigate])

  return null
}
