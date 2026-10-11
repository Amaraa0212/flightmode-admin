/** Time in an IANA timezone (station clock) */
export function timeInZone(date: Date, timeZone: string) {
  return new Intl.DateTimeFormat('en-GB', {
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
    timeZone,
  }).format(date)
}

/** "UTC+8" for an IANA timezone */
export function utcOffsetLabel(timeZone: string) {
  const part = new Intl.DateTimeFormat('en-US', {
    timeZone,
    timeZoneName: 'shortOffset',
  })
    .formatToParts(new Date())
    .find((p) => p.type === 'timeZoneName')
  return part?.value.replace('GMT', 'UTC') ?? timeZone
}

export function formatDuration(minutes: number) {
  const h = Math.floor(minutes / 60)
  const m = minutes % 60
  return `${h}h ${String(m).padStart(2, '0')}m`
}

/** Departure хүртэлх хугацаа: "in 1h 25m" / "25m ago" */
export function relativeToNow(iso: string) {
  const diff = Math.round((new Date(iso).getTime() - Date.now()) / 60_000)
  const abs = Math.abs(diff)
  const text = abs >= 60 ? formatDuration(abs) : `${abs}m`
  return diff >= 0 ? `in ${text}` : `${text} ago`
}

export function passengerName(p: { last_name: string; first_name: string }) {
  return `${p.last_name}/${p.first_name}`
}

export function titleName(p: { last_name: string; first_name: string }) {
  const cap = (s: string) =>
    s.toLowerCase().replace(/(^|[-\s])\p{L}/gu, (m) => m.toUpperCase())
  return `${cap(p.first_name)} ${cap(p.last_name)}`
}

export function ageOn(dob: string) {
  const d = new Date(dob)
  const now = new Date()
  let age = now.getFullYear() - d.getFullYear()
  if (now < new Date(now.getFullYear(), d.getMonth(), d.getDate())) age--
  return age
}
