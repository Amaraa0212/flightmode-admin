import { z } from 'zod'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import {
  loadZoneService,
  seatProfileService,
  type LoadZone,
  type SeatAssignmentProfile,
} from '@/services'
import { toast } from 'sonner'
import { ConfigFormDialog } from '@/components/ui/config-form-dialog'

export const QUERY_KEY = 'admin-checkin-hierarchy'

function useSave<T>(
  fn: (v: T) => Promise<{ message: string }>,
  onClose: () => void
) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: fn,
    onSuccess: (res) => {
      toast.success(res.message)
      queryClient.invalidateQueries({ queryKey: [QUERY_KEY] })
      onClose()
    },
    onError: (error: Error) => toast.error(error.message),
  })
}

const zoneSchema = z
  .object({
    zone: z.string().trim().min(1).max(2),
    pax_from: z.number().int().min(1),
    pax_to: z.number().int().min(1),
  })
  .refine((v) => v.pax_to >= v.pax_from, {
    message: 'Max must be ≥ min',
    path: ['pax_to'],
  })
type ZoneForm = z.infer<typeof zoneSchema>

export function ZoneDialog({
  aircraftId,
  zone,
  onClose,
}: {
  aircraftId: number
  zone?: LoadZone
  onClose: () => void
}) {
  const save = useSave((v: ZoneForm) => {
    const payload = { ...v, aircraft_id: String(aircraftId) }
    return zone
      ? loadZoneService.update(zone.id, payload)
      : loadZoneService.create(payload)
  }, onClose)
  const values = zone
    ? { zone: zone.zone, pax_from: zone.pax_from, pax_to: zone.pax_to }
    : { zone: '', pax_from: 1, pax_to: 50 }
  return (
    <ConfigFormDialog<ZoneForm>
      open
      onClose={onClose}
      schema={zoneSchema as unknown as z.ZodSchema<ZoneForm>}
      data={zone ? values : undefined}
      defaultValues={values}
      fields={[
        {
          name: 'pax_from',
          label: 'PAX seq min',
          type: 'number',
          required: true,
          gridCols: 1,
        },
        {
          name: 'pax_to',
          label: 'PAX seq max',
          type: 'number',
          required: true,
          gridCols: 1,
        },
        {
          name: 'zone',
          label: 'Zone',
          type: 'text',
          required: true,
          gridCols: 2,
        },
      ]}
      onSubmit={async (v) => {
        await save.mutateAsync(v)
      }}
      title={zone ? 'Edit load zone' : 'Add load zone'}
      description='Online check-in opens this zone once the passenger count reaches the minimum.'
      isSubmitting={save.isPending}
      maxWidth='md'
    />
  )
}

const profileSchema = z.object({
  name: z.string().trim().min(2),
  zones: z.string().trim().min(1, 'e.g. A, B, C'),
  is_default: z.boolean(),
})
type ProfileForm = z.infer<typeof profileSchema>

export function ProfileDialog({
  aircraftId,
  profile,
  onClose,
}: {
  aircraftId: number
  profile?: SeatAssignmentProfile
  onClose: () => void
}) {
  const save = useSave((v: ProfileForm) => {
    const payload = { ...v, aircraft_id: String(aircraftId) }
    return profile
      ? seatProfileService.update(profile.id, payload)
      : seatProfileService.create(payload)
  }, onClose)
  const values = profile
    ? {
        name: profile.name,
        zones: profile.zones.join(', '),
        is_default: profile.is_default,
      }
    : { name: '', zones: 'A, B, C', is_default: false }
  return (
    <ConfigFormDialog<ProfileForm>
      open
      onClose={onClose}
      schema={profileSchema}
      data={profile ? values : undefined}
      defaultValues={values}
      fields={[
        {
          name: 'name',
          label: 'Name',
          type: 'text',
          required: true,
          gridCols: 2,
        },
        {
          name: 'zones',
          label: 'Zone priority (auto seat order)',
          type: 'text',
          placeholder: 'B, C, A',
          required: true,
          gridCols: 2,
        },
        {
          name: 'is_default',
          label: 'Default profile',
          type: 'checkbox',
          gridCols: 2,
        },
      ]}
      onSubmit={async (v) => {
        await save.mutateAsync(v)
      }}
      title={profile ? 'Edit check-in hierarchy' : 'Add check-in hierarchy'}
      isSubmitting={save.isPending}
      maxWidth='md'
    />
  )
}
