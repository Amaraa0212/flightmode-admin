import { toast } from 'sonner'

export function handleServerError(error: unknown) {
  if (import.meta.env.DEV) {
    // eslint-disable-next-line no-console
    console.log(error)
  }

  const errMsg =
    error instanceof Error && error.message
      ? error.message
      : 'Something went wrong!'

  toast.error(errMsg)
}
