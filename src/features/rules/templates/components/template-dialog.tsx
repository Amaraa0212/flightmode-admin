import { useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import {
  aircraftOptions,
  baggageRuleOptions,
  seatPriceOptions,
  seatProfileService,
  serviceTemplateService,
  type ServiceTemplate,
} from '@/services'
import { Loader2 } from 'lucide-react'
import { toast } from 'sonner'
import { useOptions } from '@/hooks/use-options'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { CheckList } from '@/components/check-list'
import { SimpleSelect } from '@/components/simple-select'
import { pageConfig } from './config'

// Radix Select has no empty value
const ANY = 'any'
const NONE = 'none'

export function TemplateDialog({
  template,
  onClose,
}: {
  template?: ServiceTemplate
  onClose: () => void
}) {
  const queryClient = useQueryClient()
  const baggageOptions = useOptions('baggage-rules', baggageRuleOptions)
  const seatOptions = useOptions('seat-prices', seatPriceOptions)
  const aircraft = useOptions('aircraft', aircraftOptions)
  const [name, setName] = useState(template?.name ?? '')
  const [aircraftId, setAircraftId] = useState(
    template?.aircraft_id ? String(template.aircraft_id) : ANY
  )
  const [profileId, setProfileId] = useState(
    template?.seat_assignment_profile_id
      ? String(template.seat_assignment_profile_id)
      : NONE
  )
  const { data: profiles = [] } = useQuery({
    queryKey: ['admin-seat-profiles', aircraftId],
    queryFn: async () =>
      ((await seatProfileService.list(Number(aircraftId))).body ?? []).map(
        (p) => ({
          label: p.name,
          value: String(p.id),
        })
      ),
    enabled: aircraftId !== ANY,
  })
  const [bags, setBags] = useState(
    (template?.baggage_rule_ids ?? []).map(String)
  )
  const [seats, setSeats] = useState(
    (template?.seat_price_ids ?? []).map(String)
  )
  const [opens, setOpens] = useState(
    String(template?.checkin_opens_minutes ?? 1440)
  )
  const [closes, setCloses] = useState(
    String(template?.checkin_closes_minutes ?? 120)
  )

  const save = useMutation({
    mutationFn: () => {
      const payload = {
        name,
        aircraft_id: aircraftId === ANY ? '' : aircraftId,
        seat_assignment_profile_id: profileId === NONE ? '' : profileId,
        baggage_rule_ids: bags,
        seat_price_ids: seats,
        checkin_opens_minutes: Number(opens),
        checkin_closes_minutes: Number(closes),
      }
      return template
        ? serviceTemplateService.update(template.id, payload)
        : serviceTemplateService.create(payload)
    },
    onSuccess: (res) => {
      toast.success(res.message)
      queryClient.invalidateQueries({ queryKey: [pageConfig.queryKey] })
      queryClient.invalidateQueries({ queryKey: ['admin-template-options'] })
      onClose()
    },
  })

  return (
    <Dialog open onOpenChange={(open) => !open && onClose()}>
      <DialogContent className='sm:max-w-2xl'>
        <DialogHeader>
          <DialogTitle>
            {template ? 'Edit template' : 'Create template'}
          </DialogTitle>
          <DialogDescription>
            Applied to flights from “Shop items”.
          </DialogDescription>
        </DialogHeader>
        <div className='grid gap-4'>
          <div className='grid gap-1.5'>
            <Label>Name</Label>
            <Input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder='International standard'
            />
          </div>
          <div className='grid grid-cols-2 gap-4'>
            <div className='grid gap-1.5'>
              <Label>Aircraft</Label>
              <SimpleSelect
                value={aircraftId}
                onValueChange={(v) => {
                  setAircraftId(v)
                  setProfileId(NONE)
                }}
                items={[{ label: 'Any aircraft', value: ANY }, ...aircraft]}
              />
            </div>
            <div className='grid gap-1.5'>
              <Label>Seat assignment profile</Label>
              {aircraftId === ANY ? (
                <p className='text-muted-foreground py-2 text-sm'>
                  Pick an aircraft to set a profile; the flight keeps its own.
                </p>
              ) : (
                <SimpleSelect
                  value={profileId}
                  onValueChange={setProfileId}
                  items={[{ label: 'None', value: NONE }, ...profiles]}
                />
              )}
            </div>
          </div>
          <div className='grid grid-cols-2 gap-4'>
            <div className='grid gap-1.5'>
              <Label>Baggage rules</Label>
              <CheckList
                options={baggageOptions}
                value={bags}
                onChange={setBags}
              />
            </div>
            <div className='grid gap-1.5'>
              <Label>Seat rules</Label>
              <CheckList
                options={seatOptions}
                value={seats}
                onChange={setSeats}
              />
            </div>
          </div>
          <div className='grid grid-cols-2 gap-4'>
            <div className='grid gap-1.5'>
              <Label>Online check-in opens (minutes before STD)</Label>
              <Input
                type='number'
                value={opens}
                onChange={(e) => setOpens(e.target.value)}
              />
            </div>
            <div className='grid gap-1.5'>
              <Label>Online check-in closes (minutes before STD)</Label>
              <Input
                type='number'
                value={closes}
                onChange={(e) => setCloses(e.target.value)}
              />
            </div>
          </div>
        </div>
        <DialogFooter>
          <Button variant='outline' onClick={onClose}>
            Cancel
          </Button>
          <Button
            disabled={!name.trim() || save.isPending}
            onClick={() => save.mutate()}
          >
            {save.isPending && <Loader2 className='size-4 animate-spin' />}
            Save
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
