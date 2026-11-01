import { createFileRoute } from '@tanstack/react-router'
import { Menus } from '@/features/access/menus'

export const Route = createFileRoute('/_authenticated/access/menus/')({
  component: Menus,
})
