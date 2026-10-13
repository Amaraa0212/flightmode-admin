import type {
  Aircraft,
  LoadZone,
  SeatAssignmentProfile,
  SeatBlock,
} from '../types/fleet/aircraft.types'
import type {
  Allocation,
  Flight,
  FlightAirport,
  FlightSeries,
  FlightStatus,
} from '../types/operations/flight.types'
import type {
  Agency,
  Airline,
  Role,
  User,
} from '../types/organisation/organisation.types'
import type {
  AirlineSsr,
  BagTagLayout,
  BaggageOverride,
  BaggageRule,
  Fare,
  SeatPrice,
  ServiceTemplate,
} from '../types/products/product.types'
import type {
  Airport,
  CabinClass,
  Country,
  PassengerType,
} from '../types/reference/reference.types'
import type {
  Booking,
  BookingSource,
  FlightPassengerRow,
  BookingStatus,
  CharterRequest,
  Passenger,
  Segment,
} from '../types/sales/booking.types'
import type {
  ActivityLog,
  Announcement,
  CarriageDocument,
  PolicyDocument,
  RequiredNotification,
} from '../types/system/system.types'

/**
 * In-memory mock database.
 * Seeded random-оор үүсгэдэг тул refresh хийхэд ижил өгөгдөл гарна.
 * Mutation (create/update/delete) нь зөвхөн session дотор хадгалагдана.
 */

let seed = 20260928
function rand() {
  seed = (seed * 1664525 + 1013904223) % 4294967296
  return seed / 4294967296
}
function int(min: number, max: number) {
  return Math.floor(rand() * (max - min + 1)) + min
}
function pick<T>(items: readonly T[]): T {
  return items[Math.floor(rand() * items.length)]
}
function pad(n: number, size: number) {
  return String(n).padStart(size, '0')
}
function isoDaysFromNow(days: number, hour = 0, minute = 0) {
  const d = new Date()
  d.setUTCHours(hour, minute, 0, 0)
  d.setUTCDate(d.getUTCDate() + days)
  return d.toISOString()
}
function dateOnly(iso: string) {
  return iso.slice(0, 10)
}

const FIRST_NAMES = [
  'BAT',
  'BOLD',
  'ENKH',
  'GANBAATAR',
  'MUNKH',
  'SARNAI',
  'NOMIN',
  'ANU',
  'TEMUULEN',
  'KHULAN',
  'ODGEREL',
  'TUGULDUR',
  'ZOLJARGAL',
  'ARIUNAA',
  'DULGUUN',
]
const LAST_NAMES = [
  'DORJ',
  'BAYAR',
  'TSEND',
  'GANBOLD',
  'OYUN',
  'ERDENE',
  'SUKH',
  'NARAN',
  'OTGON',
  'CHULUUN',
]

// ─── Reference ───
export const countries: Country[] = [
  { id: 1, name: 'Mongolia', alpha2: 'MN' },
  { id: 2, name: 'China', alpha2: 'CN' },
  { id: 3, name: 'South Korea', alpha2: 'KR' },
  { id: 4, name: 'Japan', alpha2: 'JP' },
  { id: 5, name: 'Thailand', alpha2: 'TH' },
]

export const airports: Airport[] = [
  [
    'UBN',
    'ZMCK',
    'Chinggis Khaan International',
    'Ulaanbaatar',
    'ULN',
    1,
    'Asia/Ulaanbaatar',
  ],
  ['ULG', 'ZMUL', 'Ulgii Airport', 'Ulgii', 'ULG', 1, 'Asia/Hovd'],
  ['MXV', 'ZMMN', 'Murun Airport', 'Murun', 'MXV', 1, 'Asia/Ulaanbaatar'],
  [
    'DLZ',
    'ZMDZ',
    'Dalanzadgad Airport',
    'Dalanzadgad',
    'DLZ',
    1,
    'Asia/Ulaanbaatar',
  ],
  ['ICN', 'RKSI', 'Incheon International', 'Seoul', 'SEL', 3, 'Asia/Seoul'],
  [
    'PEK',
    'ZBAA',
    'Beijing Capital International',
    'Beijing',
    'BJS',
    2,
    'Asia/Shanghai',
  ],
  ['NRT', 'RJAA', 'Narita International', 'Tokyo', 'TYO', 4, 'Asia/Tokyo'],
  ['BKK', 'VTBS', 'Suvarnabhumi', 'Bangkok', 'BKK', 5, 'Asia/Bangkok'],
].map(([iata, icao, name, city, cityCode, countryId, tz], index) => ({
  id: index + 1,
  iata_code: iata as string,
  icao_code: icao as string,
  name: name as string,
  city: city as string,
  city_code: cityCode as string,
  country_id: countryId as number,
  country: countries.find((c) => c.id === countryId) ?? null,
  timezone: tz as string,
  latitude: null,
  longitude: null,
  is_active: index !== 3,
}))

function toFlightAirport(a: Airport): FlightAirport {
  return { id: a.id, iata_code: a.iata_code, name: a.name, city: a.city }
}

// ─── Organisation ───
export const airlines: Airline[] = [
  {
    id: 1,
    name: 'MIAT Mongolian Airlines',
    iata_code: 'OM',
    icao_code: 'MGL',
    numeric_code: '289',
    email: 'ops@miat.com',
    phone: '+976 7000 0000',
    address: 'Ulaanbaatar',
    registration_no: '2000001',
    brand_color: '#1d4ed8',
    currency: 'MNT',
    is_active: true,
    agencies_count: 6,
  },
  {
    id: 2,
    name: 'Hunnu Air',
    iata_code: 'MR',
    icao_code: 'MML',
    numeric_code: '861',
    email: 'ops@hunnuair.com',
    phone: '+976 7000 1111',
    address: 'Ulaanbaatar',
    registration_no: '2000002',
    brand_color: '#dc2626',
    currency: 'MNT',
    is_active: true,
    agencies_count: 4,
  },
  {
    id: 3,
    name: 'Aero Mongolia',
    iata_code: 'M0',
    icao_code: 'MNG',
    numeric_code: '862',
    email: 'ops@aeromongolia.mn',
    phone: '+976 7000 2222',
    address: 'Ulaanbaatar',
    registration_no: '2000003',
    brand_color: '#059669',
    currency: 'MNT',
    is_active: false,
    agencies_count: 2,
  },
]

const AGENCY_NAMES = [
  'Juulchin Travel',
  'Nomadic Journeys',
  'Blue Sky Tours',
  'Chinggis Travel',
  'Khan Tour',
  'Silk Road Travel',
  'Gobi Adventures',
  'Steppe Tours',
  'Altai Travel',
  'Eagle Tour',
]
export const agencies: Agency[] = AGENCY_NAMES.map((name, index) => ({
  id: index + 1,
  name,
  code: `AG${pad(index + 101, 3)}`,
  email: `${name.split(' ')[0].toLowerCase()}@agency.mn`,
  phone: `+976 9${int(100, 999)} ${int(1000, 9999)}`,
  address: 'Ulaanbaatar, Sukhbaatar district',
  registration_no: String(5_000_000 + index * 137),
  api_enabled: index % 3 === 0,
  is_active: index !== 7,
  airlines: airlines
    .slice(0, (index % 3) + 1)
    .map((a) => ({ id: a.id, name: a.name, contract_active: a.is_active })),
}))

export const PERMISSION_KEYS = [
  'dashboard.view',
  'airlines.manage',
  'agencies.manage',
  'users.manage',
  'roles.manage',
  'reference.manage',
  'aircraft.manage',
  'fares.manage',
  'products.manage',
  'flights.view',
  'flights.manage',
  'flights.operate',
  'seat_blocks.manage',
  'allocations.manage',
  'bookings.view',
  'bookings.manage',
  'reports.view',
  'activity_logs.view',
  'announcements.manage',
  'charters.view',
  'charters.manage',
  'dcs.access',
  'dcs.checkin',
  'gate.access',
  'agency.portal',
] as const

export const roles: Role[] = [
  {
    id: 1,
    name: 'System Admin',
    slug: 'system_admin',
    scope: 'admin',
    permissions: [...PERMISSION_KEYS],
    users_count: 2,
  },
  {
    id: 2,
    name: 'Airline Manager',
    slug: 'airline_manager',
    scope: 'airline',
    permissions: PERMISSION_KEYS.filter(
      (p) => !p.startsWith('roles') && !p.startsWith('airlines')
    ),
    users_count: 4,
  },
  {
    id: 3,
    name: 'Station Agent',
    slug: 'station_agent',
    scope: 'airport',
    permissions: ['dcs.access', 'dcs.checkin', 'flights.view', 'bookings.view'],
    users_count: 8,
  },
  {
    id: 4,
    name: 'Gate Agent',
    slug: 'gate_agent',
    scope: 'airport',
    permissions: ['gate.access', 'flights.view'],
    users_count: 5,
  },
  {
    id: 5,
    name: 'Agency User',
    slug: 'agency_user',
    scope: 'agency',
    permissions: ['agency.portal'],
    users_count: 12,
  },
]

export const users: User[] = Array.from({ length: 31 }, (_, index) => {
  const role = roles[index % roles.length]
  const first = pick(FIRST_NAMES)
  const last = pick(LAST_NAMES)
  const created = isoDaysFromNow(-int(10, 400), 3)
  return {
    id: index + 1,
    name: `${first[0]}${first.slice(1).toLowerCase()} ${last[0]}${last.slice(1).toLowerCase()}`,
    email: `${first.toLowerCase()}.${index + 1}@flightmode.mn`,
    phone: `+976 8${int(100, 999)} ${int(1000, 9999)}`,
    is_active: index % 9 !== 4,
    role: { id: role.id, name: role.name, slug: role.slug, scope: role.scope },
    airline:
      role.scope === 'airline' ? { id: 1, name: airlines[0].name } : null,
    agency:
      role.scope === 'agency'
        ? {
            id: agencies[index % agencies.length].id,
            name: agencies[index % agencies.length].name,
          }
        : null,
    airport: role.scope === 'airport' ? { id: 1, iata_code: 'UBN' } : null,
    last_login_at:
      index % 4 === 0 ? null : isoDaysFromNow(-int(0, 20), int(0, 23)),
    created_at: created,
  }
})

// ─── Fleet ───
export const aircraft: Aircraft[] = [
  ['JU-1088', 'Boeing 737-800', 'C12Y150', 162, 10, { C: 12, Y: 150 }],
  ['JU-1099', 'Boeing 737-800', 'C12Y150', 162, 10, { C: 12, Y: 150 }],
  ['JU-1021', 'Boeing 767-300ER', 'C24Y235', 259, 14, { C: 24, Y: 235 }],
  ['JU-1789', 'Boeing 787-9', 'C30W21Y240', 291, 18, { C: 30, W: 21, Y: 240 }],
  ['JU-8250', 'Embraer 190', 'C8Y90', 98, 6, { C: 8, Y: 90 }],
  ['JU-8251', 'Fokker 50', 'Y50', 50, 4, { Y: 50 }],
].map(([reg, type, conf, seats, infants, cabins], index) => ({
  id: index + 1,
  airline: {
    id: index < 4 ? 1 : 2,
    name: index < 4 ? airlines[0].name : airlines[1].name,
  },
  registration: reg as string,
  type: type as string,
  seat_configuration: conf as string,
  total_seats: seats as number,
  max_infants: infants as number,
  is_active: index !== 5,
  cabins: cabins as Partial<Record<CabinClass, number>>,
}))

// ─── Flights ───
const ROUTES: [string, string, string, number, number][] = [
  // flight number, origin, destination, dep hour (UTC), duration (min)
  ['OM301', 'UBN', 'ICN', 0, 210],
  ['OM302', 'ICN', 'UBN', 5, 220],
  ['OM223', 'UBN', 'PEK', 1, 150],
  ['OM224', 'PEK', 'UBN', 5, 150],
  ['OM501', 'UBN', 'NRT', 22, 330],
  ['OM701', 'UBN', 'BKK', 14, 420],
  ['MR101', 'UBN', 'ULG', 2, 180],
  ['MR102', 'ULG', 'UBN', 6, 170],
  ['MR201', 'UBN', 'MXV', 3, 90],
  ['MR301', 'UBN', 'DLZ', 4, 80],
]

function airportByIata(code: string) {
  return airports.find((a) => a.iata_code === code)!
}

function statusFor(dayOffset: number, index: number): FlightStatus {
  if (dayOffset < 0) return index % 17 === 0 ? 'cancelled' : 'departed'
  if (dayOffset === 0) {
    return (
      [
        'departed',
        'gate_closed',
        'checkin_closed',
        'checkin_open',
        'checkin_open',
        'scheduled',
      ] as const
    )[index % 6]
  }
  return index % 23 === 0 ? 'cancelled' : 'scheduled'
}

export const flights: Flight[] = []
for (let day = -5; day <= 9; day++) {
  ROUTES.forEach(([number, from, to, hour, duration], routeIndex) => {
    const id = flights.length + 1
    const plane =
      aircraft[number.startsWith('MR') ? 4 + (routeIndex % 2) : routeIndex % 4]
    const departure = isoDaysFromNow(day, hour, routeIndex * 5)
    const arrival = new Date(
      new Date(departure).getTime() + duration * 60_000
    ).toISOString()
    const status = statusFor(day, id)
    flights.push({
      id,
      flight_number: number,
      airline: number.startsWith('MR')
        ? { id: 2, name: airlines[1].name, iata_code: 'MR' }
        : { id: 1, name: airlines[0].name, iata_code: 'OM' },
      aircraft: {
        id: plane.id,
        registration: plane.registration,
        type: plane.type,
        total_seats: plane.total_seats,
      },
      flight_series_id: routeIndex + 1,
      origin: toFlightAirport(airportByIata(from)),
      destination: toFlightAirport(airportByIata(to)),
      scheduled_departure_at: departure,
      scheduled_arrival_at: arrival,
      estimated_departure_at:
        id % 11 === 0
          ? new Date(new Date(departure).getTime() + 45 * 60_000).toISOString()
          : null,
      terminal: from === 'UBN' ? 'T1' : null,
      gate: status === 'scheduled' ? null : `${pick(['A', 'B'])}${int(1, 12)}`,
      status,
      status_reason: status === 'cancelled' ? 'Operational reasons' : null,
      is_published: true,
      online_checkin: {
        enabled: !number.startsWith('MR'),
        opens_minutes: 1440,
        closes_minutes: 120,
      },
      segments_count: Math.min(
        plane.total_seats,
        int(Math.floor(plane.total_seats * 0.4), plane.total_seats)
      ),
    })
  })
}

export const flightSeries: FlightSeries[] = ROUTES.map(
  ([number, from, to, hour, duration], index) => {
    const depMinutes = hour * 60 + index * 5
    const arrMinutes = (depMinutes + duration) % 1440
    const hhmm = (m: number) =>
      `${pad(Math.floor(m / 60), 2)}:${pad(m % 60, 2)}`
    return {
      id: index + 1,
      flight_number: number,
      origin: from,
      destination: to,
      aircraft:
        aircraft[number.startsWith('MR') ? 4 + (index % 2) : index % 4]
          .registration,
      departure_time: hhmm(depMinutes),
      arrival_time: hhmm(arrMinutes),
      days_of_week: index % 2 === 0 ? [1, 3, 5, 7] : [1, 2, 3, 4, 5, 6, 7],
      valid_from: dateOnly(isoDaysFromNow(-30)),
      valid_to: dateOnly(isoDaysFromNow(150)),
      flights_count: flights.filter((f) => f.flight_series_id === index + 1)
        .length,
    }
  }
)

// ─── Allocations ───
function flightRef(f: Flight) {
  return {
    id: f.id,
    flight_number: f.flight_number,
    scheduled_departure_at: f.scheduled_departure_at,
    route: `${f.origin.iata_code}-${f.destination.iata_code}`,
  }
}

const futureFlights = flights.filter(
  (f) => new Date(f.scheduled_departure_at) > new Date()
)
export const allocations: Allocation[] = Array.from(
  { length: 24 },
  (_, index) => {
    const outbound = futureFlights[(index * 3) % futureFlights.length]
    const returnFlight =
      index % 2 === 0
        ? (futureFlights.find(
            (f) =>
              f.origin.iata_code === outbound.destination.iata_code &&
              f.id > outbound.id
          ) ?? null)
        : null
    const seats = pick([10, 15, 20, 30, 40])
    const used = int(0, seats)
    return {
      id: index + 1,
      agency: {
        id: agencies[index % agencies.length].id,
        name: agencies[index % agencies.length].name,
      },
      outbound_flight: flightRef(outbound),
      return_flight: returnFlight ? flightRef(returnFlight) : null,
      seats,
      deadline: dateOnly(
        new Date(
          new Date(outbound.scheduled_departure_at).getTime() - 3 * 86_400_000
        ).toISOString()
      ),
      uses_fare_quotas: index % 3 === 0,
      is_waitlist: index % 7 === 0,
      cabins: { Y: seats },
      usage: { used, available: seats - used },
      created_at: isoDaysFromNow(-int(5, 40)),
    }
  }
)

// ─── Fares ───
const FARE_CLASSES: Record<CabinClass, string[]> = {
  F: ['F'],
  C: ['J', 'C', 'D'],
  W: ['W'],
  Y: ['Y', 'B', 'M', 'H', 'K', 'L'],
}
export const fares: Fare[] = []
ROUTES.filter((_, i) => i % 2 === 0).forEach(([, from, to]) => {
  ;(['C', 'Y'] as CabinClass[]).forEach((cabin) => {
    FARE_CLASSES[cabin].slice(0, 3).forEach((fareClass, fi) => {
      ;(['OW', 'RT'] as const).forEach((trip) => {
        const base = (cabin === 'C' ? 1_800_000 : 650_000) - fi * 90_000
        const amount = trip === 'RT' ? Math.round(base * 1.8) : base
        const tax = trip === 'RT' ? 180_000 : 95_000
        fares.push({
          id: fares.length + 1,
          origin: from,
          destination: to,
          trip_type: trip,
          cabin_class: cabin,
          fare_class: fareClass,
          valid_from: dateOnly(isoDaysFromNow(-60)),
          valid_to: dateOnly(isoDaysFromNow(120)),
          base_amount: amount,
          tax_amount: tax,
          total_amount: amount + tax,
          child_discount_percent: 25,
          infant_discount_percent: 90,
          currency: 'MNT',
          is_active: fares.length % 13 !== 5,
        })
      })
    })
  })
})

export const baggageRules: BaggageRule[] = [
  {
    id: 1,
    name: 'Economy free allowance',
    type: 'free',
    ssr_code: null,
    cabin_class: 'Y',
    pieces: 1,
    weight_kg: 23,
    price: 0,
    currency: 'MNT',
    is_active: true,
  },
  {
    id: 2,
    name: 'Business free allowance',
    type: 'free',
    ssr_code: null,
    cabin_class: 'C',
    pieces: 2,
    weight_kg: 32,
    price: 0,
    currency: 'MNT',
    is_active: true,
  },
  {
    id: 3,
    name: 'Extra bag 23kg',
    type: 'prepaid',
    ssr_code: 'XBAG',
    cabin_class: null,
    pieces: 1,
    weight_kg: 23,
    price: 150_000,
    currency: 'MNT',
    is_active: true,
  },
  {
    id: 4,
    name: 'Sports equipment',
    type: 'prepaid',
    ssr_code: 'SPEQ',
    cabin_class: null,
    pieces: 1,
    weight_kg: 32,
    price: 200_000,
    currency: 'MNT',
    is_active: true,
  },
  {
    id: 5,
    name: 'Excess per kg (domestic)',
    type: 'excess',
    ssr_code: null,
    cabin_class: null,
    pieces: 0,
    weight_kg: 1,
    price: 6_000,
    currency: 'MNT',
    is_active: true,
  },
  {
    id: 6,
    name: 'Excess per kg (international)',
    type: 'excess',
    ssr_code: null,
    cabin_class: null,
    pieces: 0,
    weight_kg: 1,
    price: 18_000,
    currency: 'MNT',
    is_active: false,
  },
]

// ─── Bookings ───
let ticketSeq = 1
function makePassenger(
  id: number,
  type: PassengerType,
  flight: Flight,
  status: BookingStatus
): Passenger {
  const first = pick(FIRST_NAMES)
  const last = pick(LAST_NAMES)
  const cabin: CabinClass = rand() < 0.15 ? 'C' : 'Y'
  const fare = cabin === 'C' ? 1_650_000 : 580_000
  const discount = type === 'CHD' ? 0.75 : type === 'INF' ? 0.1 : 1
  const departed = new Date(flight.scheduled_departure_at) < new Date()
  const segment: Segment = {
    id: id * 10,
    flight_id: flight.id,
    flight_number: flight.flight_number,
    route: `${flight.origin.iata_code}-${flight.destination.iata_code}`,
    departure_at: flight.scheduled_departure_at,
    cabin_class: cabin,
    fare_class: pick(FARE_CLASSES[cabin]),
    ticket_number: `289${pad(ticketSeq++, 10)}`,
    fare_amount: Math.round(fare * discount),
    tax_amount: type === 'INF' ? 0 : 95_000,
    total_amount: Math.round(fare * discount) + (type === 'INF' ? 0 : 95_000),
    currency: 'MNT',
    seat_number:
      departed && type !== 'INF'
        ? `${int(1, 30)}${pick(['A', 'B', 'C', 'D', 'E', 'F'])}`
        : null,
    status:
      status === 'cancelled'
        ? 'cancelled'
        : status === 'waitlisted'
          ? 'waitlisted'
          : departed
            ? 'flown'
            : 'booked',
  }
  const age = type === 'ADT' ? int(18, 70) : type === 'CHD' ? int(2, 11) : 1
  return {
    id,
    type,
    first_name: first,
    last_name: last,
    gender: rand() < 0.5 ? 'M' : 'F',
    date_of_birth: dateOnly(isoDaysFromNow(-age * 365 - int(0, 300))),
    nationality: 'MN',
    document_number: `E${int(1_000_000, 9_999_999)}`,
    document_expires_at: dateOnly(isoDaysFromNow(int(200, 3000))),
    email: type === 'ADT' ? `${first.toLowerCase()}@mail.mn` : null,
    phone: type === 'ADT' ? `+976 9${int(100, 999)} ${int(1000, 9999)}` : null,
    segments: [segment],
  }
}

function makePnr() {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'
  return Array.from({ length: 6 }, () => pick(chars.split(''))).join('')
}

const SOURCES: BookingSource[] = [
  'agency',
  'agency',
  'agency_api',
  'admin',
  'counter',
  'import',
]
let passengerSeq = 1
export const bookings: Booking[] = Array.from({ length: 86 }, (_, index) => {
  const flight = flights[(index * 7) % flights.length]
  const status: BookingStatus =
    index % 19 === 3
      ? 'cancelled'
      : index % 23 === 5
        ? 'waitlisted'
        : 'confirmed'
  const source = pick(SOURCES)
  const agency = source.startsWith('agency')
    ? agencies[index % agencies.length]
    : null
  const paxTypes: PassengerType[] = [
    'ADT',
    ...(rand() < 0.4 ? (['ADT'] as const) : []),
    ...(rand() < 0.25 ? (['CHD'] as const) : []),
    ...(rand() < 0.1 ? (['INF'] as const) : []),
  ]
  const passengers = paxTypes.map((type) =>
    makePassenger(passengerSeq++, type, flight, status)
  )
  return {
    id: index + 1,
    pnr: makePnr(),
    agency: agency ? { id: agency.id, name: agency.name } : null,
    source,
    status,
    contact_email: passengers[0].email ?? 'contact@mail.mn',
    contact_phone: passengers[0].phone ?? '+976 9911 2233',
    passengers,
    total_amount: passengers.reduce(
      (sum, p) => sum + p.segments[0].total_amount,
      0
    ),
    currency: 'MNT',
    created_by:
      source === 'admin' || source === 'counter'
        ? { id: 1, name: users[0].name }
        : null,
    created_at: isoDaysFromNow(-int(1, 30), int(0, 23), int(0, 59)),
  }
})

// ─── Charter requests ───
export const charterRequests: CharterRequest[] = Array.from(
  { length: 14 },
  (_, index) => {
    const [from, to] = pick([
      ['UBN', 'ICN'],
      ['UBN', 'BKK'],
      ['UBN', 'NRT'],
      ['UBN', 'PEK'],
      ['UBN', 'ULG'],
    ])
    const departure = isoDaysFromNow(int(10, 90))
    const agencyUser = users.filter((u) => u.agency)[index % 5]
    return {
      id: index + 1,
      requested_by: {
        id: agencyUser.id,
        name: agencyUser.name,
        email: agencyUser.email,
      },
      origin: from,
      destination: to,
      departure_date: dateOnly(departure),
      return_date:
        index % 3 === 0
          ? null
          : dateOnly(
              new Date(
                new Date(departure).getTime() + int(4, 14) * 86_400_000
              ).toISOString()
            ),
      pax_count: int(40, 180),
      status: (['requested', 'pending', 'approved', 'rejected'] as const)[
        index % 4
      ],
      notes: index % 2 === 0 ? 'Group tour, needs special meals' : null,
      airlines: airlines
        .slice(0, (index % 2) + 1)
        .map((a) => ({ id: a.id, name: a.name })),
      created_at: isoDaysFromNow(-int(1, 20)),
    }
  }
)

// ─── System ───
const EVENTS: [ActivityLog['channel'], string, string][] = [
  ['admin', 'flight.status_changed', 'Flight status changed'],
  ['admin', 'booking.created', 'Booking created'],
  ['agency', 'booking.created', 'Agency booking created'],
  ['agency', 'booking.cancelled', 'Booking cancelled'],
  ['dcs', 'segment.checked_in', 'Passenger checked in'],
  ['dcs', 'baggage.added', 'Baggage accepted'],
  ['gate', 'segment.boarded', 'Passenger boarded'],
  ['online', 'segment.checked_in', 'Online check-in completed'],
  ['partner', 'booking.created', 'Partner API booking'],
]
export const activityLogs: ActivityLog[] = Array.from(
  { length: 120 },
  (_, index) => {
    const [channel, event, description] = pick(EVENTS)
    return {
      id: 120 - index,
      channel,
      event,
      description,
      user:
        channel === 'online'
          ? null
          : {
              id: users[index % users.length].id,
              name: users[index % users.length].name,
            },
      subject_type: event.split('.')[0],
      subject_id: int(1, 500),
      ip_address: `10.0.${int(0, 20)}.${int(2, 254)}`,
      created_at: isoDaysFromNow(0, 0, -index * 37),
    }
  }
)

export const announcements: Announcement[] = [
  {
    id: 1,
    title: 'Winter schedule published',
    body: 'The winter schedule for all routes is now available for sale.',
    audience: 'all',
    is_active: true,
    published_at: isoDaysFromNow(-3),
  },
  {
    id: 2,
    title: 'Names deadline reminder',
    body: 'Agency allocations close names 3 days before departure.',
    audience: 'agency',
    is_active: true,
    published_at: isoDaysFromNow(-10),
  },
  {
    id: 3,
    title: 'New DCS counter layout',
    body: 'UBN counters 12–18 will use the new bag tag printers.',
    audience: 'airport',
    is_active: false,
    published_at: isoDaysFromNow(-25),
  },
]

// ─── Seat maps (legacy seatmap blocks) ───
const BLOCKS: Record<
  string,
  [number, number, CabinClass, string, string, string, string, number[]][]
> = {
  'JU-1088': [
    [1, 3, 'C', 'AC', '', 'DF', 'A', []],
    [4, 14, 'Y', 'ABC', '', 'DEF', 'B', [14]],
    [15, 28, 'Y', 'ABC', '', 'DEF', 'C', [15]],
  ],
  'JU-1099': [
    [1, 3, 'C', 'AC', '', 'DF', 'A', []],
    [4, 14, 'Y', 'ABC', '', 'DEF', 'B', [14]],
    [15, 28, 'Y', 'ABC', '', 'DEF', 'C', [15]],
  ],
  'JU-1021': [
    [1, 6, 'C', 'AC', '', 'DF', 'A', []],
    [7, 25, 'Y', 'ABC', 'DEF', 'HJK', 'B', [7]],
    [26, 45, 'Y', 'ABC', 'DEF', 'HJK', 'C', [26]],
  ],
  'JU-1789': [
    [1, 5, 'C', 'A', 'DG', 'K', 'A', []],
    [10, 12, 'W', 'AC', 'DEF', 'HK', 'B', []],
    [20, 46, 'Y', 'ABC', 'DEF', 'HJK', 'C', [20, 33]],
  ],
  'JU-8250': [
    [1, 2, 'C', 'AC', '', 'DF', 'A', []],
    [3, 12, 'Y', 'AC', '', 'DF', 'B', [11]],
    [13, 25, 'Y', 'AC', '', 'DF', 'C', []],
  ],
  'JU-8251': [[1, 13, 'Y', 'AB', '', 'CD', 'A', [1]]],
}

export const seatBlocks: SeatBlock[] = []
aircraft.forEach((a) => {
  ;(BLOCKS[a.registration] ?? []).forEach(
    ([from, to, cabin, left, middle, right, zone, exits]) => {
      seatBlocks.push({
        id: seatBlocks.length + 1,
        aircraft_id: a.id,
        row_from: from,
        row_to: to,
        cabin_class: cabin,
        left,
        middle,
        right,
        zone,
        exit_rows: exits,
      })
    }
  )
})

/** Flight → blocked seats (Seat Block page) */
export const flightSeatBlocks = new Map<number, Set<string>>()

// ─── Check-in hierarchy ───
export const loadZones: LoadZone[] = []
aircraft.forEach((a) => {
  const zones = [
    ...new Set(
      seatBlocks.filter((b) => b.aircraft_id === a.id).map((b) => b.zone)
    ),
  ]
  let from = 1
  zones.forEach((zone, i) => {
    const size = Math.round(a.total_seats / zones.length)
    loadZones.push({
      id: loadZones.length + 1,
      aircraft_id: a.id,
      zone,
      pax_from: from,
      pax_to: i === zones.length - 1 ? a.total_seats : from + size - 1,
    })
    from += size
  })
})

export const seatAssignmentProfiles: SeatAssignmentProfile[] = aircraft.flatMap(
  (a, i) => [
    {
      id: i * 2 + 1,
      aircraft_id: a.id,
      aircraft: a.registration,
      name: 'Default (front to back)',
      zones: ['A', 'B', 'C'],
      is_default: true,
    },
    {
      id: i * 2 + 2,
      aircraft_id: a.id,
      aircraft: a.registration,
      name: 'Balance (middle first)',
      zones: ['B', 'C', 'A'],
      is_default: false,
    },
  ]
)

// ─── Products ───
export const seatPrices: SeatPrice[] = [
  {
    id: 1,
    name: 'Exit row extra legroom',
    aircraft: null,
    cabin_class: 'Y',
    seat_type: null,
    rows: '14-15',
    zone: null,
    position: 1,
    price: 45_000,
    currency: 'MNT',
    is_active: true,
  },
  {
    id: 2,
    name: 'Front rows',
    aircraft: null,
    cabin_class: 'Y',
    seat_type: null,
    rows: '4-6',
    zone: 'B',
    position: 2,
    price: 30_000,
    currency: 'MNT',
    is_active: true,
  },
  {
    id: 3,
    name: 'Window seat',
    aircraft: null,
    cabin_class: 'Y',
    seat_type: 'window',
    rows: '',
    zone: null,
    position: 3,
    price: 15_000,
    currency: 'MNT',
    is_active: true,
  },
  {
    id: 4,
    name: 'Aisle seat',
    aircraft: null,
    cabin_class: 'Y',
    seat_type: 'aisle',
    rows: '',
    zone: null,
    position: 4,
    price: 10_000,
    currency: 'MNT',
    is_active: false,
  },
  {
    id: 5,
    name: 'Business front',
    aircraft: 'JU-1789',
    cabin_class: 'C',
    seat_type: null,
    rows: '1-2',
    zone: 'A',
    position: 5,
    price: 80_000,
    currency: 'MNT',
    is_active: true,
  },
]

export const airlineSsrs: AirlineSsr[] = [
  ['WCHR', 'Wheelchair - ramp', 'Medical', null],
  ['WCHS', 'Wheelchair - steps', 'Medical', null],
  ['MEDA', 'Medical case', 'Medical', null],
  ['VGML', 'Vegetarian vegan meal', 'Meal', 12_000],
  ['CHML', 'Child meal', 'Meal', 12_000],
  ['MOML', 'Muslim meal', 'Meal', 12_000],
  ['UMNR', 'Unaccompanied minor', 'Passenger', 80_000],
  ['PETC', 'Pet in cabin', 'Baggage', 120_000],
  ['AVIH', 'Animal in hold', 'Baggage', 180_000],
  ['BIKE', 'Bicycle', 'Baggage', 90_000],
  ['XBAG', 'Extra baggage', 'Baggage', 150_000],
  ['DEAF', 'Deaf passenger', 'Passenger', null],
].map(([code, name, category, price], i) => ({
  id: i + 1,
  code: code as string,
  name: name as string,
  category: category as string,
  price: price as number | null,
  currency: 'MNT',
}))

export const serviceTemplates: ServiceTemplate[] = [
  {
    id: 1,
    name: 'International standard',
    airline: airlines[0].name,
    baggage_rule_ids: [1, 2, 3, 6],
    seat_price_ids: [1, 2, 3],
    oci_opens_minutes: 1440,
    oci_closes_minutes: 120,
    seat_assignment_profile: 'Default (front to back)',
  },
  {
    id: 2,
    name: 'Domestic',
    airline: airlines[1].name,
    baggage_rule_ids: [1, 5],
    seat_price_ids: [3],
    oci_opens_minutes: 720,
    oci_closes_minutes: 60,
    seat_assignment_profile: 'Default (front to back)',
  },
  {
    id: 3,
    name: 'Charter / group',
    airline: airlines[0].name,
    baggage_rule_ids: [1, 2],
    seat_price_ids: [],
    oci_opens_minutes: 0,
    oci_closes_minutes: 0,
    seat_assignment_profile: 'Balance (middle first)',
  },
]

export const BAG_TAG_FIELDS = [
  'airline_logo',
  'destination_code',
  'destination_city',
  'flight_number',
  'date',
  'passenger_name',
  'pnr',
  'tag_number',
  'barcode',
  'piece',
  'weight_kg',
  'origin',
] as const

export const bagTagLayouts: BagTagLayout[] = [
  {
    id: 1,
    airline: airlines[0].name,
    name: 'MIAT 2-part tag',
    positions: [
      'airline_logo',
      'destination_code',
      'flight_number',
      'date',
      'barcode',
      'tag_number',
      'passenger_name',
      'piece',
    ],
    created_at: isoDaysFromNow(-60),
  },
  {
    id: 2,
    airline: airlines[1].name,
    name: 'Hunnu short tag',
    positions: [
      'destination_code',
      'destination_city',
      'flight_number',
      'barcode',
      'tag_number',
      'passenger_name',
      'weight_kg',
    ],
    created_at: isoDaysFromNow(-20),
  },
]

export const baggageOverrides: BaggageOverride[] = bookings
  .flatMap((b) => b.passengers.map((p) => ({ b, p })))
  .filter((_, i) => i % 9 === 0)
  .slice(0, 24)
  .map(({ b, p }, i) => ({
    id: i + 1,
    pnr: b.pnr,
    passenger: `${p.last_name}/${p.first_name}`,
    flight_number: p.segments[0].flight_number,
    departure_at: p.segments[0].departure_at,
    agency: b.agency?.name ?? null,
    pieces: 1 + (i % 2),
    weight_kg: 23 * (1 + (i % 2)),
  }))

// ─── Notifications / terms / carriage ───
export const requiredNotifications: RequiredNotification[] = [
  {
    id: 1,
    title: 'Names deadline: 3 days before departure',
    body: 'Allocations close names 72 hours before departure. Late names are not accepted.',
    airline: airlines[0].name,
    agency: null,
    is_required: true,
    created_by: 'System Admin',
    created_at: isoDaysFromNow(-4),
  },
  {
    id: 2,
    title: 'Winter schedule changes',
    body: 'OM301 / OM302 move to 08:00 from 1 November.',
    airline: airlines[0].name,
    agency: null,
    is_required: false,
    created_by: 'System Admin',
    created_at: isoDaysFromNow(-9),
  },
  {
    id: 3,
    title: 'Passport validity reminder',
    body: 'International passengers need 6 months passport validity.',
    airline: airlines[1].name,
    agency: agencies[2].name,
    is_required: true,
    created_by: users[1].name,
    created_at: isoDaysFromNow(-15),
  },
]

export const policyDocuments: PolicyDocument[] = [
  {
    id: 1,
    title: 'Гар тээш',
    body: 'Нэг зорчигч 7 кг хүртэлх нэг ширхэг гар тээш авч явна. Хэмжээ 55×40×20 см.',
    type: 'cabin',
    locale: 'mn',
    is_active: true,
    created_at: isoDaysFromNow(-120),
  },
  {
    id: 2,
    title: 'Cabin baggage',
    body: 'One piece up to 7 kg, 55×40×20 cm, plus one personal item.',
    type: 'cabin',
    locale: 'en',
    is_active: true,
    created_at: isoDaysFromNow(-120),
  },
  {
    id: 3,
    title: 'Бүртгэлийн ачаа',
    body: 'Эдийн засгийн ангилал 1×23 кг, бизнес ангилал 2×32 кг.',
    type: 'checked',
    locale: 'mn',
    is_active: true,
    created_at: isoDaysFromNow(-90),
  },
  {
    id: 4,
    title: 'Checked baggage',
    body: 'Economy 1×23 kg, Business 2×32 kg. Excess is charged per kg at the airport.',
    type: 'checked',
    locale: 'en',
    is_active: false,
    created_at: isoDaysFromNow(-90),
  },
]

export const carriageDocuments: CarriageDocument[] = airlines.map((a) => ({
  airline_id: a.id,
  airline: a.name,
  body: `# Conditions of Carriage — ${a.name}\n\n1. Definitions\n2. Tickets\n3. Fares, taxes and charges\n4. Reservations\n5. Check-in and boarding\n6. Baggage\n7. Refusal and limitation of carriage\n8. Schedules, delays and cancellations\n`,
  updated_at: isoDaysFromNow(-30),
}))

// ─── Flight operations (flight manager / station report) ───
export const flightOps = new Map<
  number,
  {
    off_block_at: string | null
    takeoff_at: string | null
    estimated_arrival_at: string | null
    delay_reason: string | null
    gate_agents: { id: number; name: string }[]
  }
>()
flights.forEach((f) => {
  const departed = f.status === 'departed'
  const delay = departed && f.id % 4 === 0 ? 25 + (f.id % 3) * 10 : 0
  const obt = departed
    ? new Date(new Date(f.scheduled_departure_at).getTime() + delay * 60_000)
    : null
  flightOps.set(f.id, {
    off_block_at: obt?.toISOString() ?? null,
    takeoff_at: obt
      ? new Date(obt.getTime() + 12 * 60_000).toISOString()
      : null,
    estimated_arrival_at: obt
      ? new Date(
          new Date(f.scheduled_arrival_at).getTime() + delay * 60_000
        ).toISOString()
      : null,
    delay_reason: delay
      ? pick([
          '93 Aircraft rotation',
          '81 ATC restriction',
          '15 Boarding',
          '71 Weather',
        ])
      : null,
    gate_agents:
      f.status === 'scheduled'
        ? []
        : [{ id: users[3].id, name: users[3].name }],
  })
})

// ─── Passengers per flight (flight load, manifest, PAX search) ───
const paxByFlight = new Map<number, FlightPassengerRow[]>()

/** Seeded per flight so the lists are stable between calls. */
export function flightPassengers(flightId: number): FlightPassengerRow[] {
  const cached = paxByFlight.get(flightId)
  if (cached) return cached
  const flight = flights.find((f) => f.id === flightId)
  if (!flight) return []
  let local = flightId * 7919
  const r = () =>
    (local = (local * 1103515245 + 12345) % 2147483648) / 2147483648
  const choose = <T>(items: readonly T[]) =>
    items[Math.floor(r() * items.length)]
  const blocks = seatBlocks.filter((b) => b.aircraft_id === flight.aircraft?.id)
  const seats = blocks.flatMap((b) =>
    Array.from(
      { length: b.row_to - b.row_from + 1 },
      (_, i) => b.row_from + i
    ).flatMap((row) =>
      `${b.left}${b.middle}${b.right}`
        .split('')
        .map((l) => ({
          seat: `${row}${l}`,
          cabin: b.cabin_class,
          zone: b.zone,
        }))
    )
  )
  const progress =
    flight.status === 'departed' || flight.status === 'gate_closed'
      ? 0.97
      : flight.status.startsWith('checkin')
        ? 0.6
        : 0
  const rows: FlightPassengerRow[] = Array.from(
    { length: flight.segments_count },
    (_, i) => {
      const checked = r() < progress
      const seat = checked ? seats[i % Math.max(seats.length, 1)] : undefined
      const age =
        r() < 0.12 ? 2 + Math.floor(r() * 9) : 19 + Math.floor(r() * 50)
      const dob = new Date(Date.now() - age * 365.25 * 86_400_000)
        .toISOString()
        .slice(0, 10)
      const bags = checked && r() < 0.7 ? 1 + (r() < 0.15 ? 1 : 0) : 0
      return {
        id: flightId * 1000 + i,
        pnr: Array.from({ length: 6 }, () =>
          choose('ABCDEFGHJKLMNPQRSTUVWXYZ23456789'.split(''))
        ).join(''),
        last_name: choose(LAST_NAMES),
        first_name: choose(FIRST_NAMES),
        type: age < 12 ? 'CHD' : 'ADT',
        gender: r() < 0.5 ? 'M' : 'F',
        date_of_birth: dob,
        nationality: r() < 0.9 ? 'MN' : choose(['KR', 'CN', 'JP']),
        document_number: `E${1_000_000 + Math.floor(r() * 8_999_999)}`,
        seat_number: seat?.seat ?? null,
        cabin_class: seat?.cabin ?? (r() < 0.07 ? 'C' : 'Y'),
        status:
          flight.status === 'departed'
            ? checked
              ? 'flown'
              : 'booked'
            : checked
              ? flight.status === 'gate_closed'
                ? 'boarded'
                : 'checked_in'
              : 'booked',
        ssr_codes: r() < 0.08 ? [choose(['WCHR', 'VGML', 'CHML', 'MEDA'])] : [],
        agency: r() < 0.6 ? choose(agencies).name : null,
        phone:
          r() < 0.7
            ? `+976 9${100 + Math.floor(r() * 899)} ${1000 + Math.floor(r() * 8999)}`
            : null,
        flight_id: flight.id,
        flight_number: flight.flight_number,
        route: `${flight.origin.iata_code}-${flight.destination.iata_code}`,
        departure_at: flight.scheduled_departure_at,
        bags,
        bag_weight_kg: bags * (12 + Math.floor(r() * 11)),
        zone: seat?.zone ?? null,
      }
    }
  )
  paxByFlight.set(flightId, rows)
  return rows
}
