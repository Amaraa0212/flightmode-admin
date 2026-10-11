import type { DashboardStats } from '@/services'
import {
  Bar,
  BarChart,
  CartesianGrid,
  LabelList,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'

const axis = {
  stroke: 'var(--muted-foreground)',
  fontSize: 11,
  tickLine: false,
  axisLine: false,
}
const tooltipStyle = {
  contentStyle: {
    background: 'var(--popover)',
    border: '1px solid var(--border)',
    borderRadius: 8,
    fontSize: 12,
    color: 'var(--popover-foreground)',
  },
  labelStyle: { color: 'var(--muted-foreground)' },
}

const SERIES = [
  {
    key: 'bookings',
    label: 'Bookings',
    color: 'var(--series-1)',
    dash: undefined,
  },
  {
    key: 'passengers',
    label: 'Passengers',
    color: 'var(--series-2)',
    dash: '5 4',
  },
] as const

/** Sales performance — two series on one axis (same unit: count per day) */
export function SalesChart({ data }: { data: DashboardStats['daily'] }) {
  return (
    <div className='space-y-3'>
      <div className='flex gap-4'>
        {SERIES.map((s) => (
          <span
            key={s.key}
            className='text-muted-foreground flex items-center gap-2 text-xs'
          >
            <svg width='18' height='6' aria-hidden>
              <line
                x1='0'
                y1='3'
                x2='18'
                y2='3'
                stroke={s.color}
                strokeWidth='2'
                strokeDasharray={s.dash}
              />
            </svg>
            {s.label}
          </span>
        ))}
      </div>
      <div className='h-64'>
        <ResponsiveContainer width='100%' height='100%'>
          <LineChart
            data={data}
            margin={{ top: 8, right: 16, bottom: 0, left: -16 }}
          >
            <CartesianGrid stroke='var(--border)' vertical={false} />
            <XAxis dataKey='date' {...axis} />
            <YAxis allowDecimals={false} {...axis} />
            <Tooltip {...tooltipStyle} cursor={{ stroke: 'var(--border)' }} />
            {SERIES.map((s) => (
              <Line
                key={s.key}
                type='monotone'
                dataKey={s.key}
                name={s.label}
                stroke={s.color}
                strokeWidth={2}
                strokeDasharray={s.dash}
                dot={false}
                activeDot={{ r: 4, stroke: 'var(--card)', strokeWidth: 2 }}
              />
            ))}
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  )
}

/** Top routes — single series, horizontal bars, direct value labels */
export function RoutesChart({ data }: { data: DashboardStats['top_routes'] }) {
  return (
    <div className='h-64'>
      <ResponsiveContainer width='100%' height='100%'>
        <BarChart
          data={data}
          layout='vertical'
          margin={{ top: 0, right: 40, bottom: 0, left: 8 }}
          barCategoryGap={6}
        >
          <XAxis type='number' hide />
          <YAxis
            type='category'
            dataKey='route'
            width={72}
            {...axis}
            tick={{
              fontFamily: 'JetBrains Mono',
              fontSize: 11,
              fill: 'var(--foreground)',
            }}
          />
          <Tooltip {...tooltipStyle} cursor={{ fill: 'var(--muted)' }} />
          <Bar
            dataKey='passengers'
            name='Passengers'
            fill='var(--series-1)'
            radius={[0, 4, 4, 0]}
          >
            <LabelList
              dataKey='passengers'
              position='right'
              fill='var(--muted-foreground)'
              fontSize={11}
            />
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  )
}
