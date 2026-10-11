import { useState } from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import {
  baggageRuleOptions,
  seatPriceOptions,
  serviceTemplateService,
  type ServiceTemplate,
} from '@/services'
import { Loader2 } from 'lucide-react'
import { toast } from 'sonner'
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
import { pageConfig } from './config'

export function TemplateDialog({
  template,
  onClose,
}: {
  template?: ServiceTemplate
  onClose: () => void
}) {
  const queryClient = useQueryClient()
  const [name, setName] = useState(template?.name ?? '')
  const [bags, setBags] = useState(
    (template?.baggage_rule_ids ?? []).map(String)
  )
  const [seats, setSeats] = useState(
    (template?.seat_price_ids ?? []).map(String)
  )
  const [opens, setOpens] = useState(
    String(template?.oci_opens_minutes ?? 1440)
  )
  const [closes, setCloses] = useState(
    String(template?.oci_closes_minutes ?? 120)
  )

  const save = useMutation({
    mutationFn: () => {
      const payload = {
        name,
        baggage_rule_ids: bags,
        seat_price_ids: seats,
        oci_opens_minutes: Number(opens),
        oci_closes_minutes: Number(closes),
      }
      return template
        ? serviceTemplateService.update(template.id, payload)
        : serviceTemplateService.create(payload)
    },
    onSuccess: (res) => {
      toast.success(res.message)
      queryClient.invalidateQueries({ queryKey: [pageConfig.queryKey] })
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
              <Label>Baggage rules</Label>
              <CheckList
                options={baggageRuleOptions()}
                value={bags}
                onChange={setBags}
              />
            </div>
            <div className='grid gap-1.5'>
              <Label>Seat rules</Label>
              <CheckList
                options={seatPriceOptions()}
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
