import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Separator } from '@/components/ui/separator'
import { DetailFieldRenderer, type DetailField } from './detail-field'

// Re-export DetailField type for convenience
export type { DetailField }

type DetailCardProps = {
  title: string
  fields: DetailField[]
  headerAction?: React.ReactNode
}

export function DetailCard({ title, fields, headerAction }: DetailCardProps) {
  return (
    <Card>
      <CardHeader
        className={
          headerAction
            ? 'flex flex-row items-center justify-between space-y-0 pb-4'
            : undefined
        }
      >
        <CardTitle className='text-base'>{title}</CardTitle>
        {headerAction}
      </CardHeader>
      <CardContent className='space-y-0'>
        {fields.map((field, index) => (
          <div key={field.label}>
            <DetailFieldRenderer field={field} />
            {index < fields.length - 1 && <Separator />}
          </div>
        ))}
      </CardContent>
    </Card>
  )
}
