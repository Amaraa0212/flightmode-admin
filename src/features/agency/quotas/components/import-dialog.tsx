import { useState } from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { agencyPortalService, type AgencyQuota } from '@/services'
import { ApiError } from '@/services/api/shared/client'
import { Download, FileSpreadsheet } from 'lucide-react'
import { toast } from 'sonner'
import { BaseDialog } from '@/components/ui/base-dialog'
import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { ReturnPicker } from './return-picker'

/** Columns read by the API (PassengerImportService); person_code = SAP number for online check-in */
const COLUMNS = [
  'firstname',
  'lastname',
  'sex',
  'dob',
  'nationality',
  'passport_number',
  'issued_state',
  'expire_date',
  'email',
  'phone',
  'person_code',
  'cabin',
  'agent_contact',
  'booking_group',
]
// two passengers of one booking (same booking_group → one PNR)
const SAMPLE = [
  ['BAT', 'DORJ', 'M', '1990-05-01', 'MN', 'E1234567', 'MN', '2030-01-01', '', '99112233', '123456', 'Y', '', 'A'],
  ['SARAA', 'DORJ', 'F', '1992-03-10', 'MN', 'E7654321', 'MN', '2030-01-01', '', '99112233', '', 'Y', '', 'A'],
]

function downloadTemplate() {
  const csv = `${[COLUMNS, ...SAMPLE].map((r) => r.join(',')).join('\n')}\n`
  const url = URL.createObjectURL(new Blob([csv], { type: 'text/csv' }))
  const link = document.createElement('a')
  link.href = url
  link.download = 'passengers-template.csv'
  link.click()
  URL.revokeObjectURL(url)
}

/** Agency portal: passenger list of a quota from Excel / CSV (Agents permission "Excel import") */
export function ImportDialog({ quota, onClose }: { quota: AgencyQuota | null; onClose: () => void }) {
  const queryClient = useQueryClient()
  const [file, setFile] = useState<File | null>(null)
  const [replace, setReplace] = useState(false)
  const [errors, setErrors] = useState<string[]>([])
  // RT: the return quota every name also goes on
  const [returnQuota, setReturnQuota] = useState<number | null>(null)

  const close = () => {
    setFile(null)
    setReplace(false)
    setReturnQuota(null)
    setErrors([])
    onClose()
  }

  const upload = useMutation({
    mutationFn: () => agencyPortalService.importPassengers(quota!.id, file!, replace, returnQuota),
    onSuccess: (res) => {
      toast.success(res.message)
      queryClient.invalidateQueries({ queryKey: ['agency-quotas'] })
      queryClient.invalidateQueries({ queryKey: ['agency-quota-passengers'] })
      close()
    },
    onError: (error: Error) => {
      // every wrong row is listed; nothing was saved
      const rows = error instanceof ApiError ? (error.context?.errors as string[] | undefined) : undefined
      setErrors(rows ?? [])
      toast.error(error.message)
    },
  })

  return (
    <BaseDialog
      open={!!quota}
      onOpenChange={(open) => !open && close()}
      title='Excel import'
      description={quota ? `${quota.flight_number} ${quota.route} · ${quota.remaining} суудал үлдсэн` : undefined}
      maxWidth='lg'
      submitButton={{
        text: 'Импортлох',
        onClick: () => upload.mutate(),
        loading: upload.isPending,
        disabled: !file,
      }}
    >
      <div className='grid gap-4'>
        <div className='flex flex-wrap items-center justify-between gap-2 rounded-lg border p-3 text-sm'>
          <span className='text-muted-foreground'>
            Мөр бүр нэг зорчигч. <b className='font-mono'>booking_group</b> ижил мөрүүд нэг захиалга (нэг PNR) болно, хоосон
            бол тусдаа PNR. <b className='font-mono'>person_code</b> — SAP дугаар (online check-in).
          </span>
          <Button type='button' variant='outline' size='sm' className='h-8 gap-2' onClick={downloadTemplate}>
            <Download className='size-4' />
            Загвар татах
          </Button>
        </div>

        {quota && <ReturnPicker quota={quota} value={returnQuota} onChange={setReturnQuota} />}

        <div className='grid gap-1.5'>
          <Label htmlFor='import-file'>Файл (.xlsx, .xls, .csv)</Label>
          <Input
            id='import-file'
            type='file'
            accept='.xlsx,.xls,.csv'
            onChange={(e) => {
              setFile(e.target.files?.[0] ?? null)
              setErrors([])
            }}
          />
          {file && (
            <p className='text-muted-foreground flex items-center gap-1.5 text-xs'>
              <FileSpreadsheet className='size-3.5' />
              {file.name}
            </p>
          )}
        </div>

        <label className='flex items-start gap-2 text-sm'>
          <Checkbox className='mt-0.5' checked={replace} onCheckedChange={(v) => setReplace(v === true)} />
          <span>
            Одоо байгаа зорчигчдыг солих
            <span className='text-muted-foreground block text-xs'>
              Энэ квотын бүх зорчигчийг цуцлаад файлынхаар орлуулна.
            </span>
          </span>
        </label>

        {errors.length > 0 && (
          <div className='max-h-48 overflow-y-auto rounded-lg border border-rose-400/40 bg-rose-500/5 p-3 text-xs text-rose-700 dark:text-rose-300'>
            <p className='mb-1 font-semibold'>Алдаатай мөрүүд — юу ч хадгалагдаагүй:</p>
            <ul className='list-disc ps-4'>
              {errors.map((e) => (
                <li key={e}>{e}</li>
              ))}
            </ul>
          </div>
        )}
      </div>
    </BaseDialog>
  )
}
