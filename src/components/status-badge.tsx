import { ACTIVE, type StatusMeta } from '@/constants/status'
import { StatusChip } from '@/components/status-chip'

/** Admin-д хэрэглэгдэх статусын badge (DCS-ийн StatusChip-тэй ижил загвар) */
export function StatusBadge({
  value,
  map,
  className,
}: {
  value: string | null | undefined
  map: Record<string, StatusMeta>
  className?: string
}) {
  return <StatusChip value={value} map={map} className={className} />
}

export function ActiveBadge({ active }: { active: boolean }) {
  return <StatusChip value={String(active)} map={ACTIVE} />
}
