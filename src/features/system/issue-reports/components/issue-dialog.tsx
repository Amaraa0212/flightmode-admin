import { useState } from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { issueReportService, type IssueReport, type IssueReportStatus } from '@/services'
import { Loader2 } from 'lucide-react'
import { toast } from 'sonner'
import { formatDate } from '@/lib/utils'
import { ISSUE_STATUS, ISSUE_STATUS_OPTIONS } from '@/constants/status'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Textarea } from '@/components/ui/textarea'
import { SimpleSelect } from '@/components/simple-select'
import { StatusChip } from '@/components/status-chip'

/** One report in full, with its status and the note back to the team */
export function IssueDialog({
  report,
  queryKey,
  onClose,
}: {
  report: IssueReport
  queryKey: string
  onClose: () => void
}) {
  const queryClient = useQueryClient()
  const [status, setStatus] = useState<IssueReportStatus>(report.status)
  const [note, setNote] = useState(report.resolution_note ?? '')

  const save = useMutation({
    mutationFn: () => issueReportService.update(report.id, { status, resolution_note: note }),
    onSuccess: (res) => {
      toast.success(res.message)
      queryClient.invalidateQueries({ queryKey: [queryKey] })
      onClose()
    },
    onError: (error: Error) => toast.error(error.message),
  })
  const changed = status !== report.status || note.trim() !== (report.resolution_note ?? '')

  return (
    <Dialog open onOpenChange={(open) => !open && onClose()}>
      <DialogContent className='sm:max-w-xl'>
        <DialogHeader>
          <DialogTitle className='flex items-center gap-2'>
            Issue #{report.id} <StatusChip value={report.status} map={ISSUE_STATUS} />
          </DialogTitle>
          <DialogDescription>
            {report.user?.name ?? 'Unknown user'}
            {report.user?.email && ` · ${report.user.email}`} · {report.airline?.name ?? report.agency?.name ?? 'Platform'} ·{' '}
            {formatDate(report.created_at, 'YYYY-MM-DD HH:mm')}
          </DialogDescription>
        </DialogHeader>

        <div className='grid gap-3'>
          <div className='fm-inset grid gap-1 p-3'>
            <p className='text-muted-foreground text-xs'>
              {report.page_title ?? 'Page'} · <span className='font-mono'>{report.page_path}</span>
            </p>
            <p className='text-sm whitespace-pre-line'>{report.message}</p>
            {report.user_agent && (
              <p className='text-muted-foreground truncate text-[10px]' title={report.user_agent}>
                {report.user_agent}
              </p>
            )}
          </div>

          <label className='grid gap-1 text-sm'>
            <span className='font-medium'>Status</span>
            <SimpleSelect
              value={status}
              onValueChange={(v) => setStatus(v as IssueReportStatus)}
              items={ISSUE_STATUS_OPTIONS}
              className='w-48'
            />
          </label>
          <label className='grid gap-1 text-sm'>
            <span className='font-medium'>Note (what was done)</span>
            <Textarea
              value={note}
              onChange={(e) => setNote(e.target.value)}
              rows={4}
              maxLength={2000}
              placeholder='e.g. Fixed in the 10-22 release — menu renamed'
            />
          </label>
          {report.resolved_by && report.resolved_at && (
            <p className='text-muted-foreground text-xs'>
              Closed by {report.resolved_by.name} · {formatDate(report.resolved_at, 'YYYY-MM-DD HH:mm')}
            </p>
          )}
        </div>

        <DialogFooter>
          <Button variant='outline' onClick={onClose}>
            Cancel
          </Button>
          <Button disabled={!changed || save.isPending} onClick={() => save.mutate()}>
            {save.isPending && <Loader2 className='size-4 animate-spin' />}
            Save
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
