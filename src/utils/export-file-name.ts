import { useAuthStore } from '@/stores/auth-store'

export type ExportDownloadOptions = {
  includeRequester?: boolean
}

export function getExportRequesterSlug(): string {
  const email = useAuthStore.getState().auth.user?.email?.trim().toLowerCase()
  if (!email) {
    return ''
  }

  const candidate = email.split('@')[0] || email
  return candidate
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+/, '')
    .replace(/-+$/, '')
}

export function withRequesterInFileName(
  fileName: string,
  options?: ExportDownloadOptions
): string {
  if (options?.includeRequester === false) {
    return fileName
  }

  const slug = getExportRequesterSlug()
  if (!slug) {
    return fileName
  }

  const dotIndex = fileName.lastIndexOf('.')
  const hasExtension = dotIndex > 0
  const base = hasExtension ? fileName.slice(0, dotIndex) : fileName
  const extension = hasExtension ? fileName.slice(dotIndex) : ''

  if (base.toLowerCase().endsWith(`-${slug}`)) {
    return fileName
  }

  return `${base}-${slug}${extension}`
}
