import { createFileRoute } from '@tanstack/react-router'
import { UnauthorisedError } from '@/features/shared/errors/unauthorized-error'

export const Route = createFileRoute('/(errors)/401')({
  component: UnauthorisedError,
})
