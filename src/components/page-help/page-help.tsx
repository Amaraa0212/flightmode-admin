import { useState } from 'react'
import { useMutation } from '@tanstack/react-query'
import { useLocation } from '@tanstack/react-router'
import { issueReportService } from '@/services'
import { CircleHelp, Loader2, Send } from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { ScrollArea } from '@/components/ui/scroll-area'
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet'
import { Textarea } from '@/components/ui/textarea'
import { COMMON_LIST_HELP, helpForPath } from './help-content'

/** Bottom-right "?" button (kept above the table pagination): opens a right-side panel explaining how the current page works */
export function PageHelp() {
  const pathname = useLocation({ select: (l) => l.pathname })
  const [open, setOpen] = useState(false)
  const help = helpForPath(pathname)

  if (!help) return null

  return (
    <>
      <Button
        size='icon'
        onClick={() => setOpen(true)}
        className='fixed end-6 bottom-20 z-40 size-11 rounded-full shadow-lg'
        aria-label='Энэ хуудасны тайлбар'
        title='Энэ хуудасны тайлбар'
      >
        <CircleHelp className='size-5' />
      </Button>

      <Sheet open={open} onOpenChange={setOpen}>
        <SheetContent side='right' className='w-full gap-0 sm:max-w-md'>
          <SheetHeader className='border-b pe-10'>
            <p className='text-muted-foreground text-xs font-medium tracking-wide uppercase'>
              Хуудасны тайлбар
            </p>
            <SheetTitle className='text-lg'>{help.title}</SheetTitle>
            <SheetDescription>{help.summary}</SheetDescription>
          </SheetHeader>

          <ScrollArea className='min-h-0 flex-1'>
            <div className='space-y-6 p-4 pb-16 text-sm'>
              {help.steps && (
                <HelpSection title='Хэрхэн ажиллах вэ'>
                  <ol className='space-y-2'>
                    {help.steps.map((step, i) => (
                      <li key={i} className='flex gap-3'>
                        <span className='bg-primary text-primary-foreground flex size-5 shrink-0 items-center justify-center rounded-full text-xs font-semibold'>
                          {i + 1}
                        </span>
                        <span className='leading-relaxed'>{step}</span>
                      </li>
                    ))}
                  </ol>
                </HelpSection>
              )}

              {help.sections?.map((section) => (
                <HelpSection key={section.title} title={section.title}>
                  <Bullets items={section.items} />
                </HelpSection>
              ))}

              {help.notes && (
                <div className='rounded-md border border-amber-500/30 bg-amber-500/10 p-3'>
                  <p className='mb-2 font-semibold text-amber-700 dark:text-amber-400'>
                    Анхаарах
                  </p>
                  <Bullets items={help.notes} />
                </div>
              )}

              {help.list !== false && (
                <HelpSection title='Жагсаалттай ажиллах'>
                  <Bullets items={COMMON_LIST_HELP} muted />
                </HelpSection>
              )}

              <ReportIssueForm pagePath={pathname} pageTitle={help.title} />
            </div>
          </ScrollArea>
        </SheetContent>
      </Sheet>
    </>
  )
}

const MIN_MESSAGE = 5

/** Problem report of the page — saved in the issue_reports table */
function ReportIssueForm({
  pagePath,
  pageTitle,
}: {
  pagePath: string
  pageTitle: string
}) {
  const [message, setMessage] = useState('')
  const send = useMutation({
    mutationFn: () =>
      issueReportService.send({
        page_path: pagePath,
        page_title: pageTitle,
        message: message.trim(),
      }),
    onSuccess: () => {
      toast.success('Илгээгдлээ. Баярлалаа!')
      setMessage('')
    },
    onError: (error: Error) => toast.error(error.message),
  })
  const tooShort = message.trim().length < MIN_MESSAGE

  return (
    <form
      className='space-y-2 border-t pt-5'
      onSubmit={(e) => {
        e.preventDefault()
        if (!tooShort) send.mutate()
      }}
    >
      <h3 className='font-semibold'>Алдаа мэдээлэх</h3>
      <p className='text-muted-foreground'>
        Энэ хуудсанд ажиллахад алдаа гарсан эсвэл буруу ажиллаж байвал юу хийж
        байхад юу болсныг бичиж илгээнэ үү.
      </p>
      <Textarea
        value={message}
        onChange={(e) => setMessage(e.target.value)}
        placeholder='Жишээ: “Create quota” дарж хадгалахад “Flight not found” гэсэн алдаа гарлаа.'
        rows={4}
        maxLength={5000}
        disabled={send.isPending}
        aria-label='Алдааны тайлбар'
      />
      <div className='flex items-center justify-between gap-2'>
        <span className='text-muted-foreground text-xs'>
          {message.length} / 5000
        </span>
        <Button type='submit' size='sm' disabled={tooShort || send.isPending}>
          {send.isPending ? (
            <Loader2 className='size-4 animate-spin' />
          ) : (
            <Send className='size-4' />
          )}
          Илгээх
        </Button>
      </div>
    </form>
  )
}

function HelpSection({
  title,
  children,
}: {
  title: string
  children: React.ReactNode
}) {
  return (
    <section>
      <h3 className='mb-2 font-semibold'>{title}</h3>
      {children}
    </section>
  )
}

function Bullets({ items, muted }: { items: string[]; muted?: boolean }) {
  return (
    <ul className={muted ? 'text-muted-foreground space-y-1.5' : 'space-y-1.5'}>
      {items.map((item, i) => (
        <li key={i} className='flex gap-2 leading-relaxed'>
          <span className='text-muted-foreground'>•</span>
          <span>{item}</span>
        </li>
      ))}
    </ul>
  )
}
