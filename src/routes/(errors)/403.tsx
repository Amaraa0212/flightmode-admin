import { createFileRoute } from '@tanstack/react-router'
import { ForbiddenError } from '@/features/shared/errors/forbidden'

export const Route = createFileRoute('/(errors)/403')({
  component: ForbiddenError,
})
