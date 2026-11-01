import { createFileRoute } from '@tanstack/react-router'
import { IpWhitelist } from '@/features/access/ip-whitelist'

export const Route = createFileRoute('/_authenticated/access/ip-whitelist/')({
  component: IpWhitelist,
})
