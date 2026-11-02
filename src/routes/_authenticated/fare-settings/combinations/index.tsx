import { createFileRoute } from '@tanstack/react-router'
import { FareCombinations } from '@/features/fare-settings/combinations'

export const Route = createFileRoute(
  '/_authenticated/fare-settings/combinations/'
)({
  component: FareCombinations,
})
